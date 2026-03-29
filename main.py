from fastapi import FastAPI, Form, Request
from fastapi.templating import Jinja2Templates

app = FastAPI(title="FadeFlow")
templates = Jinja2Templates(directory="templates")


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "title": "FadeFlow"},
    )


@app.post("/echo")
async def echo(name: str = Form(...)):
    return {"hello": name}
