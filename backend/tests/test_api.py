from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.auth import get_password_hash
from app.database import Base, get_db
from app.main import app
from app.models import User

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def get_admin_token(client: AsyncClient) -> str:
    async with TestSessionLocal() as db:
        admin = User(
            id=str(uuid4()),
            email="admin@techkraft.com",
            hashed_password=get_password_hash("Admin1234!"),
            role="admin",
        )
        db.add(admin)
        await db.commit()

    resp = await client.post(
        "/auth/login",
        data={"username": "admin@techkraft.com", "password": "Admin1234!"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_create_and_get_candidate():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_admin_token(client)
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "name": "Alice Smith",
            "email": "alice@example.com",
            "role_applied": "Backend Engineer",
            "skills": ["Python", "FastAPI"],
            "internal_notes": "Strong candidate",
        }
        create_resp = await client.post("/candidates/", json=payload, headers=headers)
        assert create_resp.status_code in (200, 201)
        candidate_id = create_resp.json()["id"]

        get_resp = await client.get(f"/candidates/{candidate_id}", headers=headers)
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["name"] == "Alice Smith"
        assert data["email"] == "alice@example.com"
        assert data["role_applied"] == "Backend Engineer"


@pytest.mark.asyncio
async def test_reviewer_cannot_see_other_reviewer_scores():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token_a_resp = await client.post(
            "/auth/register", json={"email": "reviewer_a@example.com", "password": "pass1234"}
        )
        assert token_a_resp.status_code == 201

        login_a = await client.post(
            "/auth/login",
            data={"username": "reviewer_a@example.com", "password": "pass1234"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token_a = login_a.json()["access_token"]
        me_a = await client.get("/auth/me", headers={"Authorization": f"Bearer {token_a}"})
        reviewer_a_id = me_a.json()["id"]

        token_b_resp = await client.post(
            "/auth/register", json={"email": "reviewer_b@example.com", "password": "pass1234"}
        )
        assert token_b_resp.status_code == 201

        login_b = await client.post(
            "/auth/login",
            data={"username": "reviewer_b@example.com", "password": "pass1234"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token_b = login_b.json()["access_token"]

        admin_token = await get_admin_token(client)
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_resp = await client.post(
            "/candidates/",
            json={"name": "Bob Jones", "email": "bob@example.com", "role_applied": "QA", "skills": []},
            headers=admin_headers,
        )
        candidate_id = create_resp.json()["id"]

        await client.post(
            f"/candidates/{candidate_id}/scores",
            json={"category": "Technical", "score": 4},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        await client.post(
            f"/candidates/{candidate_id}/scores",
            json={"category": "Technical", "score": 3},
            headers={"Authorization": f"Bearer {token_b}"},
        )

        get_resp = await client.get(
            f"/candidates/{candidate_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert get_resp.status_code == 200
        scores = get_resp.json()["scores"]
        assert len(scores) == 1
        assert scores[0]["reviewer_id"] == reviewer_a_id


@pytest.mark.asyncio
async def test_registration_ignores_role_field():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        reg_resp = await client.post(
            "/auth/register",
            json={"email": "hacker@x.com", "password": "pass123", "role": "admin"},
        )
        assert reg_resp.status_code == 201

        login_resp = await client.post(
            "/auth/login",
            data={"username": "hacker@x.com", "password": "pass123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        me_resp = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["role"] == "reviewer"
