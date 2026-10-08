"""
Forgot password: a 6-digit code is emailed to the player, then they choose a new password.

Turn it on by adding these two lines at the very bottom of main.py:

    import password_reset
    password_reset.setup(app, SessionLocal, User, Base, engine)

Endpoints:
    POST /api/password/forgot   {email}                      -> emails a code (valid 15 minutes)
    POST /api/password/check    {email, code}                -> is the code right? (before typing a new password)
    POST /api/password/reset    {email, code, new_password}  -> sets the new password

Email settings go in a file called .env in the Spirit-Feeder folder (NEVER commit it):

    SMTP_USER=yourname@gmail.com
    SMTP_PASSWORD=abcdefghijklmnop

SMTP_PASSWORD is a Gmail "app password" (Google Account > Security > 2-Step Verification >
App passwords), not the normal Gmail password. Without these settings, the code is printed
in the server's terminal instead, so you can still test it.
"""
import hashlib
import os
import secrets
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage

CODE_MINUTES = 15       # how long a code works
MAX_TRIES = 5           # wrong guesses before the code stops working
RESEND_SECONDS = 60     # wait between codes for the same account
MIN_PASSWORD = 8        # same rule as the register screen

GENERIC = "If that email has an account, we sent it a 6-digit code."


def hash_code(user_id, code):
    # Codes are stored hashed, so someone reading the database can't use them
    return hashlib.sha256(f"{user_id}:{code}".encode()).hexdigest()


def send_code_email(to_address, code):
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    if not user or not password:
        print(f"\n*** PASSWORD RESET CODE for {to_address}: {code}  (email not set up yet, see password_reset.py) ***\n", flush=True)
        return
    msg = EmailMessage()
    msg["Subject"] = "Your Spirit Feeder reset code"
    msg["From"] = os.environ.get("SMTP_FROM", user)
    msg["To"] = to_address
    msg.set_content(
        f"Your Spirit Feeder password reset code is:\n\n    {code}\n\n"
        f"It works for {CODE_MINUTES} minutes. If you didn't ask for this, you can ignore this email."
    )
    host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    port = int(os.environ.get("SMTP_PORT", "587"))
    with smtplib.SMTP(host, port, timeout=15) as smtp:
        smtp.starttls()
        smtp.login(user, password)
        smtp.send_message(msg)


def setup(app, SessionLocal, User, Base, engine):
    from fastapi import HTTPException
    from pydantic import BaseModel
    from sqlalchemy import Boolean, Column, DateTime, Integer, String, func

    try:
        from dotenv import load_dotenv  # reads the .env file
        load_dotenv()
    except Exception:
        pass

    class PasswordResetCode(Base):
        __tablename__ = "password_reset_codes"
        id = Column(Integer, primary_key=True, index=True)
        user_id = Column(Integer, index=True, nullable=False)
        code_hash = Column(String, nullable=False)
        created_at = Column(DateTime, nullable=False)
        expires_at = Column(DateTime, nullable=False)
        tries = Column(Integer, default=0)
        used = Column(Boolean, default=False)

    Base.metadata.create_all(bind=engine)

    class ForgotRequest(BaseModel):
        email: str

    class CheckRequest(BaseModel):
        email: str
        code: str

    class ResetRequest(BaseModel):
        email: str
        code: str
        new_password: str

    def find_user(db, email):
        return db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()

    def valid_code(db, user, code):
        """Returns the code row if the code is right; otherwise raises a friendly error."""
        wrong = HTTPException(status_code=400, detail="That code is wrong or has expired.")
        if not user:
            raise wrong
        row = (
            db.query(PasswordResetCode)
            .filter_by(user_id=user.id, used=False)
            .order_by(PasswordResetCode.created_at.desc())
            .first()
        )
        if not row or row.expires_at < datetime.utcnow():
            raise wrong
        if row.tries >= MAX_TRIES:
            raise HTTPException(status_code=400, detail="Too many wrong tries. Ask for a new code.")
        if row.code_hash != hash_code(user.id, code.strip()):
            row.tries += 1
            db.commit()
            raise wrong
        return row

    @app.post("/api/password/forgot")
    def forgot_password(data: ForgotRequest):
        db = SessionLocal()
        try:
            user = find_user(db, data.email)
            if not user:
                return {"message": GENERIC}  # don't reveal which emails have accounts
            last = (
                db.query(PasswordResetCode)
                .filter_by(user_id=user.id)
                .order_by(PasswordResetCode.created_at.desc())
                .first()
            )
            now = datetime.utcnow()
            if last and (now - last.created_at).total_seconds() < RESEND_SECONDS:
                raise HTTPException(status_code=429, detail="Please wait a minute before asking for another code.")
            # Any older codes stop working
            db.query(PasswordResetCode).filter_by(user_id=user.id, used=False).update({PasswordResetCode.used: True})
            code = f"{secrets.randbelow(1_000_000):06d}"
            db.add(PasswordResetCode(
                user_id=user.id, code_hash=hash_code(user.id, code),
                created_at=now, expires_at=now + timedelta(minutes=CODE_MINUTES), tries=0, used=False,
            ))
            db.commit()
            try:
                send_code_email(user.email, code)
            except Exception as err:
                print("Reset email failed:", err, flush=True)
                raise HTTPException(status_code=500, detail="Couldn't send the email right now. Try again later.")
            return {"message": GENERIC}
        finally:
            db.close()

    @app.post("/api/password/check")
    def check_code(data: CheckRequest):
        db = SessionLocal()
        try:
            valid_code(db, find_user(db, data.email), data.code)
            return {"ok": True}
        finally:
            db.close()

    @app.post("/api/password/reset")
    def reset_password(data: ResetRequest):
        if len(data.new_password) < MIN_PASSWORD:
            raise HTTPException(status_code=400, detail=f"Use at least {MIN_PASSWORD} characters for your password.")
        db = SessionLocal()
        try:
            user = find_user(db, data.email)
            row = valid_code(db, user, data.code)
            row.used = True
            user.password = data.new_password  # same format register/login use in main.py
            db.commit()
            return {"message": "Password changed! You can log in now."}
        finally:
            db.close()
