import os
from contextlib import asynccontextmanager
from uuid import uuid4
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from .database import engine, AsyncSessionLocal, Base
from .models import User
from .auth import get_password_hash
from .routers.auth import router as auth_router
from .routers.candidates import router as candidates_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("./data", exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == "admin@techkraft.com"))
        if not existing.scalar_one_or_none():
            admin = User(
                id=str(uuid4()),
                email="admin@techkraft.com",
                hashed_password=get_password_hash("Admin1234!"),
                role="admin",
            )
            db.add(admin)
            await db.commit()
    yield


app = FastAPI(title="TechKraft Candidate Dashboard", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(candidates_router, prefix="/candidates", tags=["candidates"])


@app.get("/health")
async def health():
    return {"status": "ok"}
