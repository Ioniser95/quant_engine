import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

# We will expect a Supabase Postgres connection string in the .env file.
# Format: postgresql://postgres.[project]:[password]@aws-0-region.pooler.supabase.com:6543/postgres
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/quant_engine")

pool = None

async def init_db_pool():
    global pool
    try:
        pool = await asyncpg.create_pool(
            DATABASE_URL,
            statement_cache_size=0
        )
        print("Database connection pool created successfully")
    except Exception as e:
        print(f"Failed to connect to database: {e}")

async def close_db_pool():
    global pool
    if pool:
        await pool.close()
        print("Database connection pool closed")

from fastapi import HTTPException
async def get_db():
    global pool
    if not pool:
        try:
            await init_db_pool()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DB Init Error: {str(e)}")
        if not pool:
            raise HTTPException(status_code=500, detail="Database pool failed to initialize")
    try:
        async with pool.acquire() as conn:
            yield conn
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB Acquire Error: {str(e)}")
