# Strip Billing, Add GitHub Org Discovery, Configure Jira Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all monetization/billing/Stripe code, add GitHub org-based repo discovery so users can add orgs (e.g. `rhpds`, `redhat-cop`) and repos by URL, and wire up the Jira integration to `issues.redhat.com`.

**Architecture:** The app runs on OpenShift -- local filesystem scanning is useless. Repos come from GitHub API instead. The `GitHubClient` already exists and can list org repos, get PRs, commits, etc. We add a `GitHubOrg` model, backend routes for adding/listing orgs and their repos, and a frontend tab to manage GitHub orgs. Billing/Stripe code is removed from models, frontend API, seed data, and route references. Jira is configured via OCP ConfigMap/Secret pointing to `issues.redhat.com`.

**Tech Stack:** Python/FastAPI, SQLAlchemy, React/TypeScript, PatternFly 5, GitHub REST API

---

## File Structure

### Files to create:
- `backend/api/models/github_org_models.py` -- Pydantic request/response models for GitHub org endpoints
- `backend/api/routes/github_orgs.py` -- FastAPI routes for adding/listing/removing GitHub orgs and discovering repos
- `frontend/src/components/Settings/GitHubOrgsTab.tsx` -- Frontend tab for managing GitHub orgs

### Files to modify:
- `backend/api/models/db_models.py` -- Remove `stripe_customer_id` from Organization, remove `stripe_subscription_id`/`stripe_price_id` from Subscription, add `GitHubOrg` model
- `backend/api/seed_features.py` -- Change all `min_plan` to `"free"`
- `backend/api/routes/org.py` -- Remove seat-limit upgrade-plan messaging
- `backend/api/routes/reports.py` -- Remove plan reference in report header
- `backend/api/main.py` -- Register `github_orgs` router
- `backend/api/services/github_client.py` -- Add `list_org_repos()` method
- `frontend/src/api/auth.ts` -- Remove billing types (`PlanInfo`, `BillingOverview`) and billing API functions
- `frontend/src/api/client.ts` -- Add `addGitHubOrg()`, `listGitHubOrgs()`, `removeGitHubOrg()`, `discoverOrgRepos()` API functions
- `frontend/src/components/CommandPalette/CommandPalette.tsx` -- Remove billing command
- `frontend/src/pages/SettingsPage.tsx` -- Add GitHub Orgs tab
- `frontend/src/components/Settings/GitHubIntegrationsTab.tsx` -- Support adding repos by GitHub URL (owner/repo), not local path
- `k8s/base/configmap.yaml` -- Already updated to `issues.redhat.com`
- `k8s/base/secret.yaml` -- Add `GITHUB_TOKEN` field

---

### Task 1: Strip Stripe fields from database models

**Files:**
- Modify: `backend/api/models/db_models.py:293-362`

- [ ] **Step 1: Remove Stripe columns from Organization and Subscription models**

In `backend/api/models/db_models.py`, remove the `stripe_customer_id` column from `Organization` (line 302), and remove `stripe_subscription_id` and `stripe_price_id` from `Subscription` (lines 346-347):

```python
# Organization: remove this line entirely:
stripe_customer_id = Column(String(100), nullable=True, unique=True, index=True)

# Subscription: remove these two lines entirely:
stripe_subscription_id = Column(String(100), nullable=True, unique=True, index=True)
stripe_price_id = Column(String(100), nullable=True)
```

The Subscription model keeps `plan`, `status`, `seats_limit`, `repos_limit`, `integrations_limit` since the app still uses orgs and role checks -- it just won't have commercial billing tiers.

- [ ] **Step 2: Verify no imports reference removed columns**

Run: `grep -r "stripe_customer_id\|stripe_subscription_id\|stripe_price_id" backend/ --include="*.py"`
Expected: Only hits in `db_models.py` (which we just cleaned). If other files reference these, clean them too.

- [ ] **Step 3: Commit**

```bash
git add backend/api/models/db_models.py
git commit -m "strip Stripe columns from Organization and Subscription models"
```

---

### Task 2: Make all features free-tier (remove plan gating)

**Files:**
- Modify: `backend/api/seed_features.py`
- Modify: `backend/api/routes/org.py:149-153`
- Modify: `backend/api/routes/reports.py:26,38-43,106-107`
- Modify: `frontend/src/components/CommandPalette/CommandPalette.tsx:51`

- [ ] **Step 1: Set all features to free tier**

In `backend/api/seed_features.py`, change every `"min_plan"` value to `"free"`:

```python
DEFAULT_FEATURES = [
    {"key": "basic_scanning", "name": "Basic Repository Scanning", "min_plan": "free"},
    {"key": "jira_integration", "name": "Jira Ticket Integration", "min_plan": "free"},
    {"key": "manual_sync", "name": "Manual Data Sync", "min_plan": "free"},
    {"key": "github_integration", "name": "GitHub Integration", "min_plan": "free"},
    {"key": "auto_discovery", "name": "Auto-Discovery", "min_plan": "free"},
    {"key": "export", "name": "Data Export", "min_plan": "free"},
    {"key": "themes", "name": "Custom Themes", "min_plan": "free"},
    {"key": "history", "name": "Analysis History", "min_plan": "free"},
    {"key": "linear_integration", "name": "Linear Integration", "min_plan": "free"},
    {"key": "auto_sync", "name": "Automatic Sync", "min_plan": "free"},
    {"key": "api_keys", "name": "API Keys", "min_plan": "free"},
    {"key": "codeclimate_integration", "name": "CodeClimate Integration", "min_plan": "free"},
    {"key": "priority_support", "name": "Priority Support", "min_plan": "free"},
    {"key": "custom_templates", "name": "Custom Ticket Templates", "min_plan": "free"},
    {"key": "sso", "name": "Single Sign-On (SSO)", "min_plan": "free"},
    {"key": "audit_log", "name": "Audit Log", "min_plan": "free"},
    {"key": "dedicated_support", "name": "Dedicated Support", "min_plan": "free"},
]
```

- [ ] **Step 2: Remove upgrade-plan messaging from org.py**

In `backend/api/routes/org.py`, change the seat limit error message at line 150-153 from:
```python
            raise HTTPException(
                status_code=403,
                detail=f"Seat limit reached ({subscription.seats_limit}). Upgrade your plan to add more members.",
            )
```
to:
```python
            raise HTTPException(
                status_code=403,
                detail=f"Seat limit reached ({subscription.seats_limit}).",
            )
```

- [ ] **Step 3: Remove plan from report header**

In `backend/api/routes/reports.py`, change the report title from `"DevPulse Pro - Organization Report"` to `"DevPulse - Organization Report"` (line 38). Remove the `lines.append(f"  Plan:          {plan}")` line (line 42).

- [ ] **Step 4: Remove billing command from CommandPalette**

In `frontend/src/components/CommandPalette/CommandPalette.tsx`, delete line 51:
```typescript
    { id: "set-billing", label: "Billing", description: "Manage subscription and billing", category: "settings", action: () => navigate("/settings") },
```

- [ ] **Step 5: Commit**

```bash
git add backend/api/seed_features.py backend/api/routes/org.py backend/api/routes/reports.py frontend/src/components/CommandPalette/CommandPalette.tsx
git commit -m "remove plan gating, billing references, and upgrade messaging"
```

---

### Task 3: Remove billing API types and functions from frontend

**Files:**
- Modify: `frontend/src/api/auth.ts:60-93,191-225`

- [ ] **Step 1: Remove billing types and API functions**

In `frontend/src/api/auth.ts`, remove the `PlanInfo` interface (lines 60-69), the `BillingOverview` interface (lines 71-93), and all billing API functions (lines 191-225):

Remove these interfaces:
```typescript
export interface PlanInfo {
  id: string;
  name: string;
  price_monthly: number;
  seats: number;
  repos: number;
  integrations: number;
  features: string[];
  is_current: boolean;
}

export interface BillingOverview {
  // ... entire interface
}
```

Remove these functions:
```typescript
export async function getBillingPlans(): Promise<PlanInfo[]> { ... }
export async function getBillingOverview(): Promise<BillingOverview> { ... }
export async function createCheckout(...) { ... }
export async function openCustomerPortal() { ... }
export async function getStripeStatus() { ... }
```

- [ ] **Step 2: Check for import references**

Run: `grep -r "getBillingPlans\|getBillingOverview\|createCheckout\|openCustomerPortal\|getStripeStatus\|PlanInfo\|BillingOverview" frontend/src/ --include="*.ts" --include="*.tsx"`
Expected: Only hits should be in `auth.ts` (which we're cleaning). If any components import these, remove the imports.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/auth.ts
git commit -m "remove billing types and API functions from frontend"
```

---

### Task 4: Add GitHubOrg database model

**Files:**
- Modify: `backend/api/models/db_models.py` (add after `GitHubIntegration` model, around line 128)

- [ ] **Step 1: Add GitHubOrg model to db_models.py**

Add this model after the `GitHubIntegration` class (before `GitHubPullRequest`):

```python
class GitHubOrg(Base):
    """Tracked GitHub organizations for repo discovery."""

    __tablename__ = "github_orgs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_login = Column(String(100), nullable=False, unique=True, index=True)
    display_name = Column(String(200), nullable=True)
    avatar_url = Column(String(1000), nullable=True)
    description = Column(Text, nullable=True)
    public_repos = Column(Integer, nullable=True)
    last_synced = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<GitHubOrg(login={self.org_login}, repos={self.public_repos})>"
```

- [ ] **Step 2: Commit**

```bash
git add backend/api/models/db_models.py
git commit -m "add GitHubOrg model for tracking GitHub organizations"
```

---

### Task 5: Add list_org_repos method to GitHubClient

**Files:**
- Modify: `backend/api/services/github_client.py`

- [ ] **Step 1: Add list_org_repos and get_org_info methods**

Add these methods to the `GitHubClient` class in `backend/api/services/github_client.py`:

```python
    def get_org_info(self, org: str) -> dict[str, Any]:
        """Get organization information."""
        try:
            data = self._request("GET", f"/orgs/{org}")
            return {
                "login": data["login"],
                "name": data.get("name", ""),
                "avatar_url": data.get("avatar_url", ""),
                "description": data.get("description", ""),
                "public_repos": data.get("public_repos", 0),
            }
        except Exception as e:
            return {"error": str(e)}

    def list_org_repos(
        self, org: str, per_page: int = 100, page: int = 1
    ) -> list[dict[str, Any]]:
        """List repositories for a GitHub organization."""
        try:
            repos = self._request(
                "GET",
                f"/orgs/{org}/repos",
                params={
                    "per_page": per_page,
                    "page": page,
                    "sort": "pushed",
                    "direction": "desc",
                },
            )
            return [
                {
                    "id": repo["id"],
                    "name": repo["name"],
                    "full_name": repo["full_name"],
                    "description": repo.get("description", ""),
                    "url": repo["html_url"],
                    "default_branch": repo.get("default_branch", "main"),
                    "private": repo["private"],
                    "language": repo.get("language", ""),
                    "pushed_at": repo.get("pushed_at", ""),
                    "updated_at": repo.get("updated_at", ""),
                    "stars": repo.get("stargazers_count", 0),
                    "forks": repo.get("forks_count", 0),
                    "open_issues": repo.get("open_issues_count", 0),
                }
                for repo in repos
            ]
        except Exception as e:
            return []
```

- [ ] **Step 2: Commit**

```bash
git add backend/api/services/github_client.py
git commit -m "add list_org_repos and get_org_info to GitHubClient"
```

---

### Task 6: Add Pydantic models for GitHub org endpoints

**Files:**
- Create: `backend/api/models/github_org_models.py`

- [ ] **Step 1: Create the Pydantic models file**

```python
"""Pydantic models for GitHub organization endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AddGitHubOrgRequest(BaseModel):
    org_login: str = Field(..., min_length=1, max_length=100)


class AddGitHubRepoRequest(BaseModel):
    owner: str = Field(..., min_length=1, max_length=100)
    repo: str = Field(..., min_length=1, max_length=100)


class GitHubOrgResponse(BaseModel):
    id: int
    org_login: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    description: Optional[str] = None
    public_repos: Optional[int] = None
    last_synced: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class GitHubOrgRepoResponse(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    url: str
    default_branch: str = "main"
    private: bool = False
    language: Optional[str] = None
    pushed_at: Optional[str] = None
    stars: int = 0
    forks: int = 0
    open_issues: int = 0
    is_added: bool = False
```

- [ ] **Step 2: Commit**

```bash
git add backend/api/models/github_org_models.py
git commit -m "add Pydantic models for GitHub org endpoints"
```

---

### Task 7: Create GitHub orgs backend routes

**Files:**
- Create: `backend/api/routes/github_orgs.py`
- Modify: `backend/api/main.py` (add router import and registration)

- [ ] **Step 1: Create the routes file**

```python
"""GitHub organization management routes."""
from __future__ import annotations

import os
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import GitHubOrg, GitHubIntegration, User
from ..models.github_org_models import (
    AddGitHubOrgRequest,
    AddGitHubRepoRequest,
    GitHubOrgResponse,
    GitHubOrgRepoResponse,
)
from ..services.github_client import GitHubClient
from ..middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/github-orgs", tags=["github-orgs"])


def _get_github_client() -> GitHubClient:
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise HTTPException(status_code=400, detail="GITHUB_TOKEN not configured")
    return GitHubClient(token=token)


@router.post("/")
async def add_github_org(
    request: AddGitHubOrgRequest,
    db: Session = Depends(get_db),
    client: GitHubClient = Depends(_get_github_client),
    user: User = Depends(get_current_user),
) -> GitHubOrgResponse:
    """Add a GitHub organization for repo discovery."""
    existing = db.execute(
        select(GitHubOrg).where(GitHubOrg.org_login == request.org_login)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Organization already added")

    info = client.get_org_info(request.org_login)
    if "error" in info:
        raise HTTPException(status_code=404, detail=f"GitHub org not found: {info['error']}")

    org = GitHubOrg(
        org_login=info["login"],
        display_name=info.get("name", ""),
        avatar_url=info.get("avatar_url", ""),
        description=info.get("description", ""),
        public_repos=info.get("public_repos", 0),
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    return GitHubOrgResponse.model_validate(org)


@router.get("/")
async def list_github_orgs(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[GitHubOrgResponse]:
    """List all tracked GitHub organizations."""
    orgs = db.execute(
        select(GitHubOrg).order_by(GitHubOrg.org_login)
    ).scalars().all()
    return [GitHubOrgResponse.model_validate(o) for o in orgs]


@router.delete("/{org_login}")
async def remove_github_org(
    org_login: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Remove a tracked GitHub organization."""
    org = db.execute(
        select(GitHubOrg).where(GitHubOrg.org_login == org_login)
    ).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    db.delete(org)
    db.commit()
    return {"success": True}


@router.get("/{org_login}/repos")
async def list_org_repos(
    org_login: str,
    page: int = 1,
    db: Session = Depends(get_db),
    client: GitHubClient = Depends(_get_github_client),
    user: User = Depends(get_current_user),
) -> list[GitHubOrgRepoResponse]:
    """Discover repos in a GitHub org. Marks repos already added as integrations."""
    repos = client.list_org_repos(org_login, per_page=100, page=page)
    if not repos:
        raise HTTPException(status_code=404, detail="No repos found or org does not exist")

    added_set = set()
    integrations = db.execute(select(GitHubIntegration)).scalars().all()
    for integ in integrations:
        if integ.github_owner and integ.github_repo:
            added_set.add(f"{integ.github_owner}/{integ.github_repo}".lower())

    result = []
    for repo in repos:
        is_added = repo["full_name"].lower() in added_set
        result.append(GitHubOrgRepoResponse(is_added=is_added, **repo))
    return result


@router.post("/add-repo")
async def add_repo_from_github(
    request: AddGitHubRepoRequest,
    db: Session = Depends(get_db),
    client: GitHubClient = Depends(_get_github_client),
    user: User = Depends(get_current_user),
) -> dict:
    """Add a GitHub repo by owner/repo. Creates a GitHubIntegration without a local path."""
    repo_path = f"github:{request.owner}/{request.repo}"

    existing = db.execute(
        select(GitHubIntegration).where(GitHubIntegration.repo_path == repo_path)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Repository already added")

    info = client.get_repo_info(request.owner, request.repo)
    if "error" in info:
        raise HTTPException(status_code=404, detail=f"Repository not found: {info['error']}")

    integration = GitHubIntegration(
        repo_path=repo_path,
        repo_name=request.repo,
        github_owner=request.owner,
        github_repo=request.repo,
        remote_url=info.get("url", ""),
        sync_enabled=True,
        repo_metadata=info,
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)

    return {
        "success": True,
        "integration_id": integration.id,
        "full_name": f"{request.owner}/{request.repo}",
    }
```

- [ ] **Step 2: Register the router in main.py**

In `backend/api/main.py`, add the import and router registration. Add to the import line (line 10):
```python
from .routes import folders, git_analysis, health, jira_tickets, history, templates, export, config, themes, github, github_orgs, linear, codeclimate, auth, org, analytics, audit, webhooks, notifications, admin, search, oauth, activity, twofa, sessions, schedules, reports, favorites, invitations, integrations, filter_presets, standups, flow_analytics, impact_graph, health_scores, ws, recommendations, team
```

And add after `app.include_router(github.router)` (after line 110):
```python
app.include_router(github_orgs.router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/api/routes/github_orgs.py backend/api/main.py
git commit -m "add GitHub org discovery routes and register router"
```

---

### Task 8: Add frontend API functions for GitHub orgs

**Files:**
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Add GitHub org API functions**

Add these functions at the end of `frontend/src/api/client.ts` (before the closing of the file):

```typescript
// GitHub Org Discovery API
export interface GitHubOrgInfo {
  id: number;
  org_login: string;
  display_name: string | null;
  avatar_url: string | null;
  description: string | null;
  public_repos: number | null;
  last_synced: string | null;
  created_at: string;
}

export interface GitHubOrgRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  url: string;
  default_branch: string;
  private: boolean;
  language: string | null;
  pushed_at: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  is_added: boolean;
}

export async function addGitHubOrg(orgLogin: string): Promise<GitHubOrgInfo> {
  const { data } = await api.post("/github-orgs/", { org_login: orgLogin });
  return data;
}

export async function listGitHubOrgs(): Promise<GitHubOrgInfo[]> {
  const { data } = await api.get("/github-orgs/");
  return data;
}

export async function removeGitHubOrg(orgLogin: string): Promise<void> {
  await api.delete(`/github-orgs/${orgLogin}`);
}

export async function listOrgRepos(orgLogin: string, page = 1): Promise<GitHubOrgRepo[]> {
  const { data } = await api.get(`/github-orgs/${orgLogin}/repos`, { params: { page } });
  return data;
}

export async function addRepoFromGitHub(owner: string, repo: string): Promise<{
  success: boolean;
  integration_id: number;
  full_name: string;
}> {
  const { data } = await api.post("/github-orgs/add-repo", { owner, repo });
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/client.ts
git commit -m "add frontend API functions for GitHub org discovery"
```

---

### Task 9: Create GitHub Orgs settings tab (frontend)

**Files:**
- Create: `frontend/src/components/Settings/GitHubOrgsTab.tsx`
- Modify: `frontend/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Create the GitHubOrgsTab component**

Create `frontend/src/components/Settings/GitHubOrgsTab.tsx`:

```tsx
import { useState } from "react";
import {
  Stack,
  StackItem,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  TextInput,
  Button,
  Alert,
  AlertActionCloseButton,
  Label,
  Spinner,
  DataList,
  DataListItem,
  DataListItemRow,
  DataListItemCells,
  DataListCell,
  DataListAction,
  Modal,
  ModalVariant,
  List,
  ListItem,
} from "@patternfly/react-core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listGitHubOrgs,
  addGitHubOrg,
  removeGitHubOrg,
  listOrgRepos,
  addRepoFromGitHub,
  type GitHubOrgInfo,
  type GitHubOrgRepo,
} from "../../api/client";

export function GitHubOrgsTab() {
  const queryClient = useQueryClient();
  const [orgInput, setOrgInput] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [browseOrg, setBrowseOrg] = useState<string | null>(null);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["github-orgs"],
    queryFn: listGitHubOrgs,
  });

  const { data: orgRepos = [], isLoading: reposLoading } = useQuery({
    queryKey: ["github-org-repos", browseOrg],
    queryFn: () => (browseOrg ? listOrgRepos(browseOrg) : Promise.resolve([])),
    enabled: !!browseOrg,
  });

  const addOrgMutation = useMutation({
    mutationFn: addGitHubOrg,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["github-orgs"] });
      setSuccessMsg(`Added ${data.org_login} (${data.public_repos ?? 0} repos)`);
      setOrgInput("");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || "Failed to add org");
    },
  });

  const removeOrgMutation = useMutation({
    mutationFn: removeGitHubOrg,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-orgs"] });
      setSuccessMsg("Organization removed");
    },
  });

  const addRepoMutation = useMutation({
    mutationFn: ({ owner, repo }: { owner: string; repo: string }) =>
      addRepoFromGitHub(owner, repo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["github-org-repos"] });
      queryClient.invalidateQueries({ queryKey: ["github-integrations"] });
      setSuccessMsg(`Added ${data.full_name}`);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || "Failed to add repo");
    },
  });

  const handleAddOrg = () => {
    if (!orgInput.trim()) return;
    const cleaned = orgInput.trim().replace(/^(https?:\/\/)?(github\.com\/)?/, "").replace(/\/$/, "");
    if (cleaned.includes("/")) {
      const [owner, repo] = cleaned.split("/");
      addRepoMutation.mutate({ owner, repo });
    } else {
      addOrgMutation.mutate(cleaned);
    }
  };

  return (
    <Stack hasGutter>
      {successMsg && (
        <StackItem>
          <Alert
            variant="success"
            title={successMsg}
            actionClose={<AlertActionCloseButton onClose={() => setSuccessMsg("")} />}
          />
        </StackItem>
      )}
      {errorMsg && (
        <StackItem>
          <Alert
            variant="danger"
            title={errorMsg}
            actionClose={<AlertActionCloseButton onClose={() => setErrorMsg("")} />}
          />
        </StackItem>
      )}

      <StackItem>
        <Card>
          <CardTitle>Add GitHub Organization or Repository</CardTitle>
          <CardBody>
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddOrg();
              }}
            >
              <FormGroup
                label="GitHub org or owner/repo"
                fieldId="org-input"
                helperText="Enter an org name (e.g. rhpds) or owner/repo (e.g. redhat-cop/agnosticd)"
              >
                <TextInput
                  id="org-input"
                  value={orgInput}
                  onChange={(_e, val) => setOrgInput(val)}
                  placeholder="rhpds or redhat-cop/agnosticd"
                />
              </FormGroup>
              <Button
                variant="primary"
                onClick={handleAddOrg}
                isLoading={addOrgMutation.isPending || addRepoMutation.isPending}
                isDisabled={!orgInput.trim()}
              >
                Add
              </Button>
            </Form>
          </CardBody>
        </Card>
      </StackItem>

      <StackItem>
        <Card>
          <CardTitle>Tracked Organizations</CardTitle>
          <CardBody>
            {isLoading ? (
              <Spinner size="lg" />
            ) : orgs.length === 0 ? (
              <p>No organizations added yet. Add one above to discover repos.</p>
            ) : (
              <DataList aria-label="GitHub organizations">
                {orgs.map((org: GitHubOrgInfo) => (
                  <DataListItem key={org.org_login}>
                    <DataListItemRow>
                      <DataListItemCells
                        dataListCells={[
                          <DataListCell key="name">
                            <strong>{org.org_login}</strong>
                            {org.display_name && ` - ${org.display_name}`}
                          </DataListCell>,
                          <DataListCell key="repos">
                            <Label>{org.public_repos ?? 0} repos</Label>
                          </DataListCell>,
                        ]}
                      />
                      <DataListAction
                        aria-label={`Actions for ${org.org_login}`}
                        aria-labelledby={org.org_login}
                        id={`action-${org.org_login}`}
                      >
                        <Button
                          variant="secondary"
                          onClick={() => setBrowseOrg(org.org_login)}
                        >
                          Browse Repos
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => removeOrgMutation.mutate(org.org_login)}
                        >
                          Remove
                        </Button>
                      </DataListAction>
                    </DataListItemRow>
                  </DataListItem>
                ))}
              </DataList>
            )}
          </CardBody>
        </Card>
      </StackItem>

      <Modal
        variant={ModalVariant.large}
        title={`Repos in ${browseOrg}`}
        isOpen={!!browseOrg}
        onClose={() => setBrowseOrg(null)}
      >
        {reposLoading ? (
          <Spinner size="lg" />
        ) : (
          <List isPlain>
            {orgRepos.map((repo: GitHubOrgRepo) => (
              <ListItem key={repo.full_name}>
                <Stack hasGutter>
                  <StackItem>
                    <strong>{repo.name}</strong>
                    {repo.language && <Label isCompact style={{ marginLeft: 8 }}>{repo.language}</Label>}
                    {repo.description && <p style={{ marginTop: 4, color: "var(--pf-v5-global--Color--200)" }}>{repo.description}</p>}
                  </StackItem>
                  <StackItem>
                    {repo.is_added ? (
                      <Label color="green">Added</Label>
                    ) : (
                      <Button
                        variant="link"
                        isSmall
                        onClick={() => {
                          const [owner, name] = repo.full_name.split("/");
                          addRepoMutation.mutate({ owner, repo: name });
                        }}
                        isLoading={addRepoMutation.isPending}
                      >
                        Add to DevPulse
                      </Button>
                    )}
                  </StackItem>
                </Stack>
              </ListItem>
            ))}
          </List>
        )}
      </Modal>
    </Stack>
  );
}
```

- [ ] **Step 2: Add the tab to SettingsPage**

In `frontend/src/pages/SettingsPage.tsx`, add the import for `GitHubOrgsTab`:

```typescript
import { GitHubOrgsTab } from "../components/Settings/GitHubOrgsTab";
```

Then add a new tab entry. Find the existing tabs array/definition and add a "GitHub Orgs" tab near the existing "GitHub" tab. The exact location depends on the tab structure -- add it right after the GitHub tab with tab key `"github-orgs"` and render `<GitHubOrgsTab />`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Settings/GitHubOrgsTab.tsx frontend/src/pages/SettingsPage.tsx
git commit -m "add GitHub Orgs settings tab for org discovery and repo adding"
```

---

### Task 10: Update GitHubIntegrationsTab to support URL-based repo adding

**Files:**
- Modify: `frontend/src/components/Settings/GitHubIntegrationsTab.tsx`

- [ ] **Step 1: Change repo path input to accept owner/repo format**

In the `GitHubIntegrationsTab` component, update the "Add Integration" modal form. Replace the "Repository Path" field with an "owner/repo" input. When `autoDetect` is true, only the `owner/repo` field is needed -- the component should call `enableGitHubIntegration` with `repo_path` set to `github:{owner}/{repo}` and provide `github_owner` and `github_repo` explicitly.

Change the form's `repoPath` state variable usage so it accepts formats like:
- `owner/repo` (e.g., `rhpds/agnosticd`)
- `https://github.com/owner/repo`

Update the `handleEnable` function to parse the input and set `repo_path`, `github_owner`, and `github_repo`:

```typescript
const handleEnable = () => {
  let owner = githubOwner;
  let repo = githubRepo;
  let path = repoPath;

  // Parse GitHub URL or owner/repo format
  const urlMatch = path.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (urlMatch) {
    owner = owner || urlMatch[1];
    repo = repo || urlMatch[2].replace(/\.git$/, "");
    path = `github:${owner}/${repo}`;
  } else if (path.includes("/") && !path.startsWith("/")) {
    const parts = path.split("/");
    owner = owner || parts[0];
    repo = repo || parts[1];
    path = `github:${owner}/${repo}`;
  }

  enableMutation.mutate({
    repo_path: path,
    github_owner: owner || undefined,
    github_repo: repo || undefined,
  });
};
```

Update the form label from "Repository Path" to "GitHub Repository" and the placeholder to `owner/repo or https://github.com/owner/repo`.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Settings/GitHubIntegrationsTab.tsx
git commit -m "support GitHub URL and owner/repo format in integrations tab"
```

---

### Task 11: Add GITHUB_TOKEN to OCP secret and config

**Files:**
- Modify: `k8s/base/secret.yaml`
- Modify: `k8s/base/configmap.yaml`

- [ ] **Step 1: Add GITHUB_TOKEN placeholder to k8s secret**

In `k8s/base/secret.yaml`, add `GITHUB_TOKEN`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: devpulse-secrets
  labels:
    app: devpulse
type: Opaque
stringData:
  JIRA_API_TOKEN: "REPLACE_ME"
  JWT_SECRET_KEY: "REPLACE_ME"
  GITHUB_TOKEN: "REPLACE_ME"
```

- [ ] **Step 2: Set the actual GITHUB_TOKEN on the cluster**

Run (not committed -- actual token stays out of git):
```bash
oc patch secret devpulse-secrets -n devpulse-dev --type merge -p '{"stringData":{"GITHUB_TOKEN":"'"$GITHUB_PERSONAL_ACCESS_TOKEN"'"}}'
```

- [ ] **Step 3: Commit the template (not the actual token)**

```bash
git add k8s/base/secret.yaml k8s/base/configmap.yaml
git commit -m "add GITHUB_TOKEN to k8s secret template, update Jira URL"
```

---

### Task 12: Build, deploy, and verify on OCP

- [ ] **Step 1: Build new image**

```bash
oc start-build devpulse --from-dir=. --follow -n devpulse-dev
```

- [ ] **Step 2: Restart deployment**

```bash
oc rollout restart deployment/devpulse -n devpulse-dev
oc rollout status deployment/devpulse -n devpulse-dev --timeout=120s
```

- [ ] **Step 3: Verify pod is running**

```bash
oc get pods -n devpulse-dev -l app=devpulse
```
Expected: 1 pod with 2/2 READY, STATUS Running

- [ ] **Step 4: Verify new endpoints**

```bash
oc exec deployment/devpulse -c devpulse -n devpulse-dev -- python -c "
from api.routes.github_orgs import router
print([r.path for r in router.routes])
"
```
Expected: Prints list containing `/api/github-orgs/`, `/api/github-orgs/{org_login}`, etc.

- [ ] **Step 5: Verify Jira connection**

```bash
oc exec deployment/devpulse -c devpulse -n devpulse-dev -- python -c "
import os; print('JIRA_URL:', os.getenv('JIRA_URL'))
"
```
Expected: `JIRA_URL: https://issues.redhat.com`

- [ ] **Step 6: Test GitHub org endpoint through the proxy**

Access the app at `https://devpulse-devpulse-dev.apps.ocp-integration.infra.open.redhat.com` and use the new GitHub Orgs settings tab to add `rhpds` and `redhat-cop`.

---

## Self-Review Checklist

1. **Spec coverage:**
   - Remove billing/Stripe: Tasks 1, 2, 3 (models, seed data, frontend types/functions, command palette, report header, upgrade messaging)
   - GitHub org discovery: Tasks 4, 5, 6, 7, 8, 9 (model, client method, pydantic models, routes, API functions, UI tab)
   - GitHub URL repo adding: Task 10 (integrations tab update)
   - Jira config: Task 11 (k8s manifests), already partially done (ConfigMap updated to issues.redhat.com before this plan)
   - Deploy and verify: Task 12

2. **Placeholder scan:** No TBDs, TODOs, or "implement later" found.

3. **Type consistency:** `GitHubOrgResponse` fields match `GitHubOrg` model columns. `GitHubOrgRepoResponse` fields match `list_org_repos()` return dict keys. `GitHubOrgInfo` TypeScript interface matches `GitHubOrgResponse` Pydantic model. `AddGitHubRepoRequest` matches `add_repo_from_github` route parameters.
