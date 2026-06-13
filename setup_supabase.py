import sqlite3
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def migrate_data():
    if not DATABASE_URL:
        print("❌ Please set DATABASE_URL in your .env file")
        return
        
    print("Connecting to Supabase PostgreSQL...")
    pg_conn = await asyncpg.connect(DATABASE_URL)
    
    # 1. Create tables in PostgreSQL
    print("Creating tables in PostgreSQL...")
    await pg_conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            hashed_password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS universe (
            id SERIAL PRIMARY KEY,
            ticker VARCHAR(20) UNIQUE NOT NULL,
            name VARCHAR(255),
            industry VARCHAR(100),
            is_active BOOLEAN DEFAULT TRUE,
            debt_to_equity FLOAT,
            profit_margin FLOAT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS portfolios (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            ticker VARCHAR(20) NOT NULL,
            shares INTEGER NOT NULL,
            buy_price FLOAT NOT NULL,
            allocated_capital FLOAT NOT NULL,
            trade_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # 2. Connect to local SQLite
    print("Connecting to local SQLite database...")
    sqlite_conn = sqlite3.connect("quant_engine.db")
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.cursor()
    
    # 3. Migrate Users
    print("Migrating users...")
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    for u in users:
        try:
            await pg_conn.execute(
                "INSERT INTO users (id, email, hashed_password) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
                u["id"], u["email"], u["hashed_password"]
            )
        except Exception as e:
            print(f"User error: {e}")
            
    # Update user sequence
    await pg_conn.execute("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))")
            
    # 4. Migrate Universe
    print("Migrating universe...")
    cursor.execute("SELECT * FROM universe")
    universe = cursor.fetchall()
    for uni in universe:
        try:
            de = uni["debt_to_equity"] if "debt_to_equity" in uni.keys() else 100.0
            pm = uni["profit_margin"] if "profit_margin" in uni.keys() else 0.05
            await pg_conn.execute(
                """INSERT INTO universe (ticker, name, industry, is_active, debt_to_equity, profit_margin) 
                   VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (ticker) DO NOTHING""",
                uni["ticker"], uni["name"], uni["industry"], bool(uni["is_active"]), 
                de, pm
            )
        except Exception as e:
            print(f"Universe error: {e}")
            
    await pg_conn.execute("SELECT setval('universe_id_seq', (SELECT MAX(id) FROM universe))")
            
    # 5. Migrate Portfolios
    print("Migrating portfolios...")
    cursor.execute("SELECT * FROM portfolios")
    portfolios = cursor.fetchall()
    for p in portfolios:
        try:
            await pg_conn.execute(
                """INSERT INTO portfolios (id, user_id, ticker, shares, buy_price, allocated_capital) 
                   VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING""",
                p["id"], p["user_id"], p["ticker"], p["shares"], p["buy_price"], p["allocated_capital"]
            )
        except Exception as e:
            print(f"Portfolio error: {e}")
            
    await pg_conn.execute("SELECT setval('portfolios_id_seq', (SELECT MAX(id) FROM portfolios))")
            
    print("Migration to Supabase complete!")
    await pg_conn.close()
    sqlite_conn.close()

if __name__ == "__main__":
    asyncio.run(migrate_data())
