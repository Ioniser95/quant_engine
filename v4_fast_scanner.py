import yfinance as yf
import pandas as pd
import numpy as np
import concurrent.futures
import time


TARGET_STOCKS = [
    "ETERNAL.NS", "ATGL.NS", "DCXINDIA.NS", "RELIANCE.NS", "HDFCBANK.NS",
    "ZOMATO.NS", "AETHER.NS", "TCS.NS", "ICICIBANK.NS", "BHARTIARTL.NS",
    "SBIN.NS", "INFY.NS", "LICI.NS", "ITC.NS", "HINDUNILVR.NS",
    "LT.NS", "BAJFINANCE.NS", "HCLTECH.NS", "MARUTI.NS", "SUNPHARMA.NS",
    "TMPV.NS", "TATASTEEL.NS", "ASIANPAINT.NS", "KOTAKBANK.NS", "TITAN.NS"
]

def get_fundamental_score(ticker_obj):
    try:
        info = ticker_obj.info
        de_ratio = info.get('debtToEquity', 100) / 100 
        de_score = (de_ratio / 2.0) * 100 
        margin = info.get('profitMargins', 0.05)
        margin_score = 100 - (margin * 100 * 2) 
        
        fundamental_risk = (0.6 * de_score) + (0.4 * margin_score)
        return np.clip(fundamental_risk, 0, 100)
    except:
        return 50 

def process_single_stock(ticker):
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
        fundamental_risk = get_fundamental_score(t)
        
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
    print(f"Igniting V4 Multi-Threaded Engine for {len(TARGET_STOCKS)} stocks...")
    print("-" * 60)
    
    # Start the stopwatch!
    start_time = time.time()
    
    results = []
    
    # THE MAGIC: Spin up 10 concurrent worker threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        # Map our list of stocks to the worker threads
        future_to_stock = {executor.submit(process_single_stock, stock): stock for stock in TARGET_STOCKS}
        
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