from fastapi import FastAPI, Query
import jwt
from datetime import datetime, timedelta, timezone
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
import yfinance as yf
import pandas as pd
import numpy as np
import concurrent.futures
import aiosqlite
import sqlite3
#Security Import (For Future Use)
from pydantic import BaseModel
from passlib.context import CryptContext
# Initialize the API Server
app = FastAPI(title="Quant Risk Engine API", version="1.0")
# --- SECURITY CONFIGURATION ---
import bcrypt
# --- SECURITY & JWT CONFIGURATION ---
import bcrypt

SECRET_KEY = "super-secret-quant-engine-key"  # In a real app, this goes in a hidden .env file!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # VIP pass expires in 1 hour

def create_access_token(data: dict):
    """Creates a secure JWT (VIP Pass) for a logged-in user."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checks if the typed password matches the scrambled one in the DB."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
def get_password_hash(password: str) -> str:
    """Takes a plain password and returns a scrambled, secure hash."""
    # bcrypt requires bytes, so we encode the string first
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    
    # Decode back to a string so it can be saved in SQLite
    return hashed_password.decode('utf-8')

# --- PYDANTIC MODELS ---
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str
# Security Configuration: Allow the React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    try:
        t = yf.Ticker(ticker)
        data = t.history(period="1y")
        
        if data.empty: return None
        
        returns = data['Close'].pct_change()
        vol = (returns.rolling(20).std() * np.sqrt(252)).iloc[-1]
        dd = ((data['Close'] / data['Close'].rolling(252, min_periods=1).max()) - 1).iloc[-1]
        
        price_risk = np.clip(((vol/0.4)*50) + (abs(dd/0.3)*50), 0, 100)
        fundamental_risk = get_fundamental_score(t)
        master_score = (0.5 * price_risk) + (0.5 * fundamental_risk)
        
        return {
            "Ticker": ticker.replace(".NS", ""),
            "Risk": round(master_score, 2),
            "Price_Risk": round(price_risk, 2),
            "Fund_Risk": round(fundamental_risk, 2)
        }
    except Exception as e:
        return None

# --- API ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "Quant Engine API is live."}

@app.get("/api/universe")
async def get_active_universe():
    """Fetches the NIFTY 500 universe from the local SQLite database."""
    async with aiosqlite.connect('quant_engine.db') as db:
        db.row_factory = aiosqlite.Row 
        async with db.execute("SELECT ticker, name, industry FROM universe WHERE is_active = 1") as cursor:
            rows = await cursor.fetchall()
            universe = [{"ticker": row["ticker"], "name": row["name"], "industry": row["industry"]} for row in rows]
            return {"count": len(universe), "universe": universe}

@app.get("/api/scan/bulk")
async def scan_market_bulk(tickers: str = Query(..., description="Comma-separated tickers")):
    ticker_list = [t.strip().upper() for t in tickers.split(",")]
    
    # --- NEW: Fetch Fundamentals from DB instantly ---
    fundamentals_map = {}
    async with aiosqlite.connect('quant_engine.db') as db:
        db.row_factory = aiosqlite.Row
        
        # We dynamically build the SQL query to only fetch the requested tickers
        placeholders = ','.join('?' for _ in ticker_list)
        query = f"SELECT ticker, debt_to_equity, profit_margin FROM universe WHERE ticker IN ({placeholders})"
        
        async with db.execute(query, ticker_list) as cursor:
            rows = await cursor.fetchall()
            for row in rows:
                fundamentals_map[row["ticker"]] = {
                    "de": row["debt_to_equity"],
                    "margin": row["profit_margin"]
                }
    # -------------------------------------------------

    # Vectorized Price Download (Unchanged)
    df = yf.download(ticker_list, period="1y", progress=False)
    if df.empty: return {"status": "error", "message": "Failed to fetch data"}

    closes = df['Close']
    returns = closes.pct_change()
    
    vols = returns.rolling(window=20).std() * np.sqrt(252)
    latest_vols = vols.iloc[-1]
    
    rolling_max = closes.rolling(window=252, min_periods=1).max()
    drawdowns = (closes / rolling_max) - 1
    latest_dds = drawdowns.iloc[-1]
    
    results = []
    for ticker in ticker_list:
        try:
            vol = latest_vols.get(ticker, 0)
            dd = latest_dds.get(ticker, 0)
            
            if pd.isna(vol) or pd.isna(dd): continue
                
            price_risk = np.clip(((vol/0.4)*50) + (abs(dd/0.3)*50), 0, 100)
            
            # --- NEW: Calculate Fundamental Risk using cached DB data ---
            fund_data = fundamentals_map.get(ticker, {"de": 100.0, "margin": 0.05})
            
            de_score = (fund_data["de"] / 200.0) * 100 # Adjusted denominator based on Yahoo's format
            margin_score = 100 - (fund_data["margin"] * 100 * 2)
            fundamental_risk = np.clip((0.6 * de_score) + (0.4 * margin_score), 0, 100)
            # ------------------------------------------------------------
            
            master_score = (0.5 * price_risk) + (0.5 * fundamental_risk)
            
            results.append({
                "Ticker": ticker.replace(".NS", ""),
                "Risk": round(master_score, 2),
                "Price_Risk": round(price_risk, 2),
                "Fund_Risk": round(fundamental_risk, 2)
            })
        except Exception as e:
            continue

    sorted_results = sorted(results, key=lambda x: x["Risk"])
    return {"status": "success", "scanned_count": len(sorted_results), "data": sorted_results}

# --- USER AUTHENTICATION ROUTES ---
@app.post("/api/auth/login")
async def login_user(user: UserLogin):
    conn = sqlite3.connect("quant_engine.db")
    cursor = conn.cursor()
    
    try:
        # 1. Hunt for the user by email
        cursor.execute("SELECT id, hashed_password FROM users WHERE email = ?", (user.email,))
        db_user = cursor.fetchone()
        
        # 2. If user doesn't exist OR password math fails, kick them out
        if not db_user or not verify_password(user.password, db_user[1]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
            
        # 3. Success! Generate the JWT VIP Pass
        user_id = db_user[0]
        access_token = create_access_token(data={"sub": user.email, "user_id": user_id})
        
        return {
            "status": "success",
            "access_token": access_token, 
            "token_type": "bearer",
            "message": "Login successful. Welcome back to Quant Engine."
        }
        
    finally:
        conn.close()
@app.post("/api/auth/signup")
async def register_user(user: UserCreate):
    # 1. Scramble the password using bcrypt
    hashed_password = get_password_hash(user.password)
    
    # 2. Connect to our user database
    conn = sqlite3.connect("quant_engine.db")
    cursor = conn.cursor()
    
    try:
        # 3. Insert the new user
        cursor.execute(
            "INSERT INTO users (email, hashed_password) VALUES (?, ?)", 
            (user.email, hashed_password)
        )
        conn.commit()
        return {"status": "success", "message": "Investor profile created securely."}
        
    except sqlite3.IntegrityError:
        # If the email already exists in the DB, SQLite throws an IntegrityError
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
        
    finally:
        # Always close the vault door when you're done!
        conn.close()