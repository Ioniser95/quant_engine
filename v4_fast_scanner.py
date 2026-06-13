import yfinance as yf
import pandas as pd
import numpy as np
import concurrent.futures
import time
import sqlite3


def get_target_stocks_data():
    try:
        conn = sqlite3.connect('quant_engine.db')
        cursor = conn.cursor()
        cursor.execute("SELECT ticker, debt_to_equity, profit_margin FROM universe WHERE is_active = 1")
        # Returns a dictionary mapping ticker to its fundamental data
        stocks_data = {row[0]: {"de_ratio": row[1] if row[1] is not None else 100.0, 
                                "margin": row[2] if row[2] is not None else 0.05} 
                       for row in cursor.fetchall()}
        conn.close()
        return stocks_data
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return {}

TARGET_STOCKS_DATA = get_target_stocks_data()

def get_fundamental_score(de_ratio, margin):
    try:
        # Convert to the scale used in the math (assuming de_ratio is often returned as a raw number rather than percentage here)
        de_ratio_scaled = de_ratio / 100.0 if de_ratio > 10 else de_ratio
        de_score = (de_ratio_scaled / 2.0) * 100 
        margin_score = 100 - (margin * 100 * 2) 
        
        fundamental_risk = (0.6 * de_score) + (0.4 * margin_score)
        return np.clip(fundamental_risk, 0, 100)
    except:
        return 50 

def process_single_stock(ticker, fund_data):
    """This function is now designed to be run by an independent worker thread."""
    try:
        t = yf.Ticker(ticker)
        data = t.history(period="1y")
        
        if data.empty: 
            return None
        
        # Market Math
        returns = data['Close'].pct_change()
        vol = (returns.rolling(20).std() * np.sqrt(252)).iloc[-1]
        dd = ((data['Close'] / data['Close'].rolling(252, min_periods=1).max()) - 1).iloc[-1]
        
        price_risk = np.clip(((vol/0.4)*50) + (abs(dd/0.3)*50), 0, 100)
        
        # Fundamental Math
        fundamental_risk = get_fundamental_score(fund_data['de_ratio'], fund_data['margin'])
        
        # Master Score
        master_score = (0.5 * price_risk) + (0.5 * fundamental_risk)
        
        return {
            "Ticker": ticker.replace(".NS", ""),
            "Risk": round(master_score, 2),
            "Price_Risk": round(price_risk, 2),
            "Fund_Risk": round(fundamental_risk, 2)
        }
    except Exception as e:
        return None # If a thread fails, it silently dies without crashing the others

# --- MAIN EXECUTION PIPELINE ---
if __name__ == "__main__":
    print(f"Igniting V4 Multi-Threaded Engine for {len(TARGET_STOCKS_DATA)} stocks...")
    print("-" * 60)
    
    # Start the stopwatch!
    start_time = time.time()
    
    results = []
    
    # THE MAGIC: Spin up 10 concurrent worker threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        # Map our list of stocks to the worker threads
        future_to_stock = {executor.submit(process_single_stock, stock, fund_data): stock for stock, fund_data in TARGET_STOCKS_DATA.items()}
        
        # As each thread finishes its job, grab the result
        for future in concurrent.futures.as_completed(future_to_stock):
            result = future.result()
            if result:
                results.append(result)

    # Stop the stopwatch
    end_time = time.time()

    # Display Results
    df = pd.DataFrame(results).sort_values(by="Risk")
    print(df.to_string(index=False))
    print("-" * 60)
    
    # Print Performance Metrics
    print(f"✅ Successfully scanned {len(results)} stocks.")
    print(f"⚡ Execution Time: {round(end_time - start_time, 2)} seconds")
    print("=" * 60)