import random
from typing import Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, Boolean, ForeignKey,
    CheckConstraint, func, select
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

# MySQL Connection URL (Update with your MySQL credentials)
# Format: mysql+pymysql://username:password@localhost:3306/database_name
MYSQL_URL = "sqlite:///./game.db"


engine = create_engine(
    MYSQL_URL,
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(title="Bible Pet Game API (MySQL)")

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
    points = Column(Integer, default=0, index=True)
    animal_id = Column(Integer, ForeignKey("animals.animal_id"), nullable=True)
    animal_level = Column(Integer, default=1)  # 1 to 100
    growth_progress = Column(Integer, default=0) # Points within current level (0-30)

    animal = relationship("Animal")

class Animal(Base):
    __tablename__ = "animals"

    animal_id = Column(Integer, primary_key=True, index=True)
    species = Column(String(50), unique=True, nullable=False) # Lamb, Raven, Dove, Donkey, Camel, Lion, Fish
    baby_name = Column(String(50), nullable=False)
    young_name = Column(String(50), nullable=False)
    adult_name = Column(String(50), nullable=False)

class Verse(Base):
    __tablename__ = "verses"

    verse_id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(100), nullable=False) # e.g. "Genesis 1:1"
    content = Column(Text, nullable=False) # Full verse text (handles multi-verse passages)

class UserVerse(Base):
    __tablename__ = "user_verses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    verse_id = Column(Integer, ForeignKey("verses.verse_id"), nullable=False)
    type = Column(String(20), nullable=False) # 'feed' or 'memorized'

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
    points_changed = Column(Integer, nullable=False)


# --- Initialize DB & Pre-populate Animals/Verses ---
def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed Pet Species if empty
        if not db.query(Animal).first():
            animals = [
                Animal(species="Lamb", baby_name="Baby Lamb", young_name="Young Ram", adult_name="Majestic Ram"),
                Animal(species="Raven", baby_name="Chirp Raven", young_name="Fledgling Raven", adult_name="Shadow Raven"),
                Animal(species="Dove", baby_name="Baby Dove", young_name="White Dove", adult_name="Heavenly Dove"),
                Animal(species="Donkey", baby_name="Little Foal", young_name="Young Donkey", adult_name="Royal Donkey"),
                Animal(species="Camel", baby_name="Baby Calf", young_name="Desert Camel", adult_name="Caravan Camel"),
                Animal(species="Lion", baby_name="Cub", young_name="Young Lion", adult_name="Lion of Judah"),
                Animal(species="Fish", baby_name="Tiny Fry", young_name="Silver Fish", adult_name="Miracle Fish"),
            ]
            db.add_all(animals)

        # Seed Sample Verses if empty
        if not db.query(Verse).first():
            sample_verses = [
                Verse(reference="Genesis 1:1", content="In the beginning God created the heavens and the earth."),
                Verse(reference="Psalm 23:1", content="The Lord is my shepherd; I shall not want."),
                Verse(reference="John 3:16", content="For God so loved the world that he gave his one and only Son."),
                Verse(reference="Proverbs 3:5", content="Trust in the Lord with all your heart and lean not on your own understanding."),
                Verse(reference="Philippians 4:13", content="I can do all things through Christ who strengthens me.")
            ]
            db.add_all(sample_verses)

        # Seed Serpent Quiz Questions
        if not db.query(QuizQuestion).first():
            sample_quizzes = [
                QuizQuestion(question_text="Is it good to help your neighbor in need?", correct_answer="Yes", wrong_answer_1="No", wrong_answer_2="Only if they pay you"),
                QuizQuestion(question_text="Should you hold grudges or forgive those who wrong you?", correct_answer="Forgive them", wrong_answer_1="Hold a grudge", wrong_answer_2="Get revenge"),
                QuizQuestion(question_text="What did Jesus say is the greatest commandment?", correct_answer="Love God with all your heart", wrong_answer_1="Gain wealth", wrong_answer_2="Judge others")
            ]
            db.add_all(sample_quizzes)

        db.commit()
    finally:
        db.close()

# Run DB initialization
init_db()


# --- Pydantic Schemas ---
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    identifier: str
    password: str

class SelectPetRequest(BaseModel):
    user_id: int
    animal_id: int

class MemorizeSubmitRequest(BaseModel):
    user_id: int
    verse_id: int
    attempt_text: str

class QuizSubmitRequest(BaseModel):
    user_id: int
    question_id: int
    answer: str


# --- Helper Functions ---
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def add_progress(user: User, points_to_add: int):
    """Handles adding points, 30-point level up logic (max level 100), and evolution stage."""
    user.points += points_to_add
    user.growth_progress += points_to_add

    # Level up logic: Every 30 points = 1 Level
    while user.growth_progress >= 30 and user.animal_level < 100:
        user.growth_progress -= 30
        user.animal_level += 1

    # Keep growth progress capped at max level 100
    if user.animal_level >= 100:
        user.animal_level = 100
        user.growth_progress = 30

def calculate_evolution_stage(level: int, animal: Optional[Animal]):
    if not animal:
        return None
    if level < 30:
        return {"stage": "Baby", "name": animal.baby_name}
    elif level < 60:
        return {"stage": "Young", "name": animal.young_name}
    else:
        return {"stage": "Adult", "name": animal.adult_name}


# --- API Routes ---

@app.post("/api/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest):
    db = SessionLocal()
    hashed_pwd = pwd_context.hash(data.password)
    try:
        user = User(username=data.username, email=data.email, password_hash=hashed_pwd)
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
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    evolution = calculate_evolution_stage(user.animal_level, user.animal)
    db.close()

    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "username": user.username,
            "points": user.points,
            "animal_level": user.animal_level,
            "growth_progress": user.growth_progress,
            "pet": evolution
        }
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
    """Fetches a random verse, feeds it to the pet, and awards +10 points/progress."""
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.animal_id:
        db.close()
        raise HTTPException(status_code=400, detail="User must select a pet first.")

    verse = db.query(Verse).order_by(func.rand()).first()
    if not verse:
        db.close()
        raise HTTPException(status_code=404, detail="No verses available.")

    # Record feed action
    user_verse = UserVerse(user_id=user.id, verse_id=verse.verse_id, type="feed")
    db.add(user_verse)

    # Award 10 progress points
    add_progress(user, 10)
    db.commit()

    evolution = calculate_evolution_stage(user.animal_level, user.animal)
    db.close()

    return {
        "message": "Fed pet with verse!",
        "verse": {"reference": verse.reference, "text": verse.content},
        "points_earned": 10,
        "current_level": user.animal_level,
        "growth_progress": f"{user.growth_progress}/30",
        "pet": evolution
    }

@app.post("/api/bible/memorize")
def submit_memorized_verse(data: MemorizeSubmitRequest):
    """Verifies typed verse verbatim. Correct = +30 points. Wrong = Retry prompt."""
    db = SessionLocal()
    user = db.query(User).filter(User.id == data.user_id).first()
    verse = db.query(Verse).filter(Verse.verse_id == data.verse_id).first()

    if not user or not verse:
        db.close()
        raise HTTPException(status_code=404, detail="User or Verse not found.")

    # Compare verbatim string clean of whitespace
    is_correct = data.attempt_text.strip().lower() == verse.content.strip().lower()

    if is_correct:
        user_verse = UserVerse(user_id=user.id, verse_id=verse.verse_id, type="memorized")
        db.add(user_verse)
        add_progress(user, 30)
        db.commit()
        db.close()
        return {
            "correct": True,
            "message": "Verse memorized correctly! +30 points awarded.",
            "points_earned": 30
        }
    else:
        db.close()
        return {
            "correct": False,
            "message": "Mismatch! Try reading the verse again and retry.",
            "correct_verse": verse.content
        }

@app.post("/api/quiz/serpent")
def handle_serpent_quiz(data: QuizSubmitRequest):
    """Serpent Quiz: Correct = +15 points, Wrong = -15 points."""
    db = SessionLocal()
    user = db.query(User).filter(User.id == data.user_id).first()
    question = db.query(QuizQuestion).filter(QuizQuestion.question_id == data.question_id).first()

    if not user or not question:
        db.close()
        raise HTTPException(status_code=404, detail="User or Question not found.")

    is_correct = data.answer.strip().lower() == question.correct_answer.strip().lower()
    points_delta = 15 if is_correct else -15

    if is_correct:
        add_progress(user, 15)
    else:
        # Deduct progress points
        user.points = max(0, user.points - 15)
        user.growth_progress -= 15
        if user.growth_progress < 0:
            if user.animal_level > 1:
                user.animal_level -= 1
                user.growth_progress += 30
            else:
                user.growth_progress = 0

    quiz_result = QuizResult(
        user_id=user.id,
        question_id=question.question_id,
        user_answer=data.answer,
        correct=is_correct,
        points_changed=points_delta
    )
    db.add(quiz_result)
    db.commit()
    db.close()

    return {
        "correct": is_correct,
        "points_changed": points_delta,
        "message": "Good defeated evil! +15 points." if is_correct else "The serpent tricked you! -15 points."
    }

@app.get("/api/leaderboard")
def get_leaderboard(limit: int = 10):
    db = SessionLocal()
    users = db.query(User).order_by(User.points.desc()).limit(limit).all()
    
    leaderboard = []
    for rank, u in enumerate(users, start=1):
        evolution = calculate_evolution_stage(u.animal_level, u.animal)
        leaderboard.append({
            "rank": rank,
            "username": u.username,
            "points": u.points,
            "level": u.animal_level,
            "pet_name": evolution["name"] if evolution else "No Pet"
        })
    db.close()
    return {"leaderboard": leaderboard}