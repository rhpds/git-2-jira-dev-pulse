from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routes import folders, git_analysis, health, jira_tickets, history, templates, export, config, themes, github, linear
from .exceptions import Git2JiraException
from .logging_config import setup_logging, get_logger
from .database import init_db, get_db
from .seed_templates import seed_default_templates
from .middleware.logging_middleware import LoggingMiddleware
from .services.watcher_service import get_watcher_service
from .services.config_service import get_config_service

# Set up logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting Git-2-Jira-Dev-Pulse API server")

    # Initialize database
    logger.info("Initializing database...")
    init_db()

    # Seed default templates
    logger.info("Seeding default templates...")
    db_gen = get_db()
    db = next(db_gen)
    try:
        seed_default_templates(db)
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

    # Start auto-discovery watcher if enabled
    config_service = get_config_service()
    config = config_service.get_config()

    if config.auto_discovery.enabled:
        logger.info("Auto-discovery is enabled, starting watcher service...")
        watcher = get_watcher_service()
        await watcher.start()
    else:
        logger.info("Auto-discovery is disabled")

    logger.info("Application initialized successfully")
    yield

    # Shutdown
    logger.info("Shutting down Git-2-Jira-Dev-Pulse API server")

    # Stop watcher if running
    watcher = get_watcher_service()
    if watcher.running:
        logger.info("Stopping watcher service...")
        await watcher.stop()


app = FastAPI(
    lifespan=lifespan,
    title="Git-to-Jira Ticket App",
    description="Scan git repos, analyze work, generate and push Jira tickets",
    version="0.1.0",
)

# Add middleware (order matters - CORS should be first, logging last)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:6100",
        "http://127.0.0.1:6100",
        "http://localhost:6000",  # Keep for backwards compatibility
        "http://127.0.0.1:6000",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)

app.include_router(health.router)
app.include_router(folders.router)
app.include_router(git_analysis.router)
app.include_router(jira_tickets.router)
app.include_router(history.router)
app.include_router(templates.router)
app.include_router(export.router)
app.include_router(config.router)
app.include_router(themes.router)
app.include_router(github.router)
app.include_router(linear.router)


# Exception handlers
@app.exception_handler(Git2JiraException)
async def git2jira_exception_handler(request: Request, exc: Git2JiraException):
    """Handle custom Git2Jira exceptions."""
    logger.error(
        f"{exc.__class__.__name__}: {exc.message}",
        extra={"details": exc.details, "path": request.url.path},
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict(),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.exception(
        f"Unhandled exception: {str(exc)}",
        extra={"path": request.url.path},
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred",
            "details": {"error_type": exc.__class__.__name__},
        },
    )


