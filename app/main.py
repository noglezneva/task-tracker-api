import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api import auth, tasks
from app.api.deps import DBSessionDep

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
    async def healthcheck(db: DBSessionDep) -> dict[str, str]:
        try:
            await db.execute(text("SELECT 1"))
        except SQLAlchemyError as exc:
            logger.exception("Database health check failed")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database unavailable",
            ) from exc

        return {
            "status": "ok",
            "database": "connected",
        }

    return app


app = create_app()
