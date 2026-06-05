import traceback
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.api.v1.api import api_router
from app.core.database import engine, Base

settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="小说转剧本 AI 生成平台"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """捕获 422 验证错误，打印详细日志方便调试"""
    print("\n========== 422 Validation Error ==========")
    print(f"URL: {request.method} {request.url}")
    try:
        body = await request.body()
        print(f"Body: {body.decode('utf-8')}")
    except Exception:
        print("Body: <unable to read>")
    print(f"Errors: {exc.errors()}")
    print("==========================================\n")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(await request.body())},
    )


@app.get("/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION}
