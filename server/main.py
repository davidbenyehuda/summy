from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import ROOT, config
from .db import init_db
from .routes import auth, chat, entities, integrations
from .seed import log_dev_credentials, seed_dev_user

uploads_dir = (ROOT / config["uploads"]["dir"]).resolve()
uploads_dir.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    seed_dev_user()
    host = config["server"]["host"]
    port = config["server"]["port"]
    print(f"Sammy API running at http://{host}:{port}")
    print(f"Swagger docs at http://{host}:{port}/docs")
    print(f"Config loaded from {ROOT / 'config.json'}")
    print(f"Dev OTP code: {config['auth']['devOtp']}")
    log_dev_credentials()
    yield


app = FastAPI(
    title=config["app"]["title"],
    description=config["app"]["name"],
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(entities.router, prefix="/api")
app.include_router(integrations.router, prefix="/api")


@app.get("/api/health", tags=["health"])
def health():
    return {"ok": True, "app": config["app"]["name"]}


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, list):
        message = detail[0].get("msg", "Request failed") if detail else "Request failed"
    else:
        message = detail
    return JSONResponse(status_code=exc.status_code, content={"message": message})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, _exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"message": "Invalid request"})
