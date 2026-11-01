from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class AuthUser(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    user: AuthUser
    session_token: str
    message: str


class SessionUserResponse(BaseModel):
    user: AuthUser
