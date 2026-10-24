"""
Serpent battle results: XP for winning, XP loss for losing.

Turn it on by adding these two lines at the very bottom of main.py:

    import serpent
    serpent.setup(app, SessionLocal, User, Base, engine, get_quiz_xp_reward, level_from_xp, xp_for_level, MAX_XP)

Endpoint:
    POST /api/battle/serpent   {user_id, milestone, won}
        won = true   -> + get_quiz_xp_reward(level) XP, only the FIRST time each serpent
                        (Lv 5, 10, 15 ...) is beaten, so it can't be farmed
        won = false  -> lose 30% of the current level's XP bar (never drops a level)
"""
LOSS_SHARE = 0.3  # losing takes 30% of the current level's XP bar


def setup(app, SessionLocal, User, Base, engine, get_quiz_xp_reward, level_from_xp, xp_for_level, MAX_XP):
    from fastapi import HTTPException
    from pydantic import BaseModel
    from sqlalchemy import Column, Integer

    class SerpentWin(Base):
        __tablename__ = "serpent_wins"
        id = Column(Integer, primary_key=True, index=True)
        user_id = Column(Integer, index=True, nullable=False)
        milestone = Column(Integer, nullable=False)  # 5, 10, 15 ...

    Base.metadata.create_all(bind=engine)

    class SerpentResult(BaseModel):
        user_id: int
        milestone: int
        won: bool

    @app.post("/api/battle/serpent")
    def serpent_result(data: SerpentResult):
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == data.user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")
            if user.is_dead:
                raise HTTPException(status_code=400, detail="Your pet has passed away.")
            old_xp = user.xp or 0
            level = level_from_xp(old_xp)
            note = ""
            if data.won:
                beaten = db.query(SerpentWin).filter_by(user_id=user.id, milestone=data.milestone).first()
                if data.milestone < 5 or data.milestone % 5 != 0 or data.milestone > level:
                    change, note = 0, "This serpent doesn't match your level, so no XP."
                elif beaten:
                    change, note = 0, "You already beat this serpent before."
                else:
                    change = get_quiz_xp_reward(level)
                    db.add(SerpentWin(user_id=user.id, milestone=data.milestone))
            else:
                start = xp_for_level(level)
                bar = xp_for_level(level + 1) - start
                change = -min(old_xp - start, round(bar * LOSS_SHARE))  # never below this level
            new_xp = max(0, min(old_xp + change, MAX_XP))
            new_level = level_from_xp(new_xp)
            user.xp = new_xp
            user.animal_level = new_level
            db.commit()
            return {
                "xp_change": new_xp - old_xp,
                "xp": new_xp,
                "animal_level": new_level,
                "leveled_up": new_level > level,
                "next_level_xp": xp_for_level(new_level + 1),
                "note": note,
            }
        finally:
            db.close()
