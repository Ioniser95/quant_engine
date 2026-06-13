import asyncio
import aiosqlite
import pandas as pd
import requests
import io

def fetch_nifty_500():
    url = "https://archives.nseindia.com/content/indices/ind_nifty500list.csv"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
    
    res = requests.get(url, headers=headers, timeout=10)
    df = pd.read_csv(io.StringIO(res.text))
    
    df = df[['Symbol', 'Company Name', 'Industry']].copy()
    df.columns = ['ticker', 'name', 'industry']
    df['ticker'] = df['ticker'] + '.NS'
    
    return df

async def setup_db():
    print("Connecting to SQLite...")
    # This automatically creates 'quant_engine.db' in your current directory
    async with aiosqlite.connect('quant_engine.db') as db:
        print("Creating table...")
        await db.execute('''
            CREATE TABLE IF NOT EXISTS universe (
                ticker TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                industry TEXT,
                is_active INTEGER DEFAULT 1,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        
        print("Fetching NIFTY 500...")
        df = fetch_nifty_500()
        records = df.to_records(index=False)
        data = list(records)
        
        print("Executing bulk upsert...")
        # SQLite uses ? instead of $1, $2 for placeholders
        await db.executemany('''
            INSERT INTO universe (ticker, name, industry)
            VALUES (?, ?, ?)
            ON CONFLICT(ticker) DO UPDATE SET 
                last_updated = CURRENT_TIMESTAMP;
        ''', data)
        
        await db.commit()
        print("Success! NIFTY 500 loaded into quant_engine.db.")

if __name__ == '__main__':
    asyncio.run(setup_db())