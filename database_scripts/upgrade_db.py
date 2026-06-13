import asyncio
import aiosqlite

async def upgrade():
    async with aiosqlite.connect('quant_engine.db') as db:
        try:
            # Add the new columns
            await db.execute("ALTER TABLE universe ADD COLUMN debt_to_equity REAL DEFAULT 100.0;")
            await db.execute("ALTER TABLE universe ADD COLUMN profit_margin REAL DEFAULT 0.05;")
            await db.commit()
            print("Database upgraded successfully! Added fundamental columns.")
        except Exception as e:
            print(f"Error (columns might already exist): {e}")

if __name__ == '__main__':
    asyncio.run(upgrade())