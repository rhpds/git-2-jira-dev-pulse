"""Two-Factor Authentication (TOTP) routes."""
from __future__ import annotations

import io
import base64
import secrets

import pyotp
import qrcode
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User
from ..middleware.auth_middleware import get_current_user
from ..services.auth_service import verify_password

router = APIRouter(prefix="/api/auth/2fa", tags=["2fa"])


class TwoFASetupResponse(BaseModel):
    secret: str
    qr_code: str  # base64 encoded PNG
    backup_codes: list[str]


class TwoFAVerifyRequest(BaseModel):
    code: str


class TwoFADisableRequest(BaseModel):
    password: str
    code: str


@router.get("/status")
async def get_2fa_status(
    user: User = Depends(get_current_user),
) -> dict:
    """Check if 2FA is enabled for the current user."""
    return {
        "enabled": bool(user.totp_enabled),
        "has_backup_codes": bool(user.totp_backup_codes),
    }


@router.post("/setup")
async def setup_2fa(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TwoFASetupResponse:
    """Generate a TOTP secret and QR code for 2FA setup."""
    if user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")

    # Generate secret
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)

    # Generate provisioning URI
    provisioning_uri = totp.provisioning_uri(
        name=user.email,
        issuer_name="DevPulse Pro",
    )

    # Generate QR code as base64
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()

    # Generate backup codes
    backup_codes = [secrets.token_hex(4).upper() for _ in range(8)]

    # Store secret and backup codes (not yet enabled)
    user.totp_secret = secret
    user.totp_backup_codes = backup_codes
    db.commit()

    return TwoFASetupResponse(
        secret=secret,
        qr_code=f"data:image/png;base64,{qr_base64}",
        backup_codes=backup_codes,
    )


@router.post("/verify")
async def verify_2fa(
    request: TwoFAVerifyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Verify a TOTP code to enable 2FA."""
    if user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")

    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="Run setup first")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    user.totp_enabled = True
    db.commit()

    return {"success": True, "message": "Two-factor authentication enabled"}


@router.post("/disable")
async def disable_2fa(
    request: TwoFADisableRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Disable 2FA with password and current TOTP code."""
    if not user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled")

    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid password")

    # Verify TOTP code
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(request.code, valid_window=1):
        # Check backup codes
        backup_codes = user.totp_backup_codes or []
        if request.code.upper() not in [c.upper() for c in backup_codes]:
            raise HTTPException(status_code=400, detail="Invalid verification code")

    user.totp_enabled = False
    user.totp_secret = None
    user.totp_backup_codes = None
    db.commit()

    return {"success": True, "message": "Two-factor authentication disabled"}


@router.post("/validate")
async def validate_2fa_code(
    request: TwoFAVerifyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Validate a TOTP code (for login verification)."""
    if not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA is not enabled")

    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(request.code, valid_window=1):
        return {"valid": True}

    # Check backup codes
    backup_codes = user.totp_backup_codes or []
    code_upper = request.code.upper()
    if code_upper in [c.upper() for c in backup_codes]:
        # Consume the backup code
        user.totp_backup_codes = [c for c in backup_codes if c.upper() != code_upper]
        db.commit()
        return {"valid": True, "backup_code_used": True}

    raise HTTPException(status_code=400, detail="Invalid code")


@router.post("/regenerate-backup-codes")
async def regenerate_backup_codes(
    request: TwoFAVerifyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Regenerate backup codes (requires current TOTP code)."""
    if not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA is not enabled")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    backup_codes = [secrets.token_hex(4).upper() for _ in range(8)]
    user.totp_backup_codes = backup_codes
    db.commit()

    return {"backup_codes": backup_codes}
