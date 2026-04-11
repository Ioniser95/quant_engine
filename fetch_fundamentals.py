import asyncio
import aiosqlite
import yfinance as yf
import time

async def update_fundamentals():
    print("Starting background fundamental data fetch...")
    
    async with aiosqlite.connect('quant_engine.db') as db:
        db.row_factory = aiosqlite.Row
        
        # Get all active tickers
        async with db.execute("SELECT ticker FROM universe WHERE is_active = 1") as cursor:
            rows = await cursor.fetchall()
            tickers = [row["ticker"] for row in rows]

        print(f"Fetching data for {len(tickers)} stocks. This will take a few minutes to avoid rate limits.")
        
        for idx, ticker in enumerate(tickers):
            try:
                # Add a small delay to prevent Yahoo from banning your IP
                time.sleep(0.5) 
                
                t = yf.Ticker(ticker)
                info = t.info
                
                de_ratio = info.get('debtToEquity', 100.0) 
                margin = info.get('profitMargins', 0.05)
                
                # Update the database for this specific ticker
                await db.execute('''
                    UPDATE universe 
                    SET debt_to_equity = ?, profit_margin = ? 
                    WHERE ticker = ?
                ''', (de_ratio, margin, ticker))
                await db.commit()
                
                if idx % 50 == 0 and idx > 0:
                    print(f"Processed {idx}/{len(tickers)} stocks...")
                    
            except Exception as e:
                print(f"Skipped {ticker} due to error: {e}")
                
    print("Fundamental update complete!")

if __name__ == '__main__':
    asyncio.run(update_fundamentals())