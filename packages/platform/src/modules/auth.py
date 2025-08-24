from __future__ import annotations

from datetime import datetime, timedelta
from uuid import uuid4
from typing import Optional

import jwt
from passlib.hash import argon2
from pydantic import BaseModel
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

ACCESS_TTL_MIN = 15
REFRESH_TTL_DAYS = 30

class User(BaseModel):
    id: str
    tenant_id: str
    email: str
    name: str
    password_hash: str

class Session(BaseModel):
    id: str
    user_id: str
    created_at: datetime
    revoked_at: Optional[datetime] = None

class RefreshToken(BaseModel):
    token_id: str
    session_id: str
    expires_at: datetime
    revoked: bool = False

class UserRegister(BaseModel):
    tenant_id: str
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    tenant_id: str
    email: str
    password: str

class TokenRefresh(BaseModel):
    refresh_token: str

class AuthService:
    def __init__(self) -> None:
        self.users: dict[str, User] = {}
        self.sessions: dict[str, Session] = {}
        self.refresh_tokens: dict[str, RefreshToken] = {}
        self.private_key, self.public_key = self._generate_keys()

    def _generate_keys(self) -> tuple[bytes, bytes]:
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        private = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        public = key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        return private, public

    def register(self, payload: UserRegister) -> User:
        user = User(
            id=str(uuid4()),
            tenant_id=payload.tenant_id,
            email=payload.email,
            name=payload.name,
            password_hash=argon2.hash(payload.password),
        )
        self.users[user.email] = user
        return user

    def _encode_access(self, user: User) -> str:
        now = datetime.utcnow()
        payload = {
            "sub": user.id,
            "tenant": user.tenant_id,
            "exp": now + timedelta(minutes=ACCESS_TTL_MIN),
            "iat": now,
            "jti": str(uuid4()),
        }
        return jwt.encode(payload, self.private_key, algorithm="RS256")

    def _issue_refresh(self, session_id: str) -> tuple[str, RefreshToken]:
        token_id = str(uuid4())
        expires = datetime.utcnow() + timedelta(days=REFRESH_TTL_DAYS)
        payload = {
            "sid": session_id,
            "jti": token_id,
            "exp": expires,
        }
        token = jwt.encode(payload, self.private_key, algorithm="RS256")
        rt = RefreshToken(token_id=token_id, session_id=session_id, expires_at=expires)
        self.refresh_tokens[token_id] = rt
        return token, rt

    def login(self, payload: UserLogin) -> dict:
        user = self.users.get(payload.email)
        if not user or user.tenant_id != payload.tenant_id:
            raise ValueError("invalid credentials")
        if not argon2.verify(payload.password, user.password_hash):
            raise ValueError("invalid credentials")
        session = Session(id=str(uuid4()), user_id=user.id, created_at=datetime.utcnow())
        self.sessions[session.id] = session
        refresh_token, _ = self._issue_refresh(session.id)
        access = self._encode_access(user)
        return {"access": access, "refresh": refresh_token, "user": user}

    def refresh(self, token: str) -> dict:
        try:
            data = jwt.decode(token, self.public_key, algorithms=["RS256"])
        except jwt.PyJWTError as exc:
            raise ValueError("invalid token") from exc
        rt = self.refresh_tokens.get(data["jti"])
        if not rt or rt.revoked or rt.expires_at < datetime.utcnow():
            raise ValueError("invalid token")
        # rotate
        rt.revoked = True
        session = self.sessions.get(rt.session_id)
        if not session or session.revoked_at:
            raise ValueError("session revoked")
        refresh_token, _ = self._issue_refresh(session.id)
        user = self._find_user_by_id(session.user_id)
        access = self._encode_access(user)
        return {"access": access, "refresh": refresh_token}

    def logout(self, session_id: str) -> None:
        session = self.sessions.get(session_id)
        if session:
            session.revoked_at = datetime.utcnow()

    def _find_user_by_id(self, user_id: str) -> User:
        for u in self.users.values():
            if u.id == user_id:
                return u
        raise KeyError("user not found")
