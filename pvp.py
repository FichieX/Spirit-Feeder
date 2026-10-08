"""
Live ranked battles (player vs player) for Spirit Feeder.

Turn it on by adding these two lines at the very bottom of main.py:

    import pvp
    pvp.setup(app, SessionLocal, User, Base, engine, level_from_xp)

What it adds:
    WebSocket  /ws/battle/{user_id}       live matchmaking + battles
    GET        /api/ranked/{user_id}      my points, wins, losses and rank this month
    GET        /api/leaderboard           this month's top players (+ past winners)
    tables     ranked_scores              points per player per month ("season")

How a battle works (hearts duel, like Kahoot):
    - Both players get the same question at the same time, 15 seconds to answer.
    - Both right: the faster one attacks, the other loses a heart.
    - One right: they attack, the other loses a heart.
    - Both wrong / too slow: both lose a heart.
    - 3 hearts each. First to 0 loses. Both at 0 together: sudden death (1 heart each).
    - Power-ups (once per question each):
        freeze = the OPPONENT can't answer for 3 seconds
        shield = Immunity: your next lost heart is blocked
        fifty  = Eliminate: one wrong answer is removed (only for you)
    - Leaving the battle = you lose.

Points ("fair swap"): the winner takes points from the loser. Beating a higher-ranked
player gives up to 40, beating a lower one gives down to 10. Nobody goes below 0.
Points are kept per month. When a new month starts, see SEASON_RESET below.
"""
import asyncio
import random
import time
from datetime import datetime

from pvp_questions import QUESTIONS

# ---------------------------------------------------------------------------
# Settings (backend decides these)
# ---------------------------------------------------------------------------
SEASON_RESET = "half"     # new month: "half" = keep half your points, "zero" = everyone back to 0
HEARTS = 3
QUESTION_SECONDS = 15
MAX_QUESTIONS = 15        # after this many questions, more hearts wins (same hearts = draw)
FREEZE_SECONDS = 3
INTRO_SECONDS = 3.0       # "VS" screen before the first question
RESULT_SECONDS = 3.0      # time to show who attacked before the next question
POWERS = ("freeze", "shield", "fifty")


def season_key(when=None):
    return (when or datetime.utcnow()).strftime("%Y-%m")


def previous_season(key):
    year, month = (int(x) for x in key.split("-"))
    month -= 1
    if month == 0:
        year, month = year - 1, 12
    return f"{year:04d}-{month:02d}"


def points_change(winner_points, loser_points):
    """10 to 40 points: more for beating someone ranked higher than you."""
    diff = max(-400, min(400, loser_points - winner_points))
    return round(25 + 15 * diff / 400)


def pick_questions(pool, count):
    """Random questions that get harder as the battle goes: tier 1 first, one tier harder every 2 questions."""
    out, used = [], set()
    for i in range(count):
        want = min(5, 1 + i // 2)
        for tier in (want, want - 1, want + 1, want - 2, want + 2, want - 3, want + 3, want - 4, want + 4):
            left = [q for q in pool if q.get("tier", 1) == tier and q["q"] not in used]
            if left:
                q = random.choice(left)
                used.add(q["q"])
                out.append(q)
                break
    return out


# ---------------------------------------------------------------------------
# Players, matchmaking and battle rooms (no web or database code in here)
# ---------------------------------------------------------------------------
class Player:
    def __init__(self, ws, user_id, username, animal_id, level, points):
        self.ws = ws
        self.user_id = user_id
        self.username = username
        self.pet_name = username
        self.animal_id = animal_id or 1
        self.level = level or 1
        self.points = points
        self.room = None

    def public(self):
        return {
            "userId": self.user_id,
            "username": self.username,
            "petName": self.pet_name,
            "animalId": self.animal_id,
            "level": self.level,
            "points": self.points,
        }

    async def send(self, msg):
        try:
            await self.ws.send_json(msg)
        except Exception:
            pass  # they left; the room finds out from their "left" message


class Matchmaker:
    def __init__(self, on_finish):
        self.waiting = []
        self.lock = asyncio.Lock()
        self.on_finish = on_finish  # async (room, winner_or_None, loser_or_None) -> {player: (change, points)}

    async def join(self, player):
        async with self.lock:
            self.waiting = [w for w in self.waiting if w.user_id != player.user_id]
            others = self.waiting
            if not others:
                self.waiting.append(player)
                opponent = None
            else:
                opponent = min(others, key=lambda w: abs(w.points - player.points))
                self.waiting.remove(opponent)
        if opponent is None:
            await player.send({"type": "searching"})
            return None
        room = Room(opponent, player, self.on_finish)
        room.task = asyncio.create_task(room.run())
        return room

    async def leave(self, player):
        async with self.lock:
            if player in self.waiting:
                self.waiting.remove(player)


class Room:
    def __init__(self, a, b, on_finish, questions=None):
        self.players = [a, b]
        a.room = self
        b.room = self
        self.on_finish = on_finish
        self.inbox = asyncio.Queue()
        self.hearts = {a: HEARTS, b: HEARTS}
        self.shield = {a: False, b: False}
        self.frozen_until = {a: 0.0, b: 0.0}
        pool = questions if questions is not None else QUESTIONS
        self.questions = pick_questions(pool, MAX_QUESTIONS)
        self.task = None

    def other(self, p):
        return self.players[1] if p is self.players[0] else self.players[0]

    async def broadcast(self, make):
        for p in self.players:
            await p.send(make(p))

    async def _wait_message(self, until):
        timeout = until - time.monotonic()
        if timeout <= 0:
            return None, None
        try:
            return await asyncio.wait_for(self.inbox.get(), timeout)
        except asyncio.TimeoutError:
            return None, None

    async def _pause(self, seconds):
        """Wait, but notice if someone leaves. Returns the player who left (or None)."""
        until = time.monotonic() + seconds
        while True:
            p, msg = await self._wait_message(until)
            if p is None:
                return None
            if msg.get("type") == "left":
                return p

    async def run(self):
        a, b = self.players
        winner, reason = None, "hearts"
        try:
            await self.broadcast(lambda p: {
                "type": "match",
                "you": p.public(),
                "opp": self.other(p).public(),
                "hearts": HEARTS,
                "questionSeconds": QUESTION_SECONDS,
            })
            left = await self._pause(INTRO_SECONDS)
            if left:
                await self.finish(self.other(left), "left")
                return

            for n, q in enumerate(self.questions, start=1):
                choices = [q["correct"], *q["wrong"]]
                random.shuffle(choices)
                correct = choices.index(q["correct"])
                start = time.monotonic()
                deadline = start + QUESTION_SECONDS
                answers = {}
                used = {a: set(), b: set()}
                self.frozen_until = {a: 0.0, b: 0.0}
                await self.broadcast(lambda p: {
                    "type": "question", "n": n, "q": q["q"], "ref": q["ref"],
                    "choices": choices, "seconds": QUESTION_SECONDS,
                })

                left = None
                while len(answers) < 2:
                    p, msg = await self._wait_message(deadline)
                    if p is None:
                        break  # time is up
                    kind = msg.get("type")
                    if kind == "left":
                        left = p
                        break
                    if kind == "answer" and p not in answers and msg.get("n") == n:
                        now = time.monotonic()
                        choice = msg.get("choice")
                        if now < self.frozen_until[p] or not isinstance(choice, int) or not 0 <= choice < 3:
                            continue
                        answers[p] = (choice, now - start)
                        await self.other(p).send({"type": "opp_answered", "n": n})
                    elif kind == "power" and p not in answers:
                        power = msg.get("power")
                        if power not in POWERS or power in used[p]:
                            continue
                        used[p].add(power)
                        opp = self.other(p)
                        if power == "freeze":
                            self.frozen_until[opp] = time.monotonic() + FREEZE_SECONDS
                            await opp.send({"type": "frozen", "seconds": FREEZE_SECONDS})
                        elif power == "shield":
                            self.shield[p] = True
                        elif power == "fifty":
                            wrong = [i for i in range(3) if i != correct]
                            await p.send({"type": "eliminate", "n": n, "remove": random.choice(wrong)})
                        await p.send({"type": "power_ok", "power": power})
                        await opp.send({"type": "opp_power", "power": power})

                if left:
                    winner, reason = self.other(left), "left"
                    break

                right = {p: p in answers and answers[p][0] == correct for p in self.players}
                hits = {a: 0, b: 0}
                attacker = None
                if right[a] and right[b]:
                    attacker = a if answers[a][1] <= answers[b][1] else b
                    hits[self.other(attacker)] = 1
                elif right[a] or right[b]:
                    attacker = a if right[a] else b
                    hits[self.other(attacker)] = 1
                else:
                    hits[a] = hits[b] = 1
                blocked = {a: False, b: False}
                for p in self.players:
                    if hits[p] and self.shield[p]:
                        self.shield[p] = False
                        hits[p] = 0
                        blocked[p] = True
                    self.hearts[p] = max(0, self.hearts[p] - hits[p])

                def info(p):
                    ans = answers.get(p)
                    return {
                        "choice": ans[0] if ans else None,
                        "seconds": round(ans[1], 2) if ans else None,
                        "right": right[p],
                        "hit": hits[p] > 0,
                        "blocked": blocked[p],
                    }

                await self.broadcast(lambda p: {
                    "type": "result", "n": n, "correct": choices[correct], "correctIndex": correct, "ref": q["ref"],
                    "you": info(p), "opp": info(self.other(p)),
                    "attacker": "you" if attacker is p else ("opp" if attacker is not None else None),
                    "hearts": {"you": self.hearts[p], "opp": self.hearts[self.other(p)]},
                })

                dead = [p for p in self.players if self.hearts[p] == 0]
                if len(dead) == 1:
                    winner = self.other(dead[0])
                    break
                if len(dead) == 2:
                    for p in self.players:
                        self.hearts[p] = 1
                    await self.broadcast(lambda p: {"type": "sudden_death", "hearts": {"you": 1, "opp": 1}})

                left = await self._pause(RESULT_SECONDS)
                if left:
                    winner, reason = self.other(left), "left"
                    break
            else:
                # Ran out of questions: more hearts wins
                if self.hearts[a] != self.hearts[b]:
                    winner = a if self.hearts[a] > self.hearts[b] else b
                reason = "questions"
            await self.finish(winner, reason)
        finally:
            for p in self.players:
                if p.room is self:
                    p.room = None

    async def finish(self, winner, reason):
        loser = self.other(winner) if winner else None
        results = await self.on_finish(self, winner, loser)
        for p in self.players:
            change, points = results.get(p, (0, p.points))
            p.points = points
            await p.send({
                "type": "end",
                "result": "draw" if winner is None else ("win" if p is winner else "lose"),
                "reason": reason,
                "change": change,
                "points": points,
            })
            p.room = None


# ---------------------------------------------------------------------------
# Web + database (called from main.py)
# ---------------------------------------------------------------------------
def setup(app, SessionLocal, User, Base, engine, level_from_xp):
    from fastapi import HTTPException, WebSocket, WebSocketDisconnect
    from sqlalchemy import Column, Integer, String

    class RankedScore(Base):
        __tablename__ = "ranked_scores"
        id = Column(Integer, primary_key=True, index=True)
        user_id = Column(Integer, index=True, nullable=False)
        season = Column(String, index=True, nullable=False)  # "2026-10"
        points = Column(Integer, default=0)
        wins = Column(Integer, default=0)
        losses = Column(Integer, default=0)
        draws = Column(Integer, default=0)

    Base.metadata.create_all(bind=engine)

    def score_row(db, user_id, season):
        row = db.query(RankedScore).filter_by(user_id=user_id, season=season).first()
        if row:
            return row
        prev = db.query(RankedScore).filter_by(user_id=user_id, season=previous_season(season)).first()
        start = prev.points // 2 if (prev and SEASON_RESET == "half") else 0
        row = RankedScore(user_id=user_id, season=season, points=start, wins=0, losses=0, draws=0)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    async def save_result(room, winner, loser):
        db = SessionLocal()
        try:
            season = season_key()
            if winner is None:
                out = {}
                for p in room.players:
                    row = score_row(db, p.user_id, season)
                    row.draws += 1
                    out[p] = (0, row.points)
                db.commit()
                return out
            w = score_row(db, winner.user_id, season)
            l = score_row(db, loser.user_id, season)
            change = points_change(w.points, l.points)
            taken = min(change, l.points)
            w.points += change
            w.wins += 1
            l.points -= taken
            l.losses += 1
            db.commit()
            return {winner: (change, w.points), loser: (-taken, l.points)}
        finally:
            db.close()

    matchmaker = Matchmaker(save_result)

    def ranked_players(db, season):
        rows = (
            db.query(RankedScore, User)
            .join(User, User.id == RankedScore.user_id)
            .filter(RankedScore.season == season)
            .filter((RankedScore.wins + RankedScore.losses + RankedScore.draws) > 0)
            .order_by(RankedScore.points.desc(), RankedScore.wins.desc())
            .all()
        )
        return [
            {"rank": i + 1, "userId": u.id, "username": u.username, "points": r.points, "wins": r.wins, "losses": r.losses}
            for i, (r, u) in enumerate(rows)
        ]

    @app.get("/api/ranked/{user_id}")
    def my_rank(user_id: int):
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")
            season = season_key()
            row = score_row(db, user_id, season)
            board = ranked_players(db, season)
            rank = next((p["rank"] for p in board if p["userId"] == user_id), None)
            return {"season": season, "points": row.points, "wins": row.wins, "losses": row.losses,
                    "draws": row.draws, "rank": rank, "players": len(board)}
        finally:
            db.close()

    @app.get("/api/leaderboard")
    def leaderboard(season: str = "", limit: int = 50):
        db = SessionLocal()
        try:
            season = season or season_key()
            past = []
            key = season
            for _ in range(3):
                key = previous_season(key)
                top = ranked_players(db, key)[:3]
                if top:
                    past.append({"season": key, "top": top})
            return {"season": season, "reset": SEASON_RESET, "players": ranked_players(db, season)[:limit], "pastWinners": past}
        finally:
            db.close()

    @app.websocket("/ws/battle/{user_id}")
    async def battle_socket(ws: WebSocket, user_id: int):
        await ws.accept()
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                await ws.send_json({"type": "error", "message": "User not found."})
                await ws.close()
                return
            if user.is_dead:
                await ws.send_json({"type": "error", "message": "Your pet has passed away. Hatch a new egg first."})
                await ws.close()
                return
            row = score_row(db, user.id, season_key())
            player = Player(ws, user.id, user.username, user.animal_id, level_from_xp(user.xp), row.points)
        finally:
            db.close()

        try:
            while True:
                msg = await ws.receive_json()
                kind = msg.get("type") if isinstance(msg, dict) else None
                if kind == "queue" and not player.room:
                    player.pet_name = (str(msg.get("petName") or "").strip() or player.username)[:12]
                    await matchmaker.join(player)
                elif kind == "cancel":
                    await matchmaker.leave(player)
                    await player.send({"type": "cancelled"})
                elif player.room:
                    await player.room.inbox.put((player, msg))
        except WebSocketDisconnect:
            pass
        except Exception:
            pass
        finally:
            await matchmaker.leave(player)
            if player.room:
                await player.room.inbox.put((player, {"type": "left"}))
