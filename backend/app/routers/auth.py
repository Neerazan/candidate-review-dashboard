from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.auth import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    get_current_user,
)
from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    StaffListResponse,
    StaffResponse,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import (
    InactiveAccountError,
    EmailAlreadyRegisteredError,
    ForbiddenActionError,
    InvalidCredentialsError,
    PasswordMismatchError,
    RefreshTokenError,
    UserNotFoundError,
    archive_staff,
    change_password,
    login as login_service,
    list_staff,
    logout as logout_service,
    refresh_session,
    register_reviewer,
    soft_delete_staff,
    unarchive_staff,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        max_age=int(timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES).total_seconds()),
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        max_age=int(timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS).total_seconds()),
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(key=ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    try:
        return register_reviewer(
            db=db,
            actor=current_user,
            name=payload.name,
            email=payload.email,
            password=payload.password,
        )
    except ForbiddenActionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        session = login_service(db=db, email=payload.email, password=payload.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except InactiveAccountError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    set_auth_cookies(response, session.access_token, session.refresh_token)
    return TokenResponse(access_token=session.access_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh_access_token(request: Request, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    try:
        session = refresh_session(db=db, refresh_token=refresh_token)
    except RefreshTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    set_auth_cookies(response, session.access_token, session.refresh_token)
    return TokenResponse(access_token=session.access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> Response:
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    logout_service(db=db, refresh_token=refresh_token)

    clear_auth_cookies(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/change-password", response_model=MessageResponse)
def change_user_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    try:
        change_password(
            db=db,
            user=current_user,
            current_password=payload.current_password,
            new_password=payload.new_password,
        )
    except PasswordMismatchError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MessageResponse(message="Password updated successfully")


@router.get("/staff", response_model=StaffListResponse)
def get_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StaffListResponse:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return StaffListResponse(items=[StaffResponse.model_validate(staff) for staff in list_staff(db=db)])


@router.patch("/staff/{staff_id}/archive", response_model=StaffResponse)
def patch_staff_archive(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StaffResponse:
    try:
        staff = archive_staff(db=db, actor=current_user, staff_id=staff_id)
    except ForbiddenActionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return StaffResponse.model_validate(staff)


@router.patch("/staff/{staff_id}/unarchive", response_model=StaffResponse)
def patch_staff_unarchive(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StaffResponse:
    try:
        staff = unarchive_staff(db=db, actor=current_user, staff_id=staff_id)
    except ForbiddenActionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return StaffResponse.model_validate(staff)


@router.delete("/staff/{staff_id}", response_model=StaffResponse)
def delete_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StaffResponse:
    try:
        staff = soft_delete_staff(db=db, actor=current_user, staff_id=staff_id)
    except ForbiddenActionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return StaffResponse.model_validate(staff)
