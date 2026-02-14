from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import folders, git_analysis, health, jira_tickets

app = FastAPI(
    title="Git-to-Jira Ticket App",
    description="Scan git repos, analyze work, generate and push Jira tickets",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5173",  # Keep for backwards compatibility
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(folders.router)
app.include_router(git_analysis.router)
app.include_router(jira_tickets.router)
