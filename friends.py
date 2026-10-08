"""
Friends for Spirit Feeder: add friends by username, see who's online, and battle them live.

Turn it on by adding these two lines at the very bottom of main.py (add_friends.py does it for you),
AFTER the pvp.setup(...) line:

    import friends
    friends.setup(app, SessionLocal, User, Base, engine, level_from_xp)

Endpoints:
    GET  /api/friends/{user_id}                       my friends, requests to me, requests I sent
    GET  /api/friends/{user_id}/ping?screen=&ready=   "I'm online" + battle invites for me
                                                      (the app calls this every few seconds)
    POST /api/friends/request         {user_id, username}           send a friend request
    POST /api/friends/respond         {user_id, request_id, accept} accept / decline a request
    POST /api/friends/remove          {user_id, friend_id}          unfriend, or cancel my request
    POST /api/friends/battle          {user_id, friend_id, mode}    invite a friend: mode "fun" or "ranked"
    POST /api/friends/battle/respond  {user_id, invite_id, accept}  the friend accepts / declines

Table: friendships (requester_id, addressee_id, status "pending" or "accepted")
The live battle itself runs in pvp.py over the same /ws/battle socket as ranked battles.
"""
import time
from datetime import datetime

import pvp

ONLINE_SECONDS = 15   # seen this recently = online (the app pings every 4 seconds)
MAX_FRIENDS = 100
MODES = ("fun", "ranked")


def setup(app, SessionLocal, User, Base, engine, level_from_xp):
    from fastapi import HTTPException
    from pydantic import BaseModel
    from sqlalchemy import Column, DateTime, Integer, String, and_, func, or_

    class Friendship(Base):
        __tablename__ = "friendships"
        id = Column(Integer, primary_key=True, index=True)
        requester_id = Column(Integer, index=True, nullable=False)
        addressee_id = Column(Integer, index=True, nullable=False)
        status = Column(String, default="pending")  # "pending" or "accepted"
        created_at = Column(DateTime, default=datetime.utcnow)

    Base.metadata.create_all(bind=engine)

    # Who's online (kept in memory: user id -> (last ping time, screen, pet hatched))
    seen = {}

    class RequestIn(BaseModel):
        user_id: int
        username: str

    class RespondIn(BaseModel):
        user_id: int
        request_id: int
        accept: bool

    class RemoveIn(BaseModel):
        user_id: int
        friend_id: int

    class BattleIn(BaseModel):
        user_id: int
        friend_id: int
        mode: str = "fun"

    class BattleRespondIn(BaseModel):
        user_id: int
        invite_id: str
        accept: bool

    # ---------- helpers ----------
    def get_user(db, user_id):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        return user

    def link(db, a, b):
        """The friendship row between two players (either direction), or None."""
        return db.query(Friendship).filter(or_(
            and_(Friendship.requester_id == a, Friendship.addressee_id == b),
            and_(Friendship.requester_id == b, Friendship.addressee_id == a),
        )).first()

    def status_of(user):
        if user.id in pvp.BUSY:
            return "battle"     # in a live battle
        last = seen.get(user.id)
        if not last or time.time() - last[0] > ONLINE_SECONDS:
            return "offline"
        if last[1] == "battle":
            return "serpent"    # fighting a serpent
        return "online"

    def card(user):
        last = seen.get(user.id)
        status = status_of(user)
        return {
            "userId": user.id,
            "username": user.username,
            "animalId": user.animal_id or 1,
            "level": level_from_xp(user.xp or 0),
            "status": status,
            "canBattle": status == "online" and bool(last and last[2]) and not user.is_dead,
        }

    def friend_count(db, user_id):
        return db.query(Friendship).filter(
            Friendship.status == "accepted",
            or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id),
        ).count()

    # ---------- friend list ----------
    @app.get("/api/friends/{user_id}")
    def list_friends(user_id: int):
        db = SessionLocal()
        try:
            get_user(db, user_id)
            rows = db.query(Friendship).filter(
                or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id)
            ).all()
            other_ids = {r.addressee_id if r.requester_id == user_id else r.requester_id for r in rows}
            users = {u.id: u for u in db.query(User).filter(User.id.in_(other_ids)).all()} if other_ids else {}
            friends, incoming, outgoing = [], [], []
            for r in rows:
                other = users.get(r.addressee_id if r.requester_id == user_id else r.requester_id)
                if not other:
                    continue
                if r.status == "accepted":
                    friends.append(card(other))
                elif r.addressee_id == user_id:
                    incoming.append({"requestId": r.id, **card(other)})
                else:
                    outgoing.append({"requestId": r.id, **card(other)})
            order = {"online": 0, "battle": 1, "serpent": 2, "offline": 3}
            friends.sort(key=lambda f: (order[f["status"]], f["username"].lower()))
            return {"friends": friends, "incoming": incoming, "outgoing": outgoing}
        finally:
            db.close()

    @app.get("/api/friends/{user_id}/ping")
    async def ping(user_id: int, screen: str = "", ready: int = 1):
        seen[user_id] = (time.time(), screen.strip("/"), bool(ready))
        db = SessionLocal()
        try:
            requests = db.query(Friendship).filter_by(addressee_id=user_id, status="pending").count()
        finally:
            db.close()
        return {"invites": pvp.HUB.incoming(user_id), "requests": requests}

    # ---------- requests ----------
    @app.post("/api/friends/request")
    def send_request(data: RequestIn):
        name = data.username.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Type your friend's username.")
        db = SessionLocal()
        try:
            me = get_user(db, data.user_id)
            other = db.query(User).filter(func.lower(User.username) == name.lower()).first()
            if not other:
                raise HTTPException(status_code=404, detail=f'No player called "{name}". Check the spelling.')
            if other.id == me.id:
                raise HTTPException(status_code=400, detail="That's you! Type a friend's username.")
            row = link(db, me.id, other.id)
            if row and row.status == "accepted":
                raise HTTPException(status_code=400, detail=f"You're already friends with {other.username}.")
            if row and row.requester_id == me.id:
                raise HTTPException(status_code=400, detail=f"You already sent {other.username} a request.")
            if friend_count(db, me.id) >= MAX_FRIENDS:
                raise HTTPException(status_code=400, detail=f"You can have up to {MAX_FRIENDS} friends.")
            if row:  # they already asked me: that's a yes from both sides
                row.status = "accepted"
                db.commit()
                return {"message": f"You and {other.username} are friends now!", "status": "accepted"}
            db.add(Friendship(requester_id=me.id, addressee_id=other.id, status="pending"))
            db.commit()
            return {"message": f"Friend request sent to {other.username}.", "status": "pending"}
        finally:
            db.close()

    @app.post("/api/friends/respond")
    def respond_request(data: RespondIn):
        db = SessionLocal()
        try:
            row = db.query(Friendship).filter_by(id=data.request_id, addressee_id=data.user_id, status="pending").first()
            if not row:
                raise HTTPException(status_code=404, detail="That friend request isn't there anymore.")
            other = get_user(db, row.requester_id)
            if data.accept:
                if friend_count(db, data.user_id) >= MAX_FRIENDS:
                    raise HTTPException(status_code=400, detail=f"You can have up to {MAX_FRIENDS} friends.")
                row.status = "accepted"
                message = f"You and {other.username} are friends now!"
            else:
                db.delete(row)
                message = "Request declined."
            db.commit()
            return {"message": message}
        finally:
            db.close()

    @app.post("/api/friends/remove")
    def remove_friend(data: RemoveIn):
        db = SessionLocal()
        try:
            row = link(db, data.user_id, data.friend_id)
            if not row:
                raise HTTPException(status_code=404, detail="You're not friends with that player.")
            db.delete(row)
            db.commit()
            return {"message": "Removed."}
        finally:
            db.close()

    # ---------- live battles ----------
    @app.post("/api/friends/battle")
    async def invite_battle(data: BattleIn):
        if data.mode not in MODES:
            raise HTTPException(status_code=400, detail='Mode must be "fun" or "ranked".')
        db = SessionLocal()
        try:
            me = get_user(db, data.user_id)
            friend = get_user(db, data.friend_id)
            row = link(db, me.id, friend.id)
            if not row or row.status != "accepted":
                raise HTTPException(status_code=400, detail=f"Add {friend.username} as a friend first.")
            if me.is_dead:
                raise HTTPException(status_code=400, detail="Your pet has passed away. Hatch a new egg first.")
            if me.id in pvp.BUSY:
                raise HTTPException(status_code=400, detail="Finish your battle first.")
            # They already invited me? Then this is a yes.
            theirs = pvp.HUB.pending_between(me.id, friend.id)
            if theirs and theirs.host_id == friend.id:
                error = await pvp.HUB.respond(theirs.id, me.id, True)
                if not error:
                    return {"inviteId": theirs.id, "accepted": True, "mode": theirs.mode, "friend": friend.username}
            status = status_of(friend)
            last = seen.get(friend.id)
            if friend.is_dead:
                raise HTTPException(status_code=400, detail=f"{friend.username}'s pet can't battle right now.")
            if status == "battle":
                raise HTTPException(status_code=400, detail=f"{friend.username} is in a battle right now. Try again soon.")
            if status == "serpent":
                raise HTTPException(status_code=400, detail=f"{friend.username} is fighting a serpent right now. Try again soon.")
            if status == "offline":
                raise HTTPException(status_code=400, detail=f"{friend.username} isn't online right now.")
            if last and not last[2]:
                raise HTTPException(status_code=400, detail=f"{friend.username}'s egg hasn't hatched yet.")
            invite = await pvp.HUB.create(me.id, me.username, friend.id, friend.username, data.mode)
            return {"inviteId": invite.id, "accepted": False, "mode": invite.mode,
                    "friend": friend.username, "seconds": pvp.INVITE_SECONDS}
        finally:
            db.close()

    @app.post("/api/friends/battle/respond")
    async def respond_battle(data: BattleRespondIn):
        error = await pvp.HUB.respond(data.invite_id, data.user_id, data.accept)
        if error:
            raise HTTPException(status_code=400, detail=error)
        return {"ok": True}
