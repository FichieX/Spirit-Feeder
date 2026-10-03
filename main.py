from datetime import date
import sqlite3
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

# Initialize FastAPI app
app = FastAPI(title="Auth API")

# Enable CORS (allows frontend apps like React to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Password Hashing Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# SQLite Database Setup
DB_FILE = "users.db"


def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                birthday TEXT NOT NULL
            )
        """
        )
        conn.commit()


# Run DB initialization on startup
init_db()


# --- Pydantic Data Models ---
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    birthday: date


class LoginRequest(BaseModel):
    identifier: str  # Accepts Username OR Email
    password: str


# --- Helper Functions ---
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# --- API Routes ---


@app.post("/api/register", status_code=status.HTTP_201_CREATED)
def register_user(user_data: RegisterRequest):
    hashed_pwd = get_password_hash(user_data.password)

    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO users (username, email, password_hash, birthday)
                VALUES (?, ?, ?, ?)
            """,
                (
                    user_data.username,
                    user_data.email,
                    hashed_pwd,
                    str(user_data.birthday),
                ),
            )
            conn.commit()
            user_id = cursor.lastrowid

        return {
            "message": "User registered successfully",
            "user": {
                "id": user_id,
                "username": user_data.username,
                "email": user_data.email,
                "birthday": str(user_data.birthday),
            },
        }

    except sqlite3.IntegrityError as e:
        error_msg = str(e)
        if "users.username" in error_msg:
            raise HTTPException(
                status_code=400, detail="Username is already taken."
            )
        elif "users.email" in error_msg:
            raise HTTPException(
                status_code=400, detail="Email is already registered."
            )
        else:
            raise HTTPException(
                status_code=400, detail="Registration failed."
            )


@app.post("/api/login")
def login_user(credentials: LoginRequest):
    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT * FROM users 
            WHERE username = ? OR email = ?
        """,
            (credentials.identifier, credentials.identifier),
        )

        user = cursor.fetchone()

    if not user or not verify_password(
        credentials.password, user["password_hash"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
        )

    return {
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "birthday": user["birthday"],
        },
    }