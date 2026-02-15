"""Cross-Repo Impact Intelligence API routes.

Maps dependency/impact relationships across repos by detecting shared
packages, import chains, and config references. When you commit to a
shared library, highlights downstream repos that may be affected.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User
from ..middleware.auth_middleware import get_current_user
from ..services.folder_scanner import FolderScanner
from ..services.git_analyzer import GitAnalyzer

router = APIRouter(prefix="/api/impact-graph", tags=["impact-graph"])


class RepoDependency(BaseModel):
    name: str
    version: str | None = None
    dep_type: str  # "npm", "pip", "go", "shared"


class RepoNode(BaseModel):
    name: str
    path: str
    language: str  # detected primary language
    dependencies: list[RepoDependency]
    dependents: list[str]  # repo names that depend on this one
    recent_changes: int
    jira_refs: list[str]


class ImpactEdge(BaseModel):
    source: str  # repo name
    target: str  # repo name
    shared_deps: list[str]
    impact_type: str  # "direct", "transitive", "jira-linked"
    weight: int  # number of shared deps


class RecentImpact(BaseModel):
    repo: str
    change_summary: str
    affected_repos: list[str]
    jira_refs: list[str]
    timestamp: str


class ImpactGraphResponse(BaseModel):
    generated_at: str
    total_repos: int
    total_edges: int
    nodes: list[RepoNode]
    edges: list[ImpactEdge]
    recent_impacts: list[RecentImpact]
    shared_dependency_clusters: list[dict]
    risk_hotspots: list[dict]


@router.get("/", response_model=ImpactGraphResponse)
async def get_impact_graph(
    days: int = Query(30, description="Look back period for recent impacts"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Build cross-repo dependency and impact graph."""
    scanner = FolderScanner()
    repos = scanner.scan()
    analyzer = GitAnalyzer()

    nodes: list[RepoNode] = []
    repo_deps: dict[str, set[str]] = {}  # repo_name -> set of dep names
    repo_languages: dict[str, str] = {}
    repo_jira: dict[str, set[str]] = defaultdict(set)
    repo_changes: dict[str, int] = {}

    for repo in repos:
        repo_path = Path(repo.path)
        deps: list[RepoDependency] = []
        dep_names: set[str] = set()
        language = "unknown"

        # Detect npm dependencies
        pkg_json = repo_path / "package.json"
        if pkg_json.exists():
            language = "javascript"
            try:
                pkg = json.loads(pkg_json.read_text())
                for dep_section in ["dependencies", "devDependencies"]:
                    for name, ver in pkg.get(dep_section, {}).items():
                        deps.append(RepoDependency(name=name, version=ver, dep_type="npm"))
                        dep_names.add(name)
            except Exception:
                pass

        # Detect Python dependencies
        req_txt = repo_path / "requirements.txt"
        if req_txt.exists():
            language = "python"
            try:
                for line in req_txt.read_text().splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and not line.startswith("-"):
                        name = line.split(">=")[0].split("==")[0].split("<=")[0].split("<")[0].split(">")[0].split("[")[0].strip()
                        if name:
                            deps.append(RepoDependency(name=name, dep_type="pip"))
                            dep_names.add(name)
            except Exception:
                pass

        # Detect Go dependencies
        go_mod = repo_path / "go.mod"
        if go_mod.exists():
            language = "go"
            try:
                for line in go_mod.read_text().splitlines():
                    line = line.strip()
                    if line and not line.startswith("module") and not line.startswith("go ") and not line.startswith("//") and not line in (")", "require ("):
                        parts = line.split()
                        if parts:
                            name = parts[0]
                            ver = parts[1] if len(parts) > 1 else None
                            deps.append(RepoDependency(name=name, version=ver, dep_type="go"))
                            dep_names.add(name)
            except Exception:
                pass

        # Detect pyproject.toml
        pyproject = repo_path / "pyproject.toml"
        if pyproject.exists() and language == "unknown":
            language = "python"

        # Detect Makefile
        if (repo_path / "Makefile").exists() and language == "unknown":
            language = "mixed"

        # Get recent changes and jira refs
        changes = 0
        try:
            summary = analyzer.get_work_summary_cached(repo.path, max_commits=50, since_days=days)
            changes = len(summary.recent_commits)
            for c in summary.recent_commits:
                repo_jira[repo.name].update(c.jira_refs)
        except Exception:
            pass

        repo_deps[repo.name] = dep_names
        repo_languages[repo.name] = language
        repo_changes[repo.name] = changes

        nodes.append(RepoNode(
            name=repo.name,
            path=repo.path,
            language=language,
            dependencies=deps,
            dependents=[],
            recent_changes=changes,
            jira_refs=sorted(repo_jira[repo.name]),
        ))

    # Build edges from shared dependencies
    edges: list[ImpactEdge] = []
    repo_names = [n.name for n in nodes]

    for i, name_a in enumerate(repo_names):
        for name_b in repo_names[i + 1:]:
            shared = repo_deps.get(name_a, set()) & repo_deps.get(name_b, set())
            if shared:
                edges.append(ImpactEdge(
                    source=name_a,
                    target=name_b,
                    shared_deps=sorted(shared)[:20],
                    impact_type="direct",
                    weight=len(shared),
                ))

    # Build Jira-linked edges (repos touching the same Jira tickets)
    jira_to_repos: dict[str, list[str]] = defaultdict(list)
    for rname, refs in repo_jira.items():
        for ref in refs:
            jira_to_repos[ref].append(rname)

    jira_edge_set: set[tuple[str, str]] = set()
    for ref, rnames in jira_to_repos.items():
        if len(rnames) > 1:
            for i, a in enumerate(rnames):
                for b in rnames[i + 1:]:
                    key = (min(a, b), max(a, b))
                    if key not in jira_edge_set:
                        jira_edge_set.add(key)
                        # Check if edge already exists
                        existing = next(
                            (e for e in edges if (e.source == key[0] and e.target == key[1])),
                            None,
                        )
                        if not existing:
                            edges.append(ImpactEdge(
                                source=key[0],
                                target=key[1],
                                shared_deps=[ref],
                                impact_type="jira-linked",
                                weight=1,
                            ))

    # Fill dependents
    node_map = {n.name: n for n in nodes}
    for edge in edges:
        if edge.impact_type == "direct":
            if edge.target in node_map and edge.source not in node_map[edge.target].dependents:
                node_map[edge.target].dependents.append(edge.source)
            if edge.source in node_map and edge.target not in node_map[edge.source].dependents:
                node_map[edge.source].dependents.append(edge.target)

    # Recent impacts: repos with changes that have dependents
    recent_impacts: list[RecentImpact] = []
    for node in nodes:
        if node.recent_changes > 0 and node.dependents:
            recent_impacts.append(RecentImpact(
                repo=node.name,
                change_summary=f"{node.recent_changes} commits in last {days} days",
                affected_repos=node.dependents[:10],
                jira_refs=node.jira_refs[:10],
                timestamp=datetime.now(timezone.utc).isoformat(),
            ))
    recent_impacts.sort(key=lambda x: len(x.affected_repos), reverse=True)

    # Shared dependency clusters: group repos by common deps
    dep_to_repos: dict[str, list[str]] = defaultdict(list)
    for rname, deps in repo_deps.items():
        for d in deps:
            dep_to_repos[d].append(rname)

    clusters = [
        {"dependency": dep, "repos": repos_list, "count": len(repos_list)}
        for dep, repos_list in sorted(dep_to_repos.items(), key=lambda x: len(x[1]), reverse=True)
        if len(repos_list) > 1
    ][:20]

    # Risk hotspots: repos with many dependents and recent changes
    risk_hotspots = [
        {
            "repo": node.name,
            "dependents": len(node.dependents),
            "recent_changes": node.recent_changes,
            "risk_score": len(node.dependents) * node.recent_changes,
            "language": node.language,
        }
        for node in nodes
        if node.dependents and node.recent_changes > 0
    ]
    risk_hotspots.sort(key=lambda x: x["risk_score"], reverse=True)

    return ImpactGraphResponse(
        generated_at=datetime.now(timezone.utc).isoformat(),
        total_repos=len(nodes),
        total_edges=len(edges),
        nodes=nodes,
        edges=edges,
        recent_impacts=recent_impacts[:10],
        shared_dependency_clusters=clusters,
        risk_hotspots=risk_hotspots[:10],
    )
