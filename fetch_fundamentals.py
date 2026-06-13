import asyncio
import aiosqlite
import yfinance as yf
import time

async def fetch_single_ticker(ticker, db, semaphore):
    # The bouncer: wait here until there is an open spot (max 10 at a time)
    async with semaphore:
        try:
            # Throw the blocking yfinance network call into a background thread
            def get_info():
                return yf.Ticker(ticker).info
            
            info = await asyncio.to_thread(get_info)
            
            de_ratio = info.get('debtToEquity', 100.0) 
            margin = info.get('profitMargins', 0.05)
            
            # Update the database for this specific ticker
            await db.execute('''
                UPDATE universe 
                SET debt_to_equity = ?, profit_margin = ? 
                WHERE ticker = ?
            ''', (de_ratio, margin, ticker))
            await db.commit()
            
        except Exception as e:
            print(f"Skipped {ticker} due to error: {e}")

async def update_fundamentals():
    print("Starting background fundamental data fetch...")
    
    async with aiosqlite.connect('quant_engine.db') as db:
        db.row_factory = aiosqlite.Row
        
        async with db.execute("SELECT ticker FROM universe WHERE is_active = 1") as cursor:
            tickers = [row["ticker"] for row in await cursor.fetchall()]

        print(f"Fetching data for {len(tickers)} stocks using a Semaphore (10 at a time).")
        
        # Create our bouncer (allow 10 concurrent connections)
        semaphore = asyncio.Semaphore(10)
        
        # Create a massive list of 500 tasks
        tasks = [fetch_single_ticker(ticker, db, semaphore) for ticker in tickers]
        
        # Run all tasks concurrently
        await asyncio.gather(*tasks)
                
    print("Fundamental update complete!")

if __name__ == '__main__':
    asyncio.run(update_fundamentals())