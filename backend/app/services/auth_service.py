from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import (
    TokenValidationError,
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models import RefreshToken, Score, User, UserRole


class AuthServiceError(Exception):
    pass


class ForbiddenActionError(AuthServiceError):
    pass


class EmailAlreadyRegisteredError(AuthServiceError):
    pass


class InvalidCredentialsError(AuthServiceError):
    pass


class RefreshTokenError(AuthServiceError):
    pass


class InactiveAccountError(AuthServiceError):
    pass


class UserNotFoundError(AuthServiceError):
    pass


class PasswordMismatchError(AuthServiceError):
    pass


@dataclass
class AuthSession:
    access_token: str
    refresh_token: str


def _utcnow_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def register_reviewer(*, db: Session, actor: User, name: str, email: str, password: str) -> User:
    if actor.role != UserRole.ADMIN.value:
        raise ForbiddenActionError("Admin access required")

    existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user:
        raise EmailAlreadyRegisteredError("Email already registered")

    user = User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        role=UserRole.REVIEWER.value,
        force_password_change=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(*, db: Session, email: str, password: str) -> AuthSession:
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError("Invalid email or password")
    if user.deleted_at is not None or not user.active:
        raise InactiveAccountError("Account is inactive")

    access_token = create_access_token(user)
    refresh_token, jti, expires_at = create_refresh_token(user)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            jti=jti,
            expires_at=expires_at,
        )
    )
    db.commit()
    return AuthSession(access_token=access_token, refresh_token=refresh_token)


def refresh_session(*, db: Session, refresh_token: str) -> AuthSession:
    payload = _decode_refresh_payload(refresh_token)
    token_hash_value = hash_token(refresh_token)

    stored_token = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash_value))
    if not stored_token:
        raise RefreshTokenError("Refresh token not recognized")

    if stored_token.revoked_at is not None:
        raise RefreshTokenError("Refresh token revoked")

    if stored_token.expires_at <= _utcnow_naive():
        raise RefreshTokenError("Refresh token expired")

    if stored_token.jti != payload.get("jti"):
        raise RefreshTokenError("Refresh token mismatch")

    user = db.scalar(select(User).where(User.id == stored_token.user_id))
    if not user:
        raise RefreshTokenError("User not found")
    if user.deleted_at is not None or not user.active:
        raise RefreshTokenError("Account is inactive")

    stored_token.revoked_at = _utcnow_naive()

    new_access_token = create_access_token(user)
    new_refresh_token, new_jti, new_expires_at = create_refresh_token(user)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(new_refresh_token),
            jti=new_jti,
            expires_at=new_expires_at,
        )
    )
    db.commit()

    return AuthSession(access_token=new_access_token, refresh_token=new_refresh_token)


def logout(*, db: Session, refresh_token: str | None) -> None:
    if not refresh_token:
        return

    stored_token = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(refresh_token)))
    if stored_token and not stored_token.revoked_at:
        stored_token.revoked_at = _utcnow_naive()
        db.commit()


def change_password(*, db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.hashed_password):
        raise PasswordMismatchError("Current password is incorrect")
    user.hashed_password = hash_password(new_password)
    user.force_password_change = False
    db.commit()


def list_staff(*, db: Session) -> list[User]:
    return list(db.scalars(select(User).where(User.role == UserRole.REVIEWER.value).order_by(User.created_at.desc())).all())


def archive_staff(*, db: Session, actor: User, staff_id: str) -> User:
    if actor.role != UserRole.ADMIN.value:
        raise ForbiddenActionError("Admin access required")

    staff = db.scalar(select(User).where(User.id == staff_id, User.role == UserRole.REVIEWER.value))
    if not staff:
        raise UserNotFoundError("Staff not found")

    staff.active = False
    db.commit()
    db.refresh(staff)
    return staff


def unarchive_staff(*, db: Session, actor: User, staff_id: str) -> User:
    if actor.role != UserRole.ADMIN.value:
        raise ForbiddenActionError("Admin access required")

    staff = db.scalar(select(User).where(User.id == staff_id, User.role == UserRole.REVIEWER.value))
    if not staff:
        raise UserNotFoundError("Staff not found")
    if staff.deleted_at is not None:
        raise ForbiddenActionError("Deleted staff cannot be unarchived")

    staff.active = True
    db.commit()
    db.refresh(staff)
    return staff


def soft_delete_staff(*, db: Session, actor: User, staff_id: str) -> User:
    if actor.role != UserRole.ADMIN.value:
        raise ForbiddenActionError("Admin access required")

    staff = db.scalar(select(User).where(User.id == staff_id, User.role == UserRole.REVIEWER.value))
    if not staff:
        raise UserNotFoundError("Staff not found")

    deletion_time = _utcnow_naive()
    staff.active = False
    staff.deleted_at = deletion_time

    scores = db.scalars(
        select(Score).where(
            Score.reviewer_id == staff.id,
            Score.deleted_at.is_(None),
        )
    ).all()
    for score in scores:
        score.deleted_at = deletion_time

    db.commit()
    db.refresh(staff)
    return staff


def _decode_refresh_payload(refresh_token: str) -> dict:
    from app.auth import decode_token

    try:
        return decode_token(refresh_token, expected_type="refresh")
    except TokenValidationError as exc:
        raise RefreshTokenError("Invalid refresh token") from exc
