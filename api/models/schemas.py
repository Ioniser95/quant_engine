from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class ForgotPasswordReq(BaseModel):
    email: str

class ChangePasswordReq(BaseModel):
    email: str
    current_password: str
    new_password: str

class PortfolioRequest(BaseModel):
    capital: float = 10000.0
    risk_tolerance: str = "Medium"

class TradeReq(BaseModel):
    basket: list

class SellReq(BaseModel):
    ticker: str
    shares: int
