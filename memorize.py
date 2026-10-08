"""
Verse memorization XP for Spirit Feeder.

Turn it on by adding these two lines at the very bottom of main.py:

    import memorize
    memorize.setup(app, SessionLocal, User, get_feeding_xp, level_from_xp, xp_for_level, MAX_XP)

Endpoint:
    POST /api/memorize/complete   {user_id, verse, kind}
        kind = "new"      learned a new verse      -> same XP as one feeding
               "review"   reviewed a due verse     -> same XP as one feeding
               "practice" extra practice           -> half that XP
    XP has no daily limit (players can level up without waiting to get hungry).
    Water (food) is limited to 3 a day, but that's counted in the app.
"""


def setup(app, SessionLocal, User, get_feeding_xp, level_from_xp, xp_for_level, MAX_XP):
    from fastapi import HTTPException
    from pydantic import BaseModel

    class MemorizeRequest(BaseModel):
        user_id: int
        verse: str
        kind: str = "new"

    @app.post("/api/memorize/complete")
    def memorize_complete(data: MemorizeRequest):
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == data.user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")
            if user.is_dead:
                raise HTTPException(status_code=400, detail="Your pet has passed away. Hatch a new egg first.")
            old_xp = user.xp or 0
            old_level = level_from_xp(old_xp)
            gained = get_feeding_xp(old_level)
            if data.kind == "practice":
                gained = max(5, gained // 2)
            new_xp = min(old_xp + gained, MAX_XP)
            new_level = level_from_xp(new_xp)
            user.xp = new_xp
            user.animal_level = new_level
            db.commit()
            return {
                "message": "Verse memorized!",
                "xp_gained": new_xp - old_xp,
                "xp": new_xp,
                "animal_level": new_level,
                "leveled_up": new_level > old_level,
                "next_level_xp": xp_for_level(new_level + 1),
            }
        finally:
            db.close()
