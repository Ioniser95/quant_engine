import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def upgrade_db():
    print("Connecting to Supabase PostgreSQL...")
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    
    print("Adding cash_balance to users table...")
    await conn.execute("""
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS cash_balance FLOAT DEFAULT 1000000.0;
    """)
    
    print("Database upgrade complete! All users now have a wallet.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(upgrade_db())
