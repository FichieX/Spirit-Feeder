"""
Verse memorization XP for Spirit Feeder.

Turn it on by adding these two lines at the very bottom of main.py:

    import memorize
    memorize.setup(app, SessionLocal, User, Base, engine, get_feeding_xp, level_from_xp, xp_for_level, MAX_XP)

Endpoints:
    POST /api/memorize/complete   {user_id, verse, kind}
        kind = "new"      learned a new verse      -> same XP as one feeding
               "review"   reviewed a due verse     -> same XP as one feeding
               "practice" extra practice           -> half that XP
    GET  /api/memorize/today/{user_id}   -> how much memorize XP was earned today

Daily limit: memorizing can give at most about ONE LEVEL of XP per day:
    limit = XP needed to go from your level to the next one, but at least MIN_DAILY_XP.
    (Lv 1-9: 300, Lv 10: 331, Lv 20: 1261, Lv 30: 2791, Lv 50: 7651.)
Feeding XP doesn't count toward it.
Water (food) is limited to 3 a day, but that's counted in the app.
"""
from datetime import datetime

MIN_DAILY_XP = 300  # the daily limit is never lower than this


def today_key():
    return datetime.now().strftime("%Y-%m-%d")  # the server's local day


def setup(app, SessionLocal, User, Base, engine, get_feeding_xp, level_from_xp, xp_for_level, MAX_XP):
    from fastapi import HTTPException
    from pydantic import BaseModel
    from sqlalchemy import Column, Integer, String

    class MemorizeXpDay(Base):
        __tablename__ = "memorize_xp_days"
        id = Column(Integer, primary_key=True, index=True)
        user_id = Column(Integer, index=True, nullable=False)
        day = Column(String, index=True, nullable=False)  # "2026-10-08"
        xp = Column(Integer, default=0)

    Base.metadata.create_all(bind=engine)

    def daily_limit(level):
        return max(MIN_DAILY_XP, xp_for_level(level + 1) - xp_for_level(level))

    class MemorizeRequest(BaseModel):
        user_id: int
        verse: str
        kind: str = "new"

    def day_row(db, user_id):
        day = today_key()
        row = db.query(MemorizeXpDay).filter_by(user_id=user_id, day=day).first()
        if not row:
            row = MemorizeXpDay(user_id=user_id, day=day, xp=0)
            db.add(row)
            db.flush()
        return row

    @app.get("/api/memorize/today/{user_id}")
    def memorize_today(user_id: int):
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")
            row = db.query(MemorizeXpDay).filter_by(user_id=user_id, day=today_key()).first()
            return {"today_xp": row.xp if row else 0, "daily_limit": daily_limit(level_from_xp(user.xp))}
        finally:
            db.close()

    @app.post("/api/memorize/complete")
    def memorize_complete(data: MemorizeRequest):
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == data.user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")
            if user.is_dead:
                raise HTTPException(status_code=400, detail="Your pet has passed away. Hatch a new egg first.")
            today = day_row(db, user.id)
            old_xp = user.xp or 0
            old_level = level_from_xp(old_xp)
            gained = get_feeding_xp(old_level)
            if data.kind == "practice":
                gained = max(5, gained // 2)
            limit = daily_limit(old_level)
            gained = max(0, min(gained, limit - (today.xp or 0)))  # daily limit
            new_xp = min(old_xp + gained, MAX_XP)
            new_level = level_from_xp(new_xp)
            user.xp = new_xp
            user.animal_level = new_level
            today.xp = (today.xp or 0) + (new_xp - old_xp)
            db.commit()
            return {
                "message": "Verse memorized!",
                "xp_gained": new_xp - old_xp,
                "xp": new_xp,
                "animal_level": new_level,
                "leveled_up": new_level > old_level,
                "next_level_xp": xp_for_level(new_level + 1),
                "today_xp": today.xp,
                "daily_limit": daily_limit(new_level),
            }
        finally:
            db.close()
