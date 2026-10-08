"""
Test tools for the dev accounts only (tester, test, admin - same list as the app's TestPanel).

Turn it on by adding these two lines at the very bottom of main.py (add_testing.py does it for you):

    import testing
    testing.setup(app, SessionLocal, User, level_from_xp, MAX_XP)

Endpoint:
    POST /api/test/xp  {user_id, xp}   saves a test account's XP on the server

Why: the TEST tools in the app (Level +1, Adult, XP 50% ...) change the level on the phone.
Saving it here too means friends, battles and the leaderboard show the same level.
Every other account gets "Only test accounts can do this."
"""
TEST_USERS = ("tester", "test", "admin")


def setup(app, SessionLocal, User, level_from_xp, MAX_XP):
    from fastapi import HTTPException
    from pydantic import BaseModel

    class XpIn(BaseModel):
        user_id: int
        xp: int

    @app.post("/api/test/xp")
    def set_test_xp(data: XpIn):
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == data.user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")
            if (user.username or "").strip().lower() not in TEST_USERS:
                raise HTTPException(status_code=403, detail="Only test accounts can do this.")
            xp = max(0, min(int(data.xp), MAX_XP))
            user.xp = xp
            user.animal_level = level_from_xp(xp)
            db.commit()
            return {"xp": xp, "level": user.animal_level}
        finally:
            db.close()
