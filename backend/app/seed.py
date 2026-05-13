from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.config import settings
from app.models import Candidate, User, UserRole

SEED_RESUME_URL = "https://docs.google.com/document/d/1Sey3iEn5gr5vKhpGfrNIO1Fv8oS6CSeJeVF06dCFucg/edit?usp=sharing"


def seed_users(db: Session) -> None:
    users_to_seed = [
        {
            "name": "System Admin",
            "email": "admin@techkraft.local",
            "password": "password123",
            "role": UserRole.ADMIN.value,
        },
        {
            "name": "Primary Reviewer",
            "email": "reviewer@techkraft.local",
            "password": "password123",
            "role": UserRole.REVIEWER.value,
        },
        {
            "name": "Second Reviewer",
            "email": "reviewer2@techkraft.local",
            "password": "password123",
            "role": UserRole.REVIEWER.value,
        },
    ]

    for seed_user in users_to_seed:
        existing_user = db.scalar(select(User).where(User.email == seed_user["email"]))
        if existing_user:
            continue

        db.add(
            User(
                name=seed_user["name"],
                email=seed_user["email"],
                hashed_password=hash_password(seed_user["password"]),
                role=seed_user["role"],
            )
        )


def seed_candidates(db: Session, total_candidates: int = 60) -> None:
    roles = [
        "Backend Engineer",
        "Frontend Engineer",
        "Full Stack Engineer",
        "Data Engineer",
        "DevOps Engineer",
    ]
    statuses = ["new", "reviewed", "hired", "rejected", "archived"]
    skills_cycle = [
        ["Python", "FastAPI", "SQL"],
        ["TypeScript", "React", "CSS"],
        ["Node.js", "GraphQL", "PostgreSQL"],
        ["Docker", "Kubernetes", "CI/CD"],
        ["AWS", "Terraform", "Monitoring"],
    ]

    base_date = datetime.now(UTC) - timedelta(days=90)

    for i in range(1, total_candidates + 1):
        email = f"candidate{i:03d}@example.com"
        existing_candidate = db.scalar(select(Candidate).where(Candidate.email == email))
        if existing_candidate:
            continue

        db.add(
            Candidate(
                name=f"Candidate {i:03d}",
                email=email,
                role_applied=roles[(i - 1) % len(roles)],
                status=statuses[(i - 1) % len(statuses)],
                skills=skills_cycle[(i - 1) % len(skills_cycle)],
                experience_summary=f"{2 + (i % 8)} years experience in software delivery.",
                resume_url=SEED_RESUME_URL,
                internal_notes=None,
                created_at=base_date + timedelta(days=i),
                updated_at=base_date + timedelta(days=i),
            )
        )


def seed_database() -> None:
    if settings.DATABASE_URL.startswith("sqlite:///") and ":memory:" not in settings.DATABASE_URL:
        sqlite_path = settings.DATABASE_URL.replace("sqlite:///", "", 1)
        db_file = Path(sqlite_path)
        if not db_file.is_absolute():
            db_file = Path.cwd() / db_file
        db_file.parent.mkdir(parents=True, exist_ok=True)

    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        seed_users(db)
        seed_candidates(db, total_candidates=60)
        db.commit()


if __name__ == "__main__":
    seed_database()
    print("Seeding complete: users and 60 candidates ensured.")
