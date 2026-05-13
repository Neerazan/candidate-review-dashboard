from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.auth import router as auth_router
from app.routers.candidates import router as candidates_router
from app.seed import seed_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    seed_database()
    yield


app = FastAPI(title="Candidate Review API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(candidates_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
