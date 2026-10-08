"""
Change your username - once. After that it's permanent.

Turn it on by adding these two lines at the very bottom of main.py (add_account.py does it for you):

    import account
    account.setup(app, SessionLocal, User, Base, engine)

Endpoints:
    GET  /api/account/{user_id}    {username, canChangeUsername}
    POST /api/account/username     {user_id, new_username}  -> {username}

Rules: 3 to 20 letters, numbers or _ (same as signing up), not taken (any capitals),
not a test-account name, and only one change per account.
Friends, points and the leaderboard follow the account id, so they keep working after a change.
Table: username_changes (one row per account that changed its name)
"""
import re
from datetime import datetime

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,20}$")
RESERVED = {"tester", "tester2", "tester3", "test", "admin"}  # these get test tools in the app


def setup(app, SessionLocal, User, Base, engine):
    from fastapi import HTTPException
    from pydantic import BaseModel
    from sqlalchemy import Column, DateTime, Integer, String, func

    class UsernameChange(Base):
        __tablename__ = "username_changes"
        id = Column(Integer, primary_key=True, index=True)
        user_id = Column(Integer, unique=True, index=True, nullable=False)
        old_username = Column(String, nullable=False)
        new_username = Column(String, nullable=False)
        changed_at = Column(DateTime, default=datetime.utcnow)

    Base.metadata.create_all(bind=engine)

    class UsernameIn(BaseModel):
        user_id: int
        new_username: str

    def get_user(db, user_id):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        return user

    @app.get("/api/account/{user_id}")
    def account_info(user_id: int):
        db = SessionLocal()
        try:
            user = get_user(db, user_id)
            changed = db.query(UsernameChange).filter_by(user_id=user_id).first() is not None
            is_test = (user.username or "").lower() in RESERVED
            return {"username": user.username, "canChangeUsername": not changed and not is_test}
        finally:
            db.close()

    @app.post("/api/account/username")
    def change_username(data: UsernameIn):
        new = data.new_username.strip()
        if not USERNAME_RE.match(new):
            raise HTTPException(status_code=400, detail="Use 3 to 20 letters, numbers, or underscores.")
        db = SessionLocal()
        try:
            user = get_user(db, data.user_id)
            if (user.username or "").lower() in RESERVED:
                raise HTTPException(status_code=400, detail="Test accounts can't change their username.")
            if db.query(UsernameChange).filter_by(user_id=user.id).first():
                raise HTTPException(status_code=400, detail="You already changed your username once, so it's permanent now.")
            if new == user.username:
                raise HTTPException(status_code=400, detail="That's already your username.")
            if new.lower() in RESERVED:
                raise HTTPException(status_code=400, detail="That username is taken. Try another one.")
            taken = db.query(User).filter(func.lower(User.username) == new.lower(), User.id != user.id).first()
            if taken:
                raise HTTPException(status_code=400, detail="That username is taken. Try another one.")
            db.add(UsernameChange(user_id=user.id, old_username=user.username, new_username=new, changed_at=datetime.utcnow()))
            user.username = new
            db.commit()
            return {"username": new, "message": f"Your username is now {new}."}
        finally:
            db.close()
