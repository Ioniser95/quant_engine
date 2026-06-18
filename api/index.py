from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from api.core.database import init_db_pool, close_db_pool
from api.routers import auth, portfolio, scanner, ws
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db_pool()
    poll_task = asyncio.create_task(ws.poll_prices_loop())
    yield
    poll_task.cancel()
    await close_db_pool()

app = FastAPI(title="Quant Risk Engine API", version="1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(portfolio.router)
app.include_router(scanner.router)
app.include_router(ws.router)

@app.get("/")
def read_root():
    return {"message": "Quant Engine API is live on Vercel."}
