from fastapi import APIRouter, HTTPException, Depends
from api.models.schemas import UserCreate, UserLogin, ForgotPasswordReq, ChangePasswordReq
from api.core.security import get_password_hash, verify_password, create_access_token, get_current_user
from api.core.database import get_db
import string
import random
import resend
import asyncpg

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup")
async def register_user(user: UserCreate, db: asyncpg.Connection = Depends(get_db)):
    hashed_password = get_password_hash(user.password)
    try:
        await db.execute(
            "INSERT INTO users (email, hashed_password) VALUES ($1, $2)",
            user.email, hashed_password
        )
        return {"status": "success", "message": "Investor profile created securely."}
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

@router.post("/login")
async def login_user(user: UserLogin, db: asyncpg.Connection = Depends(get_db)):
    record = await db.fetchrow("SELECT id, hashed_password FROM users WHERE email = $1", user.email)
    
    if not record or not verify_password(user.password, record["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    access_token = create_access_token(data={"sub": user.email, "user_id": record["id"]})
    return {
        "status": "success",
        "access_token": access_token, 
        "token_type": "bearer",
        "message": "Login successful. Welcome back to Quant Engine."
    }

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordReq, db: asyncpg.Connection = Depends(get_db)):
    record = await db.fetchrow("SELECT id FROM users WHERE email = $1", req.email)
    if not record:
        raise HTTPException(status_code=404, detail="Email not found.")
        
    chars = string.ascii_letters + string.digits
    new_password = ''.join(random.choice(chars) for _ in range(8))
    hashed_password = get_password_hash(new_password)
    
    await db.execute("UPDATE users SET hashed_password = $1 WHERE email = $2", hashed_password, req.email)
    
    resend.api_key = "re_XJW8TeEk_JSSvsB8y95j6cj1mMJuhyAXz"
    try:
        resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": req.email,
            "subject": "QuantEngine: Your Temporary Password",
            "html": f"""
            <div style="font-family: sans-serif; padding: 20px;">
                <h2 style="color: #333;">Password Reset</h2>
                <p>Your password has been reset. Your temporary password is:</p>
                <h1 style="color: #6366f1; letter-spacing: 2px;">{new_password}</h1>
                <p>Please log in and change your password immediately.</p>
                <p>- QuantEngine Team</p>
            </div>
            """
        })
    except Exception as e:
        print(f"Failed to send email: {e}")

    return {
        "status": "success", 
        "message": "Password reset! An email has been sent with your temporary password."
    }

@router.post("/change-password")
async def change_password(req: ChangePasswordReq, db: asyncpg.Connection = Depends(get_db)):
    record = await db.fetchrow("SELECT hashed_password FROM users WHERE email = $1", req.email)
    if not record or not verify_password(req.current_password, record["hashed_password"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
        
    new_hashed = get_password_hash(req.new_password)
    await db.execute("UPDATE users SET hashed_password = $1 WHERE email = $2", new_hashed, req.email)
    
    return {"status": "success", "message": "Password updated successfully."}
