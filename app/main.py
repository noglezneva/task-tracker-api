from contextlib import asynccontextmanager
import logging
from collections.abc import AsyncGenerator

from fastapi import FastAPI

from app.api import auth, tasks


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting Task Tracker API")
    yield
    logger.info("Shutting down Task Tracker API")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Task Tracker API",
        lifespan=lifespan,
    )

    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])

    @app.get("/health")
    async def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()