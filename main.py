from datetime import date
import random
from typing import Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    func,
)
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker

# --- Database & App Setup ---
SQLITE_URL = "sqlite:///./game.db"

engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(title="Spirit-Feeder Game API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Database Models ---

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    birthday = Column(String(20), nullable=True)
    xp = Column(Integer, default=0, index=True)  # Game XP
    animal_id = Column(Integer, ForeignKey("animals.animal_id"), nullable=True)
    animal_level = Column(Integer, default=1)  # 1 to 100

    animal = relationship("Animal")


class Animal(Base):
    __tablename__ = "animals"

    animal_id = Column(Integer, primary_key=True, index=True)
    species = Column(String(50), unique=True, nullable=False)
    baby_name = Column(String(50), nullable=False)
    young_name = Column(String(50), nullable=False)
    adult_name = Column(String(50), nullable=False)


class Verse(Base):
    __tablename__ = "verses"

    verse_id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)


class UserVerse(Base):
    __tablename__ = "user_verses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    verse_id = Column(Integer, ForeignKey("verses.verse_id"), nullable=False)
    type = Column(String(20), nullable=False)


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    question_id = Column(Integer, primary_key=True, index=True)
    question_text = Column(Text, nullable=False)
    correct_answer = Column(String(255), nullable=False)
    wrong_answer_1 = Column(String(255), nullable=False)
    wrong_answer_2 = Column(String(255), nullable=False)


class QuizResult(Base):
    __tablename__ = "quiz_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("quiz_questions.question_id"), nullable=False)
    user_answer = Column(String(255), nullable=False)
    correct = Column(Boolean, nullable=False)
    xp_changed = Column(Integer, nullable=False)


# --- DB Initialization & Seeding ---

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(Animal).first():
            animals = [
                Animal(species="Lamb", baby_name="Baby Lamb", young_name="Young Ram", adult_name="Majestic Ram"),
                Animal(species="Raven", baby_name="Chirp Raven", young_name="Fledgling Raven", adult_name="Shadow Raven"),
                Animal(species="Dove", baby_name="Baby Dove", young_name="White Dove", adult_name="Heavenly Dove"),
                Animal(species="Donkey", baby_name="Little Foal", young_name="Young Donkey", adult_name="Royal Donkey"),
                Animal(species="Camel", baby_name="Baby Calf", young_name="Desert Camel", adult_name="Caravan Camel"),
                Animal(species="Lion", baby_name="Cub", young_name="Young Lion", adult_name="Lion of Judah"),
                Animal(species="Fish", baby_name="Tiny Cat-Fish", young_name="Silver Cat-Fish", adult_name="Miracle Cat-Fish"),
            ]
            db.add_all(animals)

        if not db.query(Verse).first():
            sample_verses = [
                Verse(reference="Genesis 1:1", content="In the beginning God created the heavens and the earth."),
                Verse(reference="Psalm 23:1", content="The Lord is my shepherd; I shall not want."),
                Verse(reference="John 3:16", content="For God so loved the world that he gave his one and only Son."),
            ]
            db.add_all(sample_verses)

        if not db.query(QuizQuestion).first():
            sample_quizzes = [
                QuizQuestion(question_text="Is it good to help your neighbor in need?", correct_answer="Yes", wrong_answer_1="No", wrong_answer_2="Only if paid"),
            ]
            db.add_all(sample_quizzes)

        db.commit()
    finally:
        db.close()


init_db()


# --- Pydantic Data Models ---

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    birthday: date


class LoginRequest(BaseModel):
    identifier: str
    password: str


class SelectPetRequest(BaseModel):
    user_id: int
    animal_id: int


class QuizSubmitRequest(BaseModel):
    user_id: int
    question_id: int
    answer: str


# --- XP & Level Progression Engine ---

def get_required_xp_for_level(level: int) -> int:
    """Medium Fast growth rate: Total XP = level^3."""
    if level >= 100:
        return 1_000_000
    return level ** 3


def update_user_level(user: User):
    """Calculates user level based on total XP and formula (Level = floor(cbrt(XP)))."""
    current_xp = max(0, user.xp)
    
    # Calculate level based on cubic curve
    calculated_level = int(current_xp ** (1/3))
    
    # Clamp level between 1 and 100
    user.animal_level = max(1, min(100, calculated_level))


def get_evolution_info(level: int, animal: Optional[Animal]):
    """Determines active stage and animal name based on current level."""
    if not animal:
        return None
    if level < 30:
        return {"stage": "Baby", "name": animal.baby_name}
    elif level < 60:
        return {"stage": "Young", "name": animal.young_name}
    else:
        return {"stage": "Adult", "name": animal.adult_name}


def get_feed_xp_reward(level: int) -> int:
    """Returns feed XP based on level tier."""
    if level < 30:
        return random.randint(15, 50)
    elif level < 60:
        return 700
    else:
        return 1800


def get_quiz_xp_reward(level: int, correct: bool) -> int:
    """Returns quiz XP gain/loss based on level tier."""
    if correct:
        if level < 30:
            return random.randint(200, 600)
        elif level < 60:
            return random.randint(1500, 3500)
        else:
            return 5000
    else:
        if level < 30:
            return -50
        elif level < 60:
            return -500
        else:
            return -1500


# --- API Routes ---

@app.get("/")
def read_root():
    return {"status": "online", "game": "Spirit-Feeder API", "docs": "http://127.0.0.1:8000/docs"}


@app.post("/api/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest):
    db = SessionLocal()
    hashed_pwd = pwd_context.hash(data.password)
    try:
        user = User(
            username=data.username,
            email=data.email,
            password_hash=hashed_pwd,
            birthday=str(data.birthday),
            xp=1,  # Starts at Level 1
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {"message": "User registered successfully", "user_id": user.id}
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username or Email already registered.")
    finally:
        db.close()


@app.post("/api/login")
def login(credentials: LoginRequest):
    db = SessionLocal()
    user = db.query(User).filter(
        (User.username == credentials.identifier) | (User.email == credentials.identifier)
    ).first()

    if not user or not pwd_context.verify(credentials.password, user.password_hash):
        db.close()
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    update_user_level(user)
    db.commit()

    evolution = get_evolution_info(user.animal_level, user.animal)
    next_level_xp = get_required_xp_for_level(user.animal_level + 1)
    db.close()

    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "birthday": user.birthday,
            "xp": user.xp,
            "animal_level": user.animal_level,
            "next_level_xp": next_level_xp,
            "pet": evolution,
        },
    }


@app.post("/api/pet/select")
def select_pet(data: SelectPetRequest):
    db = SessionLocal()
    user = db.query(User).filter(User.id == data.user_id).first()
    animal = db.query(Animal).filter(Animal.animal_id == data.animal_id).first()

    if not user or not animal:
        db.close()
        raise HTTPException(status_code=404, detail="User or Animal not found.")

    user.animal_id = data.animal_id
    db.commit()
    db.close()
    return {"message": f"Pet {animal.species} selected!"}


@app.post("/api/bible/feed-pet")
def feed_pet_with_verse(user_id: int):
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.animal_id:
        db.close()
        raise HTTPException(status_code=400, detail="User must select a pet first.")

    verse = db.query(Verse).order_by(func.random()).first()
    if not verse:
        db.close()
        raise HTTPException(status_code=404, detail="No verses available.")

    # Calculate XP earned based on current level tier
    xp_earned = get_feed_xp_reward(user.animal_level)
    user.xp += xp_earned
    
    # Update Level based on new total XP
    old_level = user.animal_level
    update_user_level(user)
    
    db.add(UserVerse(user_id=user.id, verse_id=verse.verse_id, type="feed"))
    db.commit()

    evolution = get_evolution_info(user.animal_level, user.animal)
    next_level_xp = get_required_xp_for_level(user.animal_level + 1)
    db.close()

    return {
        "message": "Fed pet with verse!",
        "verse": {"reference": verse.reference, "text": verse.content},
        "xp_earned": xp_earned,
        "total_xp": user.xp,
        "current_level": user.animal_level,
        "next_level_xp": next_level_xp,
        "leveled_up": user.animal_level > old_level,
        "pet": evolution,
    }


@app.post("/api/quiz/serpent")
def handle_serpent_quiz(data: QuizSubmitRequest):
    db = SessionLocal()
    user = db.query(User).filter(User.id == data.user_id).first()
    question = db.query(QuizQuestion).filter(QuizQuestion.question_id == data.question_id).first()

    if not user or not question:
        db.close()
        raise HTTPException(status_code=404, detail="User or Question not found.")

    is_correct = data.answer.strip().lower() == question.correct_answer.strip().lower()
    xp_delta = get_quiz_xp_reward(user.animal_level, is_correct)

    user.xp = max(0, user.xp + xp_delta)
    old_level = user.animal_level
    update_user_level(user)

    db.add(QuizResult(user_id=user.id, question_id=question.question_id, user_answer=data.answer, correct=is_correct, xp_changed=xp_delta))
    db.commit()

    evolution = get_evolution_info(user.animal_level, user.animal)
    db.close()

    return {
        "correct": is_correct,
        "xp_changed": xp_delta,
        "total_xp": user.xp,
        "current_level": user.animal_level,
        "leveled_up": user.animal_level > old_level,
        "pet": evolution,
        "message": f"Correct! +{xp_delta} XP." if is_correct else f"Incorrect! {xp_delta} XP.",
    }


@app.get("/api/leaderboard")
def get_leaderboard(limit: int = 10):
    db = SessionLocal()
    users = db.query(User).order_by(User.xp.desc()).limit(limit).all()

    leaderboard = [
        {
            "rank": rank,
            "username": u.username,
            "total_xp": u.xp,
            "level": u.animal_level,
            "pet_name": get_evolution_info(u.animal_level, u.animal)["name"] if u.animal else "No Pet",
        }
        for rank, u in enumerate(users, start=1)
    ]
    db.close()
    return {"leaderboard": leaderboard}