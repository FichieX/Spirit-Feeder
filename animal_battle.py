"""
Animal type chart and verse-based move system for Spirit Feeder.

This adds a balanced 6-animal paper-rock-scissors system to the backend and
exposes it through simple FastAPI endpoints so the mobile app can use it.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Integer, String

ANIMAL_TYPE_CHART: Dict[str, Dict[str, Any]] = {
    "lion": {
        "name": "Lion",
        "type": "Royal",
        "strong_against": ["camel", "raven"],
        "weak_to": ["dove", "donkey"],
        "neutral": ["fish"],
        "moves": [
            {
                "key": "roar_of_judah",
                "name": "Roar of Judah",
                "verse_ref": "Revelation 5:5",
                "description": "Hits the target and lowers attack.",
                "power": 80,
                "accuracy": 100,
            },
            {
                "key": "den_of_deliverance",
                "name": "Den of Deliverance",
                "verse_ref": "Daniel 6:22",
                "description": "Protects from damage for one turn.",
                "power": 0,
                "accuracy": 100,
            },
            {
                "key": "prey_tear",
                "name": "Prey Tear",
                "verse_ref": "Psalm 17:12",
                "description": "Priority physical strike.",
                "power": 92,
                "accuracy": 100,
            },
            {
                "key": "wrath_of_the_king",
                "name": "Wrath of the King",
                "verse_ref": "Proverbs 19:12",
                "description": "Finishing move with extra damage if used after the enemy attacks.",
                "power": 110,
                "accuracy": 100,
            },
        ],
    },
    "donkey": {
        "name": "Donkey",
        "type": "Ground",
        "strong_against": ["lion", "dove"],
        "weak_to": ["raven", "fish"],
        "neutral": ["camel"],
        "moves": [
            {
                "key": "balaams_rebuke",
                "name": "Balaam’s Rebuke",
                "verse_ref": "Numbers 22:28",
                "description": "Cancels the opponent's move and confuses them.",
                "power": 78,
                "accuracy": 100,
            },
            {
                "key": "angelic_vision",
                "name": "Angelic Vision",
                "verse_ref": "Numbers 22:23",
                "description": "Priority protect move.",
                "power": 0,
                "accuracy": 100,
            },
            {
                "key": "issachars_burden",
                "name": "Issachar’s Burden",
                "verse_ref": "Genesis 49:14",
                "description": "Raises defense and special defense.",
                "power": 0,
                "accuracy": 100,
            },
            {
                "key": "unbroken_colt",
                "name": "Unbroken Colt",
                "verse_ref": "Mark 11:2",
                "description": "Powerful first-battle attack.",
                "power": 96,
                "accuracy": 100,
            },
        ],
    },
    "camel": {
        "name": "Camel",
        "type": "Desert",
        "strong_against": ["dove", "fish"],
        "weak_to": ["lion", "donkey"],
        "neutral": ["raven"],
        "moves": [
            {
                "key": "queens_tribute",
                "name": "Queen’s Tribute",
                "verse_ref": "1 Kings 10:2",
                "description": "Lowers enemy attack and special attack.",
                "power": 72,
                "accuracy": 100,
            },
            {
                "key": "midianite_swarm",
                "name": "Midianite Swarm",
                "verse_ref": "Judges 7:12",
                "description": "Multi-hit physical attack.",
                "power": 88,
                "accuracy": 100,
            },
            {
                "key": "desert_ship",
                "name": "Desert Ship",
                "verse_ref": "Isaiah 60:6",
                "description": "Summons weather and boosts endurance.",
                "power": 0,
                "accuracy": 100,
            },
            {
                "key": "endurance_trek",
                "name": "Endurance Trek",
                "verse_ref": "Genesis 31:17",
                "description": "Survives a fatal hit with 1 HP remaining.",
                "power": 0,
                "accuracy": 100,
            },
        ],
    },
    "raven": {
        "name": "Raven",
        "type": "Dark",
        "strong_against": ["donkey", "fish"],
        "weak_to": ["dove", "lion"],
        "neutral": ["camel"],
        "moves": [
            {
                "key": "eye_pluck",
                "name": "Eye Pluck",
                "verse_ref": "Proverbs 30:17",
                "description": "Highly accurate strike that lowers accuracy.",
                "power": 82,
                "accuracy": 95,
            },
            {
                "key": "noahs_scout",
                "name": "Noah’s Scout",
                "verse_ref": "Genesis 8:7",
                "description": "Two-turn move that dodges and strikes.",
                "power": 90,
                "accuracy": 100,
            },
            {
                "key": "plumage_of_night",
                "name": "Plumage of Night",
                "verse_ref": "Song of Solomon 5:11",
                "description": "Raises evasion and dark power.",
                "power": 0,
                "accuracy": 100,
            },
            {
                "key": "unclean_dive",
                "name": "Unclean Dive",
                "verse_ref": "Leviticus 11:15",
                "description": "Poison chance and dark/flying damage.",
                "power": 88,
                "accuracy": 100,
            },
        ],
    },
    "dove": {
        "name": "Dove",
        "type": "Spirit",
        "strong_against": ["lion", "raven"],
        "weak_to": ["fish", "camel"],
        "neutral": ["donkey"],
        "moves": [
            {
                "key": "olive_branch",
                "name": "Olive Branch",
                "verse_ref": "Genesis 8:11",
                "description": "Pacifies the target and prevents damaging attacks next turn.",
                "power": 0,
                "accuracy": 100,
            },
            {
                "key": "jordan_descent",
                "name": "Jordan Descent",
                "verse_ref": "Matthew 3:16",
                "description": "Special damage and stat boost.",
                "power": 92,
                "accuracy": 100,
            },
            {
                "key": "innocent_flight",
                "name": "Innocent Flight",
                "verse_ref": "Matthew 10:16",
                "description": "Guaranteed dodge and immunity to taunt.",
                "power": 0,
                "accuracy": 100,
            },
            {
                "key": "purification",
                "name": "Purification",
                "verse_ref": "Leviticus 12:8",
                "description": "Removes hazards, weather, and stat debuffs.",
                "power": 0,
                "accuracy": 100,
            },
        ],
    },
    "fish": {
        "name": "Fish",
        "type": "Miracle",
        "strong_against": ["dove", "donkey"],
        "weak_to": ["camel", "raven"],
        "neutral": ["lion"],
        "moves": [
            {
                "key": "jonahs_swallow",
                "name": "Jonah’s Swallow",
                "verse_ref": "Jonah 1:17",
                "description": "Trap move that deals damage over several turns.",
                "power": 90,
                "accuracy": 100,
            },
            {
                "key": "right_side_net",
                "name": "Right Side Net",
                "verse_ref": "John 21:6",
                "description": "Never misses and prevents escape.",
                "power": 85,
                "accuracy": 100,
            },
            {
                "key": "tiberias_swarm",
                "name": "Tiberias Swarm",
                "verse_ref": "Luke 5:6",
                "description": "Multi-hit attack.",
                "power": 86,
                "accuracy": 100,
            },
            {
                "key": "depths_of_the_sea",
                "name": "Depths of the Sea",
                "verse_ref": "Micah 7:19",
                "description": "Resets the target’s stat boosts.",
                "power": 0,
                "accuracy": 100,
            },
        ],
    },
}


def type_multiplier(attacker_key: str, defender_key: str) -> float:
    attacker = ANIMAL_TYPE_CHART.get(attacker_key)
    defender = ANIMAL_TYPE_CHART.get(defender_key)
    if not attacker or not defender:
        return 1.0
    if defender_key in attacker.get("strong_against", []):
        return 1.5
    if defender_key in attacker.get("weak_to", []):
        return 0.7
    if defender_key in attacker.get("neutral", []):
        return 1.0
    if attacker_key in defender.get("strong_against", []):
        return 0.7
    if attacker_key in defender.get("weak_to", []):
        return 1.5
    return 1.0


def resolve_move_damage(attacker_key: str, defender_key: str, move_key: str, attacker_level: int = 1, defender_level: int = 1) -> Dict[str, Any]:
    move = next((m for m in ANIMAL_TYPE_CHART.get(attacker_key, {}).get("moves", []) if m["key"] == move_key), None)
    if move is None:
        raise ValueError(f"Move {move_key!r} not found for {attacker_key!r}.")
    power = int(move.get("power", 70))
    base = power + max(0, attacker_level * 3) - max(0, defender_level * 2)
    damage = int(round(base * type_multiplier(attacker_key, defender_key)))
    return {
        "attacker": attacker_key,
        "defender": defender_key,
        "move": move["name"],
        "move_key": move_key,
        "power": power,
        "multiplier": type_multiplier(attacker_key, defender_key),
        "damage": max(0, damage),
        "effective": type_multiplier(attacker_key, defender_key) > 1.0,
        "ineffective": type_multiplier(attacker_key, defender_key) < 1.0,
    }


class AnimalMoveUnlock(BaseModel):
    user_id: int
    animal_key: str
    move_key: str
    verse_ref: str


class AnimalBattleTurn(BaseModel):
    attacker_key: str
    defender_key: str
    move_key: str
    attacker_level: int = 1
    defender_level: int = 1


class AnimalMoveDefinition(Base):
    __tablename__ = "animal_move_definitions"
    id = Column(Integer, primary_key=True, index=True)
    animal_key = Column(String, index=True, nullable=False)
    move_key = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    verse_ref = Column(String, nullable=False)
    description = Column(String, nullable=False)
    power = Column(Integer, default=70)
    accuracy = Column(Integer, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)


class AnimalMoveUnlockRecord(Base):
    __tablename__ = "animal_move_unlocks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    animal_key = Column(String, index=True, nullable=False)
    move_key = Column(String, index=True, nullable=False)
    verse_ref = Column(String, nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)


def setup(app, SessionLocal, User, Base, engine, level_from_xp, xp_for_level, MAX_XP):
    Base.metadata.create_all(bind=engine)

    @app.get("/api/animals/types")
    def animal_types():
        return {
            "chart": {
                key: {
                    "name": value["name"],
                    "type": value["type"],
                    "strong_against": value["strong_against"],
                    "weak_to": value["weak_to"],
                    "neutral": value["neutral"],
                }
                for key, value in ANIMAL_TYPE_CHART.items()
            },
            "animals": [
                {"key": key, "name": value["name"], "type": value["type"]} for key, value in ANIMAL_TYPE_CHART.items()
            ],
        }

    @app.get("/api/animals/moves/{animal_key}")
    def animal_moves(animal_key: str):
        key = animal_key.lower().strip()
        if key not in ANIMAL_TYPE_CHART:
            raise HTTPException(status_code=404, detail=f"Unknown animal type: {animal_key}")
        return {"animal": key, "moves": ANIMAL_TYPE_CHART[key]["moves"]}

    @app.get("/api/animals/moves/unlocked/{user_id}/{animal_key}")
    def unlocked_moves_for_user(user_id: int, animal_key: str):
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")
            rows = (
                db.query(AnimalMoveUnlockRecord)
                .filter_by(user_id=user_id, animal_key=animal_key.lower())
                .all()
            )
            unlocked = [r.move_key for r in rows]
            all_moves = ANIMAL_TYPE_CHART.get(animal_key.lower(), {}).get("moves", [])
            return {
                "animal": animal_key.lower(),
                "unlocked": unlocked,
                "available": all_moves,
            }
        finally:
            db.close()

    @app.post("/api/animals/move/unlock")
    def unlock_move(data: AnimalMoveUnlock):
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == data.user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")
            animal_key = data.animal_key.lower()
            if animal_key not in ANIMAL_TYPE_CHART:
                raise HTTPException(status_code=404, detail=f"Unknown animal type: {data.animal_key}")
            move = next((m for m in ANIMAL_TYPE_CHART[animal_key]["moves"] if m["key"] == data.move_key), None)
            if move is None:
                raise HTTPException(status_code=404, detail=f"Move {data.move_key} not found for animal {animal_key}.")
            existing = (
                db.query(AnimalMoveUnlockRecord)
                .filter_by(user_id=data.user_id, animal_key=animal_key, move_key=data.move_key)
                .first()
            )
            if existing:
                return {"message": "Move already unlocked.", "unlocked": True, "already_unlocked": True}
            db.add(
                AnimalMoveUnlockRecord(
                    user_id=data.user_id,
                    animal_key=animal_key,
                    move_key=data.move_key,
                    verse_ref=data.verse_ref,
                )
            )
            db.commit()
            return {
                "message": "Move unlocked!",
                "unlocked": True,
                "already_unlocked": False,
                "move": move,
            }
        finally:
            db.close()

    @app.post("/api/animals/battle/calc")
    def calculate_turn(data: AnimalBattleTurn):
        attacker_key = data.attacker_key.lower()
        defender_key = data.defender_key.lower()
        if attacker_key not in ANIMAL_TYPE_CHART or defender_key not in ANIMAL_TYPE_CHART:
            raise HTTPException(status_code=400, detail="Both attacker and defender must be known animal types.")
        result = resolve_move_damage(
            attacker_key=attacker_key,
            defender_key=defender_key,
            move_key=data.move_key,
            attacker_level=data.attacker_level,
            defender_level=data.defender_level,
        )
        return {"result": result}

    @app.get("/api/animals/balance")
    def balance_chart():
        return {"chart": ANIMAL_TYPE_CHART}

    return {
        "chart": ANIMAL_TYPE_CHART,
        "resolve_move_damage": resolve_move_damage,
    }
