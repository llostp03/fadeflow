import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

import stripe
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from starlette.responses import FileResponse, RedirectResponse, Response


APP_TITLE = "ClipFlow"

DB_PATH = Path(__file__).resolve().parent / "bookings.db"
SIGNUP_HTML_PATH = Path(__file__).resolve().parent / "stripe-backend" / "public" / "index.html"


def init_db() -> None:
    """Create the bookings table once (SQLite file lives next to main.py)."""
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                service TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                payment_status TEXT NOT NULL,
                payment_intent_id TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title=APP_TITLE, lifespan=lifespan)
templates = Jinja2Templates(directory="templates")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreatePaymentIntentBody(BaseModel):
    name: str = Field(..., min_length=1)
    service: str = ""
    date: str = ""
    time: str = ""


class BookingCreateBody(BaseModel):
    name: str = Field(..., min_length=1)
    service: str = ""
    date: str = ""
    time: str = ""
    payment_intent_id: str = Field(..., min_length=1)


def _confirmation_payload(
    booking_id: int,
    name: str,
    service: str,
    date: str,
    time: str,
    payment_status: str,
) -> dict:
    return {
        "confirmation": {
            "booking_id": booking_id,
            "name": name,
            "service": service,
            "date": date,
            "time": time,
            "payment_status": payment_status,
            "message": "Your ClipFlow booking is confirmed. We'll see you soon.",
        }
    }


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "title": APP_TITLE},
    )


@app.head("/")
async def home_head():
    """HEAD for probes (e.g. Render); avoid api_route(GET+HEAD) — can trigger routing bugs on some stacks."""
    return Response(status_code=200)


@app.get("/book")
@app.get("/booking")
@app.get("/bookappointment")
@app.get("/login")
@app.get("/barber-login")
@app.get("/barber-login/")
async def marketing_aliases():
    """
    These paths are linked from the landing page or shared URLs. Without explicit routes,
    FastAPI returns 404 JSON — which looks broken in the browser. Send users to the
    in-page booking section on the home page.
    """
    return RedirectResponse(url="/#book", status_code=302)


@app.get("/signup")
@app.get("/signup/")
async def signup_page():
    """Same static page as Node: stripe-backend/public/index.html."""
    if SIGNUP_HTML_PATH.is_file():
        return FileResponse(SIGNUP_HTML_PATH)
    return RedirectResponse(url="/#book", status_code=302)


@app.post("/create-payment-intent")
async def create_payment_intent(body: CreatePaymentIntentBody):
    """
    Creates a Stripe PaymentIntent and returns clientSecret for the mobile app.
    Set STRIPE_SECRET_KEY on the server (e.g. Render environment variables).
    """
    secret = os.environ.get("STRIPE_SECRET_KEY")
    if not secret or not secret.strip():
        raise HTTPException(
            status_code=503,
            detail="Payments are not configured on the server yet.",
        )

    stripe.api_key = secret.strip()
    try:
        intent = stripe.PaymentIntent.create(
            amount=2500,
            currency="usd",
            payment_method_types=["card"],
            metadata={
                "customer_name": body.name.strip(),
                "service": body.service,
                "date": body.date,
                "time": body.time,
            },
        )
    except stripe.StripeError as e:
        raise HTTPException(
            status_code=400,
            detail=getattr(e, "user_message", None) or str(e),
        ) from e

    if not intent.client_secret:
        raise HTTPException(
            status_code=500,
            detail="Stripe did not return a client secret.",
        )

    return {"clientSecret": intent.client_secret}


@app.post("/bookings")
async def create_booking(body: BookingCreateBody):
    """
    After the app completes Payment Sheet, call this with the PaymentIntent id.
    Verifies the payment with Stripe, then stores the booking and returns confirmation.
    """
    secret = os.environ.get("STRIPE_SECRET_KEY")
    if not secret or not secret.strip():
        raise HTTPException(
            status_code=503,
            detail="Payments are not configured on the server yet.",
        )

    stripe.api_key = secret.strip()
    pid = body.payment_intent_id.strip()

    try:
        intent = stripe.PaymentIntent.retrieve(pid)
    except stripe.StripeError as e:
        raise HTTPException(
            status_code=400,
            detail=getattr(e, "user_message", None) or str(e),
        ) from e

    if intent.status != "succeeded":
        raise HTTPException(
            status_code=400,
            detail=f"Payment is not complete (status: {intent.status}).",
        )

    payment_status = intent.status

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(
            """
            SELECT id, name, service, date, time, payment_status
            FROM bookings WHERE payment_intent_id = ?
            """,
            (pid,),
        )
        existing = cur.fetchone()
        if existing:
            return _confirmation_payload(
                existing["id"],
                existing["name"],
                existing["service"],
                existing["date"],
                existing["time"],
                existing["payment_status"],
            )

        ins = conn.execute(
            """
            INSERT INTO bookings
                (name, service, date, time, payment_status, payment_intent_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                body.name.strip(),
                body.service,
                body.date,
                body.time,
                payment_status,
                pid,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
        booking_id = ins.lastrowid
    finally:
        conn.close()

    return _confirmation_payload(
        booking_id,
        body.name.strip(),
        body.service,
        body.date,
        body.time,
        payment_status,
    )
