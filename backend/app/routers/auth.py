import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from app.models.schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from app.services.auth import hash_password, verify_password, create_access_token, decode_access_token
from app.database import db_manager

router = APIRouter(prefix="/api/auth", tags=["auth"])

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Helper dependency to extract current user from Authorization header if present."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None

    if db_manager.is_connected and db_manager.users is not None:
        from bson import ObjectId
        try:
            user = db_manager.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            user = db_manager.users.find_one({"_id": user_id})
        if user:
            user["id"] = str(user["_id"])
            return user
    else:
        user = db_manager._in_memory_users.get(user_id)
        if user:
            return user
    return None

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister):
    """Registers a new user account, strictly hashing the password with bcrypt."""
    email_clean = user_in.email.strip().lower()
    username_clean = user_in.username.strip()

    # Check for existing user
    if db_manager.is_connected and db_manager.users is not None:
        if db_manager.users.find_one({"$or": [{"email": email_clean}, {"username": username_clean}]}):
            raise HTTPException(status_code=400, detail="Username or email is already registered.")
    else:
        for u in db_manager._in_memory_users.values():
            if u["email"] == email_clean or u["username"] == username_clean:
                raise HTTPException(status_code=400, detail="Username or email is already registered.")

    # Securely hash password with bcrypt
    hashed_pwd = hash_password(user_in.password)
    user_doc = {
        "username": username_clean,
        "email": email_clean,
        "password_hash": hashed_pwd,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    if db_manager.is_connected and db_manager.users is not None:
        res = db_manager.users.insert_one(user_doc)
        user_id = str(res.inserted_id)
    else:
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        user_doc["id"] = user_id
        db_manager._in_memory_users[user_id] = user_doc

    token = create_access_token({"sub": user_id, "username": username_clean})
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            username=username_clean,
            email=email_clean,
            created_at=user_doc["created_at"]
        )
    )

@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin):
    """Authenticates user with email/username and password."""
    query_str = login_in.username_or_email.strip().lower()

    target_user = None
    if db_manager.is_connected and db_manager.users is not None:
        target_user = db_manager.users.find_one({
            "$or": [
                {"email": query_str},
                {"username": {"$regex": f"^{query_str}$", "$options": "i"}}
            ]
        })
        if target_user:
            target_user["id"] = str(target_user["_id"])
    else:
        for u in db_manager._in_memory_users.values():
            if u["email"].lower() == query_str or u["username"].lower() == query_str:
                target_user = u
                break

    if not target_user:
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    # Verify bcrypt password hash
    if not verify_password(login_in.password, target_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    token = create_access_token({"sub": target_user["id"], "username": target_user["username"]})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=target_user["id"],
            username=target_user["username"],
            email=target_user["email"],
            created_at=target_user["created_at"]
        )
    )

@router.get("/me", response_model=UserResponse)
def get_me(user: Optional[dict] = Depends(get_current_user_optional)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    return UserResponse(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        created_at=user["created_at"]
    )
