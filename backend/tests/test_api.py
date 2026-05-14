from __future__ import annotations

import importlib
import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _fresh_app(database_url: str):
    os.environ["DATABASE_URL"] = database_url

    for module_name in list(sys.modules.keys()):
        if module_name == "app" or module_name.startswith("app."):
            del sys.modules[module_name]

    main = importlib.import_module("app.main")
    return main.app


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200


def _login_reviewer_and_change_password(client: TestClient, email: str, old_password: str, new_password: str) -> None:
    _login(client, email, old_password)
    response = client.post(
        "/auth/change-password",
        json={"current_password": old_password, "new_password": new_password},
    )
    assert response.status_code == 200


def test_login_returns_access_token(tmp_path: Path):
    app = _fresh_app(f"sqlite:///{tmp_path}/test_login.db")
    with TestClient(app) as client:
        response = client.post(
            "/auth/login",
            json={"email": "admin@techkraft.local", "password": "password123"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert "access_token" in payload
    assert payload["token_type"] == "bearer"


def test_reviewer_cannot_see_other_reviewers_scores(tmp_path: Path):
    app = _fresh_app(f"sqlite:///{tmp_path}/test_rbac.db")
    with TestClient(app) as client:
        _login_reviewer_and_change_password(client, "reviewer@techkraft.local", "password123", "newpassword123")
        candidate_list = client.get("/candidates", params={"status": "new"})
        candidate_id = candidate_list.json()["items"][0]["id"]

        create_first = client.post(
            f"/candidates/{candidate_id}/scores",
            json={
                "category": "technical_skills",
                "score": 4,
                "note": "Good foundation",
            },
        )
        assert create_first.status_code == 201

        client.post("/auth/logout")
        _login_reviewer_and_change_password(client, "reviewer2@techkraft.local", "password123", "newpassword456")
        create_second = client.post(
            f"/candidates/{candidate_id}/scores",
            json={
                "category": "communication",
                "score": 5,
                "note": "Very clear communicator",
            },
        )
        assert create_second.status_code == 201

        client.post("/auth/logout")
        _login(client, "reviewer@techkraft.local", "newpassword123")
        detail = client.get(f"/candidates/{candidate_id}")
        assert detail.status_code == 200

        payload = detail.json()
        assert "internal_notes" not in payload
        assert len(payload["scores"]) == 1
        assert payload["scores"][0]["reviewer_id"] != create_second.json()["reviewer_id"]


def test_list_candidates_with_status_filter_and_pagination(tmp_path: Path):
    app = _fresh_app(f"sqlite:///{tmp_path}/test_list.db")
    with TestClient(app) as client:
        _login(client, "admin@techkraft.local", "password123")
        response = client.get("/candidates", params={"status": "new", "page": 1, "page_size": 5})

    assert response.status_code == 200
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 5
    assert payload["total"] >= 1
    assert len(payload["items"]) <= 5
    assert all(item["status"] == "new" for item in payload["items"])


def test_candidate_stats_endpoint_returns_aggregates(tmp_path: Path):
    app = _fresh_app(f"sqlite:///{tmp_path}/test_stats.db")
    with TestClient(app) as client:
        _login(client, "admin@techkraft.local", "password123")
        response = client.get("/candidates/stats")

    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {"total", "new", "reviewed", "hired", "rejected"}
    assert isinstance(payload["total"], int)


def test_admin_cannot_score_but_can_manage_internal_notes(tmp_path: Path):
    app = _fresh_app(f"sqlite:///{tmp_path}/test_admin_permissions.db")
    with TestClient(app) as client:
        _login(client, "admin@techkraft.local", "password123")
        candidate_list = client.get("/candidates")
        candidate_id = candidate_list.json()["items"][0]["id"]

        score_attempt = client.post(
            f"/candidates/{candidate_id}/scores",
            json={"category": "technical_skills", "score": 4, "note": "Should fail"},
        )
        assert score_attempt.status_code == 403

        update_notes = client.put(
            f"/candidates/{candidate_id}/internal-notes",
            json={"internal_notes": "Strong referral from engineering manager."},
        )
        assert update_notes.status_code == 200
        assert update_notes.json()["internal_notes"] is not None

        get_notes = client.get(f"/candidates/{candidate_id}/internal-notes")
        assert get_notes.status_code == 200
        assert get_notes.json()["internal_notes"] == "Strong referral from engineering manager."

        delete_notes = client.delete(f"/candidates/{candidate_id}/internal-notes")
        assert delete_notes.status_code == 200
        assert delete_notes.json()["internal_notes"] is None


def test_reviewer_can_update_and_delete_own_score(tmp_path: Path):
    app = _fresh_app(f"sqlite:///{tmp_path}/test_score_update_delete.db")
    with TestClient(app) as client:
        _login_reviewer_and_change_password(client, "reviewer@techkraft.local", "password123", "newpassword123")
        candidate_id = client.get("/candidates", params={"status": "new"}).json()["items"][0]["id"]

        created = client.post(
            f"/candidates/{candidate_id}/scores",
            json={"category": "technical_skills", "score": 3, "note": "Initial"},
        )
        assert created.status_code == 201
        score_id = created.json()["id"]

        updated = client.put(
            f"/candidates/{candidate_id}/scores/{score_id}",
            json={"score": 5, "note": "Improved after follow-up"},
        )
        assert updated.status_code == 200
        assert updated.json()["score"] == 5

        deleted = client.delete(f"/candidates/{candidate_id}/scores/{score_id}")
        assert deleted.status_code == 204


def test_admin_can_soft_delete_candidate_but_reviewer_cannot(tmp_path: Path):
    app = _fresh_app(f"sqlite:///{tmp_path}/test_candidate_soft_delete.db")
    with TestClient(app) as client:
        _login(client, "admin@techkraft.local", "password123")
        candidate_id = client.get("/candidates").json()["items"][0]["id"]

        archived = client.delete(f"/candidates/{candidate_id}")
        assert archived.status_code == 200
        assert archived.json()["status"] == "archived"

        client.post("/auth/logout")
        _login_reviewer_and_change_password(client, "reviewer@techkraft.local", "password123", "newpassword123")
        denied = client.delete(f"/candidates/{candidate_id}")
        assert denied.status_code == 403


def test_admin_can_update_candidate_status(tmp_path: Path):
    app = _fresh_app(f"sqlite:///{tmp_path}/test_status_update.db")
    with TestClient(app) as client:
        _login(client, "admin@techkraft.local", "password123")
        candidate_id = client.get("/candidates", params={"status": "new"}).json()["items"][0]["id"]

        updated = client.patch(f"/candidates/{candidate_id}/status", json={"status": "reviewed"})
        assert updated.status_code == 200
        assert updated.json()["status"] == "reviewed"

        client.post("/auth/logout")
        _login_reviewer_and_change_password(client, "reviewer@techkraft.local", "password123", "newpassword123")
        forbidden = client.patch(f"/candidates/{candidate_id}/status", json={"status": "hired"})
        assert forbidden.status_code == 403


def test_archived_candidate_cannot_receive_new_or_updated_scores(tmp_path: Path):
    app = _fresh_app(f"sqlite:///{tmp_path}/test_archived_score_guard.db")
    with TestClient(app) as client:
        _login(client, "admin@techkraft.local", "password123")
        candidate_id = client.get("/candidates").json()["items"][0]["id"]
        archived = client.delete(f"/candidates/{candidate_id}")
        assert archived.status_code == 200

        client.post("/auth/logout")
        _login_reviewer_and_change_password(client, "reviewer@techkraft.local", "password123", "newpassword123")

        create_attempt = client.post(
            f"/candidates/{candidate_id}/scores",
            json={"category": "technical_skills", "score": 4, "note": "Should fail"},
        )
        assert create_attempt.status_code == 409

        client.post("/auth/logout")
        _login(client, "admin@techkraft.local", "password123")
        active_candidate_id = client.get("/candidates", params={"status": "new"}).json()["items"][0]["id"]
        client.post("/auth/logout")
        _login(client, "reviewer@techkraft.local", "newpassword123")
        created = client.post(
            f"/candidates/{active_candidate_id}/scores",
            json={"category": "communication", "score": 3, "note": "Initial"},
        )
        assert created.status_code == 201
        score_id = created.json()["id"]

        client.post("/auth/logout")
        _login(client, "admin@techkraft.local", "password123")
        client.delete(f"/candidates/{active_candidate_id}")
        client.post("/auth/logout")
        _login(client, "reviewer@techkraft.local", "newpassword123")

        update_attempt = client.put(
            f"/candidates/{active_candidate_id}/scores/{score_id}",
            json={"score": 5, "note": "Should fail after archive"},
        )
        assert update_attempt.status_code == 409


def test_change_password_requires_current_password_and_allows_relogin(tmp_path: Path):
    app = _fresh_app(f"sqlite:///{tmp_path}/test_change_password.db")
    with TestClient(app) as client:
        _login(client, "reviewer@techkraft.local", "password123")

        wrong_current = client.post(
            "/auth/change-password",
            json={"current_password": "wrong-pass", "new_password": "newpassword123"},
        )
        assert wrong_current.status_code == 400

        changed = client.post(
            "/auth/change-password",
            json={"current_password": "password123", "new_password": "newpassword123"},
        )
        assert changed.status_code == 200

        client.post("/auth/logout")
        old_login = client.post("/auth/login", json={"email": "reviewer@techkraft.local", "password": "password123"})
        assert old_login.status_code == 401

        new_login = client.post("/auth/login", json={"email": "reviewer@techkraft.local", "password": "newpassword123"})
        assert new_login.status_code == 200


def test_archived_or_deleted_staff_cannot_login_and_scores_hidden(tmp_path: Path):
    app = _fresh_app(f"sqlite:///{tmp_path}/test_staff_archive_delete.db")
    with TestClient(app) as client:
        _login(client, "reviewer@techkraft.local", "password123")
        client.post(
            "/auth/change-password",
            json={"current_password": "password123", "new_password": "newpassword123"},
        )
        candidate_id = client.get("/candidates", params={"status": "new"}).json()["items"][0]["id"]
        created = client.post(
            f"/candidates/{candidate_id}/scores",
            json={"category": "technical_skills", "score": 4, "note": "to be hidden"},
        )
        assert created.status_code == 201

        client.post("/auth/logout")
        _login(client, "admin@techkraft.local", "password123")
        staff = client.get("/auth/staff")
        assert staff.status_code == 200
        reviewer = next(item for item in staff.json()["items"] if item["email"] == "reviewer@techkraft.local")

        archived = client.patch(f"/auth/staff/{reviewer['id']}/archive")
        assert archived.status_code == 200
        assert archived.json()["active"] is False

        unarchived = client.patch(f"/auth/staff/{reviewer['id']}/unarchive")
        assert unarchived.status_code == 200
        assert unarchived.json()["active"] is True

        archived_again = client.patch(f"/auth/staff/{reviewer['id']}/archive")
        assert archived_again.status_code == 200
        assert archived_again.json()["active"] is False

        detail_after_archive = client.get(f"/candidates/{candidate_id}")
        assert detail_after_archive.status_code == 200
        assert len(detail_after_archive.json()["scores"]) == 0

        client.post("/auth/logout")
        archived_login = client.post(
            "/auth/login",
            json={"email": "reviewer@techkraft.local", "password": "newpassword123"},
        )
        assert archived_login.status_code == 403

        _login(client, "admin@techkraft.local", "password123")
        deleted = client.delete(f"/auth/staff/{reviewer['id']}")
        assert deleted.status_code == 200
        assert deleted.json()["deleted_at"] is not None


def test_reviewer_must_change_password_before_accessing_app(tmp_path: Path):
    app = _fresh_app(f"sqlite:///{tmp_path}/test_force_password_change.db")
    with TestClient(app) as client:
        login = client.post(
            "/auth/login",
            json={"email": "reviewer@techkraft.local", "password": "password123"},
        )
        assert login.status_code == 200

        me = client.get("/auth/me")
        assert me.status_code == 200
        assert me.json()["force_password_change"] is True

        blocked = client.get("/candidates")
        assert blocked.status_code == 403
        assert blocked.json()["detail"] == "Password change required"

        changed = client.post(
            "/auth/change-password",
            json={"current_password": "password123", "new_password": "newpassword123"},
        )
        assert changed.status_code == 200

        allowed = client.get("/candidates")
        assert allowed.status_code == 200
