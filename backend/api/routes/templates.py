"""API routes for ticket templates."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.template_models import TemplateCreate, TemplateUpdate, TemplateResponse
from ..models.git_models import WorkSummary
from ..models.jira_models import TicketSuggestion
from ..services.template_service import TemplateService
from ..exceptions import TemplateError

router = APIRouter(prefix="/api/templates", tags=["templates"])


def get_template_service(db: Session = Depends(get_db)) -> TemplateService:
    """Dependency injection for template service."""
    with db as session:
        return TemplateService(session)


class ApplyTemplateRequest(BaseModel):
    """Request to apply a template to work summary."""
    work_summary: WorkSummary


@router.post("/", response_model=TemplateResponse, status_code=201)
def create_template(
    template_data: TemplateCreate,
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Create a new ticket template.

    Args:
        template_data: Template creation data

    Returns:
        Created template
    """
    try:
        template = template_service.create(template_data)
        return template
    except TemplateError as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.get("/", response_model=List[TemplateResponse])
def list_templates(
    template_service: TemplateService = Depends(get_template_service),
):
    """
    List all ticket templates.

    Returns:
        List of templates
    """
    return template_service.list_all()


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: int,
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Get a specific template by ID.

    Args:
        template_id: Template ID

    Returns:
        Template details
    """
    template = template_service.get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: int,
    update_data: TemplateUpdate,
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Update a template.

    Args:
        template_id: Template ID
        update_data: Update data

    Returns:
        Updated template
    """
    template = template_service.update(template_id, update_data)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Delete a template.

    Args:
        template_id: Template ID

    Returns:
        Success message
    """
    deleted = template_service.delete(template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}


@router.post("/{template_id}/set-default")
def set_default_template(
    template_id: int,
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Set a template as the default.

    Args:
        template_id: Template ID

    Returns:
        Success message
    """
    success = template_service.set_default(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template set as default"}


@router.post("/{template_id}/apply", response_model=TicketSuggestion)
def apply_template(
    template_id: int,
    req: ApplyTemplateRequest,
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Apply a template to a work summary to preview the result.

    Args:
        template_id: Template ID
        req: Request with work summary

    Returns:
        Generated ticket suggestion preview
    """
    template = template_service.get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    suggestion = template_service.apply_template(template, req.work_summary)
    return suggestion
