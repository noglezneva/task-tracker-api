from fastapi import FastAPI
import logging

from app.api import auth, tasks


logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(title="Task Tracker API")

    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])

    @app.on_event("startup")
    async def on_startup() -> None:
        logger.info("Starting Task Tracker API")

    @app.on_event("shutdown")
    async def on_shutdown() -> None:
        logger.info("Shutting down Task Tracker API")

    return app


app = create_app()


