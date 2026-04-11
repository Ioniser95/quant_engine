import sqlite3

def setup_user_tables():
    # Connect to your existing SQLite database
    conn = sqlite3.connect("quant_engine.db")
    cursor = conn.cursor()

    # Table 1: The Users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Table 2: The Paper Trading Portfolios (Linked to the User)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS portfolios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ticker TEXT NOT NULL,
        shares INTEGER NOT NULL,
        buy_price REAL NOT NULL,
        allocated_capital REAL NOT NULL,
        trade_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    """)

    conn.commit()
    conn.close()
    print("✅ User and Portfolio tables successfully added to quant_engine.db!")

if __name__ == "__main__":
    setup_user_tables()