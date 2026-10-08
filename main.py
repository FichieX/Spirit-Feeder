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
class User(BaseModel):
    pass

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
    book = Column(String, default="John")
    chapter = Column(Integer, nullable=False)
    section_title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False, unique=True)


# Create DB Tables
Base.metadata.create_all(bind=engine)

# ------------------------------------------------------------------------------
# DATA SEEDING (COMPLETE BOOK OF JOHN - 30 SECTIONS)
# ------------------------------------------------------------------------------
COMPLETE_JOHN_SECTIONS = [
    {
        "order_index": 1,
        "chapter": 1,
        "section_title": "The Deity of Jesus Christ (John 1:1-18)",
        "content": "In the beginning was the Word, and the Word was with God, and the Word was God. He was in the beginning with God. All things came into being through Him, and apart from Him not even one thing came into being that has come into being. In Him was life, and the life was the Light of men. The Light shines in the darkness, and the darkness did not comprehend it."
    },
    {
        "order_index": 2,
        "chapter": 1,
        "section_title": "The Testimony of John the Baptist (John 1:19-34)",
        "content": "This is the testimony of John, when the Jews sent priests and Levites to him from Jerusalem to ask him, 'Who are you?' And he confessed and did not deny, but confessed, 'I am not the Christ.' They asked him, 'What then? Are you Elijah?' And he said, 'I am not.' 'Are you the Prophet?' And he answered, 'No.' The next day he saw Jesus coming to him and said, 'Behold, the Lamb of God who takes away the sin of the world!'"
    },
    {
        "order_index": 3,
        "chapter": 1,
        "section_title": "The First Disciples (John 1:35-51)",
        "content": "Again the next day John was standing with two of his disciples, and he looked at Jesus as He walked, and said, 'Behold, the Lamb of God!' The two disciples heard him speak, and they followed Jesus. Andrew, Simon Peter's brother, was one of the two who heard John speak and followed Him. He first found his own brother Simon and said to him, 'We have found the Messiah.'"
    },
    {
        "order_index": 4,
        "chapter": 2,
        "section_title": "The Marriage at Cana (John 2:1-12)",
        "content": "On the third day there was a wedding in Cana of Galilee, and the mother of Jesus was there; and both Jesus and His disciples were also invited to the wedding. When the wine ran out, the mother of Jesus said to Him, 'They have no wine.' Jesus performed this first of His signs in Cana of Galilee, and manifested His glory, and His disciples believed in Him."
    },
    {
        "order_index": 5,
        "chapter": 2,
        "section_title": "Cleansing the Temple (John 2:13-25)",
        "content": "The Passover of the Jews was near, and Jesus went up to Jerusalem. And He found in the temple those who were selling oxen and sheep and doves, and the money changers seated at their tables. And He made a scourge of cords, and drove them all out of the temple. Jesus answered them, 'Destroy this temple, and in three days I will raise it up.'"
    },
    {
        "order_index": 6,
        "chapter": 3,
        "section_title": "Nicodemus Visits Jesus (John 3:1-21)",
        "content": "Now there was a man of the Pharisees, named Nicodemus, a ruler of the Jews; this man came to Jesus by night and said to Him, 'Rabbi, we know that You have come from God as a teacher.' Jesus answered and said to him, 'Truly, truly, I say to you, unless one is born again he cannot see the kingdom of God.' For God so loved the world, that He gave His only begotten Son, that whoever believes in Him shall not perish, but have eternal life."
    },
    {
        "order_index": 7,
        "chapter": 3,
        "section_title": "John the Baptist's Final Testimony (John 3:22-36)",
        "content": "After these things Jesus and His disciples came into the land of Judea, and there He was spending time with them and baptizing. John answered and said, 'A man can receive nothing unless it has been given him from heaven. He must increase, but I must decrease. He who believes in the Son has eternal life.'"
    },
    {
        "order_index": 8,
        "chapter": 4,
        "section_title": "The Samaritan Woman at the Well (John 4:1-42)",
        "content": "So He came to a city of Samaria called Sychar, near the parcel of ground that Jacob gave to his son Joseph; and Jacob's well was there. Jesus said to her, 'Everyone who drinks of this water will thirst again; but whoever drinks of the water that I will give him shall never thirst; but the water that I will give him will become in him a well of water springing up to eternal life.'"
    },
    {
        "order_index": 9,
        "chapter": 4,
        "section_title": "Healing the Nobleman's Son (John 4:43-54)",
        "content": "After the two days He went forth from there into Galilee. So He came again to Cana of Galilee where He had made the water wine. And there was a royal official whose son was sick at Capernaum. Jesus said to him, 'Go; your son lives.' The man believed the word that Jesus spoke to him and started off."
    },
    {
        "order_index": 10,
        "chapter": 5,
        "section_title": "Healing at the Pool of Bethesda (John 5:1-18)",
        "content": "Now there is in Jerusalem by the sheep gate a pool, which is called in Hebrew Bethesda, having five porticoes. A man was there who had been ill for thirty-eight years. Jesus said to him, 'Get up, pick up your pallet and walk.' Immediately the man became well, and picked up his pallet and began to walk."
    },
    {
        "order_index": 11,
        "chapter": 5,
        "section_title": "The Authority of the Son (John 5:19-47)",
        "content": "Therefore Jesus answered and was saying to them, 'Truly, truly, I say to you, the Son can do nothing of Himself, unless it is something He sees the Father doing; for whatever the Father does, these things the Son also does in like manner. Truly, truly, I say to you, he who hears My word, and believes Him who sent Me, has eternal life.'"
    },
    {
        "order_index": 12,
        "chapter": 6,
        "section_title": "Feeding the Five Thousand (John 6:1-15)",
        "content": "After these things Jesus went away to the other side of the Sea of Galilee. A large crowd followed Him. Jesus took the loaves, and having given thanks, He distributed to those who were seated; likewise also of the fish as much as they wanted. When they were filled, they gathered up twelve baskets full of fragments."
    },
    {
        "order_index": 13,
        "chapter": 6,
        "section_title": "Jesus Walks on the Water (John 6:16-21)",
        "content": "Now when evening came, His disciples went down to the sea, and after getting into a boat, they started to cross the sea to Capernaum. It had already become dark, and Jesus had not yet come to them. The sea began to be stirred up because a strong wind was blowing. Then they saw Jesus walking on the sea and drawing near to the boat."
    },
    {
        "order_index": 14,
        "chapter": 6,
        "section_title": "The Bread of Life (John 6:22-71)",
        "content": "Jesus said to them, 'I am the bread of life; he who comes to Me will not hunger, and he who believes in Me will never thirst. I am the living bread that came down out of heaven; if anyone eats of this bread, he will live forever; and the bread also which I will give for the life of the world is My flesh.'"
    },
    {
        "order_index": 15,
        "chapter": 7,
        "section_title": "Jesus Teaches at the Feast (John 7:1-52)",
        "content": "Now about the middle of the feast Jesus went up into the temple, and began to teach. Jesus answered them and said, 'My teaching is not Mine, but His who sent Me. If anyone is willing to do His will, he will know of the teaching, whether it is of God or whether I speak from Myself. If anyone is thirsty, let him come to Me and drink.'"
    },
    {
        "order_index": 16,
        "chapter": 8,
        "section_title": "The Adulterous Woman & Light of the World (John 8:1-30)",
        "content": "Early in the morning He came again into the temple. The scribes and Pharisees brought a woman caught in adultery. Jesus said to them, 'He who is without sin among you, let him be the first to throw a stone at her.' Then Jesus spoke to them, saying, 'I am the Light of the world; he who follows Me will not walk in the darkness, but will have the Light of life.'"
    },
    {
        "order_index": 17,
        "chapter": 8,
        "section_title": "Before Abraham Was, I Am (John 8:31-59)",
        "content": "So Jesus was saying to those Jews who had believed Him, 'If you continue in My word, then you are truly disciples of Mine; and you will know the truth, and the truth will make you free.' Jesus said to them, 'Truly, truly, I say to you, before Abraham was born, I am.'"
    },
    {
        "order_index": 18,
        "chapter": 9,
        "section_title": "Healing the Man Born Blind (John 9:1-41)",
        "content": "As He passed by, He saw a man blind from birth. Jesus spat on the ground, and made clay from the spittle, and applied the clay to his eyes, and said to him, 'Go, wash in the pool of Siloam.' So he went away and washed, and came back seeing."
    },
    {
        "order_index": 19,
        "chapter": 10,
        "section_title": "The Good Shepherd (John 10:1-42)",
        "content": "Jesus said, 'I am the good shepherd; the good shepherd lays down His life for the sheep. My sheep hear My voice, and I know them, and they follow Me; and I give eternal life to them, and they will never perish; and no one will snatch them out of My hand. I and the Father are one.'"
    },
    {
        "order_index": 20,
        "chapter": 11,
        "section_title": "The Resurrection of Lazarus (John 11:1-57)",
        "content": "Now a certain man was sick, Lazarus of Bethany. Jesus said to Martha, 'I am the resurrection and the life; he who believes in Me will live even if he dies.' He cried out with a loud voice, 'Lazarus, come forth!' The man who had died came forth, bound hand and foot with wrappings."
    },
    {
        "order_index": 21,
        "chapter": 12,
        "section_title": "Mary Anoints Jesus & Triumphal Entry (John 12:1-50)",
        "content": "Mary then took a pound of very costly perfume of pure nard, and anointed the feet of Jesus and wiped His feet with her hair. On the next day the large crowd took branches of the palm trees and went out to meet Him, and began to shout, 'Hosanna! Blessed is He who comes in the name of the Lord.'"
    },
    {
        "order_index": 22,
        "chapter": 13,
        "section_title": "Jesus Washes the Disciples' Feet (John 13:1-38)",
        "content": "Jesus got up from supper, and laid aside His garments; and taking a towel, He girded Himself. Then He poured water into the basin, and began to wash the disciples' feet. 'A new commandment I give to you, that you love one another, even as I have loved you.'"
    },
    {
        "order_index": 23,
        "chapter": 14,
        "section_title": "The Way, the Truth, and the Life (John 14:1-31)",
        "content": "Jesus said, 'Do not let your heart be troubled; believe in God, believe also in Me. In My Father's house are many dwelling places. I am the way, and the truth, and the life; no one comes to the Father but through Me. Peace I leave with you; My peace I give to you.'"
    },
    {
        "order_index": 24,
        "chapter": 15,
        "section_title": "The True Vine (John 15:1-27)",
        "content": "I am the true vine, and My Father is the vinedresser. Abide in Me, and I in you. As the branch cannot bear fruit of itself unless it abides in the vine, so neither can you unless you abide in Me. Greater love has no one than this, that one lay down his life for his friends."
    },
    {
        "order_index": 25,
        "chapter": 16,
        "section_title": "The Work of the Holy Spirit (John 16:1-33)",
        "content": "But I tell you the truth, it is to your advantage that I go away; for if I do not go away, the Helper will not come to you; but if I go, I will send Him to you. In the world you have tribulation, but take courage; I have overcome the world."
    },
    {
        "order_index": 26,
        "chapter": 17,
        "section_title": "The High Priestly Prayer (John 17:1-26)",
        "content": "Jesus spoke these things; and lifting up His eyes to heaven, He said, 'Father, the hour has come; glorify Your Son, that the Son may glorify You. This is eternal life, that they may know You, the only true God, and Jesus Christ whom You have sent.'"
    },
    {
        "order_index": 27,
        "chapter": 18,
        "section_title": "Betrayal, Arrest, and Trial (John 18:1-40)",
        "content": "Judas, having received the Roman cohort and officers from the chief priests and the Pharisees, came there with lanterns and torches and weapons. Pilate said to Him, 'Are You the King of the Jews?' Jesus answered, 'My kingdom is not of this world.'"
    },
    {
        "order_index": 28,
        "chapter": 19,
        "section_title": "The Crucifixion and Burial (John 19:1-42)",
        "content": "They took Jesus, and He went out, bearing His own cross, to the place called the Place of a Skull, Golgotha. There they crucified Him. When Jesus had received the sour wine, He said, 'It is finished!' And He bowed His head and gave up His spirit."
    },
    {
        "order_index": 29,
        "chapter": 20,
        "section_title": "The Resurrection & Appearance to Thomas (John 20:1-31)",
        "content": "Now on the first day of the week Mary Magdalene came early to the tomb, and saw the stone already taken away. Jesus came and stood in their midst and said, 'Peace be with you.' Then He said to Thomas, 'Reach here with your finger, and see My hands... do not be unbelieving, but believing.'"
    },
    {
        "order_index": 30,
        "chapter": 21,
        "section_title": "Restoration of Peter & Conclusion (John 21:1-25)",
        "content": "Jesus said to them, 'Come and have breakfast.' Jesus said to Simon Peter, 'Simon, son of John, do you love Me more than these?' He said to Him, 'Yes, Lord; You know that I love You.' He said to him, 'Tend My sheep.' This is the disciple who is testifying to these things; and we know that his testimony is true."
    }
]


def seed_database():
    """Initializes standard animals and seeds the 30 Book of John sections."""
    db = SessionLocal()
    try:
        # 1. Seed Animals
        if db.query(Animal).count() == 0:
            default_animals = [
                Animal(animal_id=1, species="Donkey", baby_name="Foal", young_name="Colt", adult_name="Donkey"),
                Animal(animal_id=2, species="Lion", baby_name="Cub", young_name="Young Lion", adult_name="Lion"),
            ]
            db.add_all(default_animals)
            db.commit()
            print("✅ Seeded Donkey and Lion species.")

        # 2. Seed John Sections
        if db.query(Section).count() == 0:
            for item in COMPLETE_JOHN_SECTIONS:
                sec = Section(
                    book="John",
                    chapter=item["chapter"],
                    section_title=item["section_title"],
                    content=item["content"],
                    order_index=item["order_index"]
                )
                db.add(sec)
            db.commit()
            print("✅ Successfully seeded 30 sequential Book of John sections!")
    finally:
        db.close()


# Run seeding on server startup
seed_database()

# ------------------------------------------------------------------------------
# XP & LEVELING  (Medium Fast growth rate)
# ------------------------------------------------------------------------------
# Total XP needed to reach level n is n^3, so level 100 needs exactly 1,000,000 XP.
# The level is never stored by hand: it is always derived from total XP.
MAX_LEVEL = 100
MAX_XP = MAX_LEVEL ** 3  # 1,000,000


def xp_for_level(level: int) -> int:
    """Total XP required to reach `level` (level^3)."""
    return max(1, min(int(level), MAX_LEVEL)) ** 3


def level_from_xp(xp: int) -> int:
    """Highest level whose total-XP requirement (level^3) is <= xp, clamped to 1..100.

    Uses an integer correction step because float cube roots can land just below a
    whole number (e.g. 64 ** (1/3) == 3.9999999999999996).
    """
    xp = max(0, min(int(xp or 0), MAX_XP))
    level = round(xp ** (1 / 3))
    while level > 1 and level ** 3 > xp:
        level -= 1
    while level < MAX_LEVEL and (level + 1) ** 3 <= xp:
        level += 1
    return max(1, min(level, MAX_LEVEL))


def get_feeding_xp(level: int) -> int:
    """XP awarded for one feeding (one reading), by the pet's current level.

    Levels 1-4   : random 15-50
    Levels 5-29  : random 50-150
    Levels 30-59 : 700
    Levels 60+   : 1,800
    """
    if level < 5:
        return random.randint(15, 50)
    if level < 30:
        return random.randint(50, 150)
    if level < 60:
        return 700
    return 1800


def get_quiz_xp_reward(level: int) -> int:
    """XP awarded for finishing/beating a quiz, by the pet's current level.

    Levels 1-29  : random 200-600
    Levels 30-59 : random 1,500-3,500
    Levels 60+   : 5,000
    """
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

        # Default to order_index 1 if missing or invalid
        current_idx = user.current_section_id if user.current_section_id and user.current_section_id >= 1 else 1

        # Query strictly by order_index
        section = db.query(Section).filter(Section.order_index == current_idx).first()

        # Fallback reset if order_index exceeds total sections in DB
        if not section:
            user.current_section_id = 1
            db.add(user)
            db.commit()
            section = db.query(Section).filter(Section.order_index == 1).first()

        return {
            "section_id": section.id,
            "chapter": section.chapter,
            "title": section.section_title,
            "content": section.content,
            "order_index": section.order_index
        }
    finally:
        db.close()


@app.post("/api/pet/feed")
def feed_pet(data: FeedPetRequest):
    """Restores pet hunger, awards XP, and directly updates current_section_id in SQLite."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        if user.is_dead:
            raise HTTPException(status_code=400, detail="Your pet has passed away.")

        # 1. Calculate XP and Level (tiered by the pet's current level; level = cbrt(total XP))
        now = datetime.utcnow()
        old_xp = user.xp or 0
        old_level = level_from_xp(old_xp)
        xp_gained = get_feeding_xp(old_level)
        new_xp = min(old_xp + xp_gained, MAX_XP)
        new_level = level_from_xp(new_xp)

        # 2. Increment section index
        total_sections = db.query(Section).count()
        current_idx = user.current_section_id if user.current_section_id else 1

        if total_sections > 0:
            if current_idx >= total_sections:
                next_idx = 1
            else:
                next_idx = current_idx + 1
        else:
            next_idx = 1

        # 3. Perform Direct SQL Update to prevent ORM caching bugs
        db.query(User).filter(User.id == data.user_id).update(
            {
                # reading now moves forward in /api/reading/complete
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

class RestartPetRequest(BaseModel):
    user_id: int


@app.post("/api/pet/restart")
def restart_pet(data: RestartPetRequest):
    """After the pet dies: start over with a new egg (XP 0, Lv 1, hunger full)."""
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

class ReadingDoneRequest(BaseModel):
    user_id: int


@app.post("/api/reading/complete")
def complete_reading(data: ReadingDoneRequest):
    """Player pressed DONE: move to the next passage (back to the first after the last one)."""
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
# FORGOT PASSWORD (6-digit code by email) - see password_reset.py
# ------------------------------------------------------------------------------
import password_reset
password_reset.setup(app, SessionLocal, User, Base, engine)

# ------------------------------------------------------------------------------
# VERSE MEMORIZATION XP - see memorize.py
# ------------------------------------------------------------------------------
import memorize
memorize.setup(app, SessionLocal, User, get_feeding_xp, level_from_xp, xp_for_level, MAX_XP)
