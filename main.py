from fastapi import FastAPI, Form, Request
from fastapi.templating import Jinja2Templates
from starlette.responses import Response

app = FastAPI(title="FadeFlow")
templates = Jinja2Templates(directory="templates")


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "title": "FadeFlow"},
    )


@app.head("/")
async def home_head():
    """HEAD for probes (e.g. Render); avoid api_route(GET+HEAD) — can trigger routing bugs on some stacks."""
    return Response(status_code=200)


@app.post("/echo")
async def echo(name: str = Form(...)):
    return {"hello": name}
