import os
import json
import random
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

# ------------------------------------------------------------------------------
# DATABASE SETUP
# ------------------------------------------------------------------------------
DATABASE_URL = "sqlite:///./game.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ------------------------------------------------------------------------------
# MODELS
# ------------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    birthday = Column(String, nullable=False)
    
    # Game Stats
    animal_id = Column(Integer, ForeignKey("animals.animal_id"), nullable=True)
    xp = Column(Integer, default=0)
    animal_level = Column(Integer, default=1)
    last_fed_at = Column(DateTime, default=datetime.utcnow)
    current_section_id = Column(Integer, default=1)

    # Relationships
    pet = relationship("Animal", back_populates="owners")

    @property
    def hunger(self) -> float:
        """Calculates hunger decay (0 to 100) based on hours since last fed."""
        if not self.last_fed_at:
            return 100.0
        elapsed_hours = (datetime.utcnow() - self.last_fed_at).total_seconds() / 3600.0
        # Loses ~4.16% hunger per hour (empty after 24 hours)
        current_hunger = max(0.0, 100.0 - (elapsed_hours * 4.16))
        return round(current_hunger, 1)

    @property
    def is_dead(self) -> bool:
        """Pet passes away if unfed for over 72 hours."""
        if not self.last_fed_at:
            return False
        elapsed_hours = (datetime.utcnow() - self.last_fed_at).total_seconds() / 3600.0
        return elapsed_hours >= 72.0


class Animal(Base):
    __tablename__ = "animals"

    animal_id = Column(Integer, primary_key=True, index=True)
    species = Column(String, nullable=False)
    baby_name = Column(String, nullable=False)
    young_name = Column(String, nullable=False)
    adult_name = Column(String, nullable=False)

    owners = relationship("User", back_populates="pet")


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    book = Column(String, nullable=False, index=True)
    chapter = Column(Integer, nullable=False)
    section_title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False, unique=True, index=True)


# Create DB Tables
Base.metadata.create_all(bind=engine)

# ------------------------------------------------------------------------------
# DATA SEEDING (FROM BSB_BIBLE.JSON)
# ------------------------------------------------------------------------------
def seed_database():
    """Initializes standard animals and seeds the Bible from bsb_bible.json."""
    db = SessionLocal()
    try:
        # 1. Seed Animals
        if db.query(Animal).count() == 0:
            default_animals = [
                Animal(animal_id=1, species="Donkey", baby_name="Foal", young_name="Colt", adult_name="Donkey"),
                Animal(animal_id=2, species="Lion", baby_name="Cub", young_name="Young Lion", adult_name="Lion"),
                Animal(animal_id=3, species="Raven", baby_name="Chick", young_name="Fledgling", adult_name="Raven"),
                Animal(animal_id=4, species="Camel", baby_name="Calf", young_name="Young Camel", adult_name="Camel"),
            ]
            db.add_all(default_animals)
            db.commit()
            print("✅ Seeded default animal species.")

        # 2. Seed Bible Sections from JSON
        if db.query(Section).count() == 0:
            json_file_path = "bsb_bible.json"
            if os.path.exists(json_file_path):
                with open(json_file_path, "r", encoding="utf-8") as f:
                    bible_data = json.load(f)

                sections_to_add = [
                    Section(
                        book=item.get("book", "Unknown"),
                        chapter=item["chapter"],
                        section_title=item["section_title"],
                        content=item["content"],
                        order_index=item["order_index"]
                    )
                    for item in bible_data
                ]
                
                # Bulk insert for fast loading of large numbers of records
                db.bulk_save_objects(sections_to_add)
                db.commit()
                print(f"✅ Successfully seeded {len(sections_to_add)} Bible sections from {json_file_path}!")
            else:
                print(f"⚠️ Notice: '{json_file_path}' not found. Create this file to seed full Bible data.")
    finally:
        db.close()


# Run seeding on server startup
seed_database()

# ------------------------------------------------------------------------------
# XP & LEVELING (Medium Fast growth rate)
# ------------------------------------------------------------------------------
MAX_LEVEL = 100
MAX_XP = MAX_LEVEL ** 3  # 1,000,000


def xp_for_level(level: int) -> int:
    """Total XP required to reach `level` (level^3)."""
    return max(1, min(int(level), MAX_LEVEL)) ** 3


def level_from_xp(xp: int) -> int:
    """Highest level whose total-XP requirement (level^3) is <= xp, clamped to 1..100."""
    xp = max(0, min(int(xp or 0), MAX_XP))
    level = round(xp ** (1 / 3))
    while level > 1 and level ** 3 > xp:
        level -= 1
    while level < MAX_LEVEL and (level + 1) ** 3 <= xp:
        level += 1
    return max(1, min(level, MAX_LEVEL))


def get_feeding_xp(level: int) -> int:
    """XP awarded for one feeding (one reading), by the pet's current level."""
    if level < 5:
        return random.randint(15, 50)
    if level < 30:
        return random.randint(50, 150)
    if level < 60:
        return 700
    return 1800


def get_quiz_xp_reward(level: int) -> int:
    """XP awarded for finishing/beating a quiz, by the pet's current level."""
    if level < 30:
        return random.randint(200, 600)
    if level < 60:
        return random.randint(1500, 3500)
    return 5000

# ------------------------------------------------------------------------------
# FASTAPI APP & SCHEMAS
# ------------------------------------------------------------------------------
app = FastAPI(title="Spirit-Feeder API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    birthday: str

class LoginRequest(BaseModel):
    identifier: str  # username or email
    password: str

class SelectPetRequest(BaseModel):
    user_id: int
    animal_id: int

class FeedPetRequest(BaseModel):
    user_id: int

class RestartPetRequest(BaseModel):
    user_id: int

class ReadingDoneRequest(BaseModel):
    user_id: int

# ------------------------------------------------------------------------------
# API ENDPOINTS
# ------------------------------------------------------------------------------
@app.get("/")
def read_root():
    return {"status": "online", "game": "Spirit-Feeder API", "docs": "http://127.0.0.1:8000/docs"}


@app.post("/api/register")
def register(data: RegisterRequest):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(
            (User.username == data.username) | (User.email == data.email)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username or email already exists.")

        user = User(
            username=data.username,
            email=data.email,
            password=data.password,
            birthday=data.birthday,
            current_section_id=1
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        return {"message": "Account created successfully!", "user_id": user.id}
    finally:
        db.close()


@app.post("/api/login")
def login(data: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            (User.username == data.identifier) | (User.email == data.identifier)
        ).first()
        
        if not user or user.password != data.password:
            raise HTTPException(status_code=401, detail="Invalid username/email or password.")

        return {
            "message": "Login successful!",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "birthday": user.birthday,
                "animal_id": user.animal_id,
                "xp": user.xp,
                "animal_level": level_from_xp(user.xp),
                "next_level_xp": xp_for_level(level_from_xp(user.xp) + 1),
                "hunger": user.hunger,
                "is_dead": user.is_dead,
                "current_section_id": user.current_section_id or 1
            }
        }
    finally:
        db.close()


@app.get("/api/animals")
def get_animals():
    db = SessionLocal()
    try:
        animals = db.query(Animal).all()
        return [
            {
                "animal_id": a.animal_id,
                "species": a.species,
                "baby_name": a.baby_name,
                "young_name": a.young_name,
                "adult_name": a.adult_name,
            }
            for a in animals
        ]
    finally:
        db.close()


@app.post("/api/pet/select")
def select_pet(data: SelectPetRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == data.user_id).first()
        animal = db.query(Animal).filter(Animal.animal_id == data.animal_id).first()

        if not user or not animal:
            raise HTTPException(status_code=404, detail="User or Animal not found.")

        user.animal_id = animal.animal_id
        db.commit()

        return {"message": f"Successfully selected {animal.species}!"}
    finally:
        db.close()


@app.get("/api/pet/status/{user_id}")
def get_pet_status(user_id: int):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        return {
            "user_id": user.id,
            "animal_id": user.animal_id,
            "animal_level": level_from_xp(user.xp),
            "xp": user.xp,
            "next_level_xp": xp_for_level(level_from_xp(user.xp) + 1),
            "hunger": user.hunger,
            "is_dead": user.is_dead,
            "current_section_id": user.current_section_id or 1
        }
    finally:
        db.close()


@app.get("/api/reading/next/{user_id}")
def get_next_reading_section(user_id: int):
    """Retrieves the exact section passage based strictly on order_index."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        if user.is_dead:
            raise HTTPException(status_code=400, detail="Your pet has passed away. Unfed for over 72 hours.")

        current_idx = user.current_section_id if user.current_section_id and user.current_section_id >= 1 else 1
        section = db.query(Section).filter(Section.order_index == current_idx).first()

        # Fallback reset if order_index exceeds total sections in DB
        if not section:
            user.current_section_id = 1
            db.add(user)
            db.commit()
            section = db.query(Section).filter(Section.order_index == 1).first()

        if not section:
            raise HTTPException(status_code=404, detail="No reading sections available in the database.")

        return {
            "section_id": section.id,
            "book": section.book,
            "chapter": section.chapter,
            "title": section.section_title,
            "content": section.content,
            "order_index": section.order_index
        }
    finally:
        db.close()


@app.post("/api/pet/feed")
def feed_pet(data: FeedPetRequest):
    """Restores pet hunger and awards XP."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        if user.is_dead:
            raise HTTPException(status_code=400, detail="Your pet has passed away.")

        now = datetime.utcnow()
        old_xp = user.xp or 0
        old_level = level_from_xp(old_xp)
        xp_gained = get_feeding_xp(old_level)
        new_xp = min(old_xp + xp_gained, MAX_XP)
        new_level = level_from_xp(new_xp)

        total_sections = db.query(Section).count()
        current_idx = user.current_section_id if user.current_section_id else 1

        next_idx = 1 if total_sections == 0 or current_idx >= total_sections else current_idx + 1

        db.query(User).filter(User.id == data.user_id).update(
            {
                User.last_fed_at: now,
                User.xp: new_xp,
                User.animal_level: new_level,
            },
            synchronize_session="evaluate"
        )
        db.commit()

        return {
            "message": "Pet fed successfully!",
            "hunger": 100,
            "xp_gained": new_xp - old_xp,
            "xp": new_xp,
            "animal_level": new_level,
            "leveled_up": new_level > old_level,
            "next_level_xp": xp_for_level(new_level + 1),
            "next_section_id": next_idx
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to feed pet: {str(e)}")
    finally:
        db.close()


@app.post("/api/pet/restart")
def restart_pet(data: RestartPetRequest):
    """After pet death: resets stats to level 1 with full hunger."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        user.xp = 0
        user.animal_level = 1
        user.last_fed_at = datetime.utcnow()
        db.commit()
        return {"message": "New egg!", "xp": 0, "animal_level": 1, "hunger": 100, "is_dead": False}
    finally:
        db.close()


@app.post("/api/reading/complete")
def complete_reading(data: ReadingDoneRequest):
    """Moves user to the next section passage."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        total = db.query(Section).count()
        current = user.current_section_id if user.current_section_id and user.current_section_id >= 1 else 1
        next_idx = 1 if total == 0 or current >= total else current + 1
        user.current_section_id = next_idx
        db.commit()
        return {"message": "Reading complete!", "next_section_id": next_idx}
    finally:
        db.close()

# ------------------------------------------------------------------------------
# EXTENSION MODULE INTEGRATIONS
# ------------------------------------------------------------------------------
import password_reset
password_reset.setup(app, SessionLocal, User, Base, engine)

import memorize
memorize.setup(app, SessionLocal, User, Base, engine, get_feeding_xp, level_from_xp, xp_for_level, MAX_XP)

import serpent
serpent.setup(app, SessionLocal, User, Base, engine, get_quiz_xp_reward, level_from_xp, xp_for_level, MAX_XP)

import pvp
pvp.setup(app, SessionLocal, User, Base, engine, level_from_xp)

import friends
friends.setup(app, SessionLocal, User, Base, engine, level_from_xp)

import testing
testing.setup(app, SessionLocal, User, level_from_xp, MAX_XP)

import account
account.setup(app, SessionLocal, User, Base, engine)
