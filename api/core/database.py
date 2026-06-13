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
        pool = await asyncpg.create_pool(DATABASE_URL)
        print("Database connection pool created successfully")
    except Exception as e:
        print(f"Failed to connect to database: {e}")

async def close_db_pool():
    global pool
    if pool:
        await pool.close()
        print("✅ Database connection pool closed")

async def get_db():
    global pool
    if not pool:
        await init_db_pool()
        if not pool:
            raise Exception("Database pool failed to initialize")
    async with pool.acquire() as conn:
        yield conn
