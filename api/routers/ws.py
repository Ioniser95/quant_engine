import asyncio
import jwt
import pandas as pd
import yfinance as yf
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, List
from api.core.security import SECRET_KEY, ALGORITHM
import api.core.database as db

router = APIRouter(prefix="/api/ws", tags=["websocket"])

class ConnectionManager:
    def __init__(self):
        # Maps user_id to list of active WebSockets
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()

@router.websocket("/portfolio")
async def websocket_portfolio(websocket: WebSocket, token: str = Query(None)):
    if not token:
        await websocket.close(code=1008)
        return
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            await websocket.close(code=1008)
            return
    except jwt.PyJWTError:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive, listen for any messages
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception:
        manager.disconnect(websocket, user_id)

async def poll_prices_loop():
    """Background task to fetch prices and broadcast to connected users."""
    print("Started WebSocket background polling loop.")
    
    while True:
        try:
            # Only poll if we have connected users
            if not manager.active_connections:
                await asyncio.sleep(5)
                continue
            
            if not db.pool:
                await asyncio.sleep(5)
                continue
                
            user_ids = list(manager.active_connections.keys())
            
            rows = await db.pool.fetch(
                "SELECT DISTINCT user_id, ticker FROM portfolios WHERE user_id = ANY($1) AND shares > 0",
                user_ids
            )
            
            if not rows:
                await asyncio.sleep(5)
                continue
                
            # Map tickers to users who need them
            ticker_to_users = {}
            for r in rows:
                t = r["ticker"]
                uid = r["user_id"]
                if t not in ticker_to_users:
                    ticker_to_users[t] = []
                ticker_to_users[t].append(uid)
                
            all_tickers = list(ticker_to_users.keys())
            yf_tickers = [t + ".NS" for t in all_tickers]
            
            # Download live prices
            try:
                data = yf.download(yf_tickers, period="1d", interval="1m", progress=False)["Close"]
                latest_prices = {}
                if len(yf_tickers) == 1:
                    latest_prices[all_tickers[0]] = float(data.iloc[-1])
                else:
                    for t in all_tickers:
                        val = data.iloc[-1][f"{t}.NS"]
                        if not pd.isna(val):
                            latest_prices[t] = float(val)
            except Exception as e:
                print(f"WS YF Fetch Error: {e}")
                latest_prices = {}
                
            if latest_prices:
                user_payloads = {uid: {} for uid in user_ids}
                for t, price in latest_prices.items():
                    for uid in ticker_to_users.get(t, []):
                        user_payloads[uid][t] = price
                        
                for uid, payload in user_payloads.items():
                    if payload:
                        await manager.send_personal_message({"type": "price_update", "prices": payload}, uid)
                        
        except Exception as e:
            print(f"WS Polling Loop Error: {e}")
            
        # Poll every 5 seconds to stay within Yahoo limits while appearing real-time
        await asyncio.sleep(5)
