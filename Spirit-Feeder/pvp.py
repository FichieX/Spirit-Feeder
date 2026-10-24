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

Bots: if nobody else is searching, a bot joins after BOT_AFTER_SECONDS. It looks like a normal
player (player-style name, pet, level close to yours) and plays like one: it answers after a few
seconds, sometimes wrong, sometimes uses a power-up. It gets smarter and faster the more points
you have. Bot battles give normal points to the real player. Bots are not saved anywhere, so
they never show up on the leaderboard.

Friend battles (friends.py sends the invites):
    - mode "fun":    no ranked points change
    - mode "ranked": same points as a normal ranked battle
    The inviter opens the socket and sends {"type": "friend", "inviteId": ...}; the friend accepts
    (POST /api/friends/battle/respond) and sends the same message. When both are connected, it starts.

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
BOTS = True               # False = ranked only matches real players
BOT_AFTER_SECONDS = 15    # searching this long with nobody else = a bot joins
BOT_TOP_POINTS = 600      # bots play their best against players with this many points
INVITE_SECONDS = 30       # how long a friend has to accept a battle invite
JOIN_SECONDS = 20         # after accepting, time for both phones to connect

# Shared with friends.py
BUSY = set()              # user ids in a battle right now
SOCKETS = {}              # user id -> Player with an open battle socket


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
    is_bot = False

    def __init__(self, ws, user_id, username, animal_id, level, points):
        self.ws = ws
        self.user_id = user_id
        self.username = username
        self.pet_name = username
        self.animal_id = animal_id or 1
        self.level = level or 1
        self.points = points
        self.room = None
        self.invite = None  # friend battle this player is waiting for
        self.search = None  # changes every time they tap FIND OPPONENT (for the bot timer)

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


# ---------------------------------------------------------------------------
# Bots (for when nobody else is online)
# ---------------------------------------------------------------------------
BOT_NAMES = ["grace", "noah", "ruthie", "eli", "hannah", "caleb", "miriam", "josiah", "lydia", "silas",
             "abby", "micah", "naomi", "levi", "esther", "jonah", "phoebe", "asher", "chloe", "gideon",
             "talia", "jude", "selah", "ezra", "anna", "sam", "joy", "ben", "lulu", "tobias"]
BOT_PETS = ["Barley", "Pebble", "Honey", "Clover", "Biscuit", "Maple", "Sunny", "Hazel", "Mochi", "Peanut",
            "Olive", "Toffee", "Juniper", "Ginger", "Buttons", "Daisy", "Rocky", "Willow", "Nugget", "Pip"]


def bot_username():
    name = random.choice(BOT_NAMES)
    style = random.randrange(5)
    if style == 0:
        return name
    if style == 1:
        return f"{name}{random.randint(1, 99)}"
    if style == 2:
        return f"{name}_{random.randint(2000, 2015)}"
    if style == 3:
        return f"{name}{random.choice(['xo', 'bug', 'bear', 'lamb', 'star'])}"
    return f"{random.choice(['its', 'the', 'lil', 'mr', 'ms'])}{name}"


class BotPlayer(Player):
    """Plays a battle by itself. skill 0 = new player level, 1 = top player level."""
    is_bot = True

    def __init__(self, user_id, username, pet_name, animal_id, level, points, skill):
        super().__init__(None, user_id, username, animal_id, level, points)
        self.pet_name = pet_name
        self.skill = skill
        self.frozen_until = 0.0
        self.eliminated = None

    async def send(self, msg):
        kind = msg.get("type")
        if kind == "question":
            self.eliminated = None
            asyncio.create_task(self._play(msg))
        elif kind == "frozen":
            self.frozen_until = time.monotonic() + msg.get("seconds", 0)
        elif kind == "eliminate":
            self.eliminated = msg.get("remove")

    async def _play(self, q):
        room = self.room
        if room is None:
            return
        info = next((x for x in room.questions if x["q"] == q["q"]), None)
        choices = q["choices"]
        right = choices.index(info["correct"]) if info and info["correct"] in choices else random.randrange(3)
        tier = info.get("tier", 1) if info else 1
        scale = q["seconds"] / 15  # think time is planned for a 15 second question

        # Sometimes use a power-up first (more often when the bot is good)
        if random.random() < 0.08 + 0.17 * self.skill:
            await asyncio.sleep(random.uniform(0.8, 2.0) * scale)
            if self.room is not room:
                return
            await room.inbox.put((self, {"type": "power", "power": random.choice(POWERS)}))

        # Think: about 7 seconds for an easy bot, about 3 for a strong one
        mean = (7.0 - 4.0 * self.skill) * scale
        await asyncio.sleep(min(random.uniform(0.6, 1.4) * mean, q["seconds"] * 0.9))
        wait = self.frozen_until - time.monotonic()
        if wait > 0:
            await asyncio.sleep(wait + 0.05)
        if self.room is not room:
            return

        # Harder questions later in the battle trip it up a bit more
        accuracy = 0.55 + 0.35 * self.skill - 0.04 * (tier - 1)
        if self.eliminated is not None:
            accuracy += 0.15
        accuracy = max(0.3, min(0.95, accuracy))
        if random.random() < accuracy:
            choice = right
        else:
            choice = random.choice([i for i in range(3) if i != right and i != self.eliminated])
        await room.inbox.put((self, {"type": "answer", "n": q["n"], "choice": choice}))


class Matchmaker:
    def __init__(self, on_finish, make_bot=None):
        self.waiting = []
        self.lock = asyncio.Lock()
        self.on_finish = on_finish  # async (room, winner_or_None, loser_or_None) -> {player: (change, points)}
        self.make_bot = make_bot    # (player) -> BotPlayer

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
            if BOTS and self.make_bot:
                token = object()
                player.search = token
                asyncio.create_task(self._bot_later(player, token))
            return None
        room = Room(opponent, player, self.on_finish)
        room.task = asyncio.create_task(room.run())
        return room

    async def _bot_later(self, player, token):
        """Still nobody after BOT_AFTER_SECONDS? Then a bot joins."""
        await asyncio.sleep(BOT_AFTER_SECONDS)
        async with self.lock:
            if player.search is not token or player not in self.waiting:
                return  # they found a player, cancelled, or searched again
            self.waiting.remove(player)
        bot = self.make_bot(player)
        room = Room(player, bot, self.on_finish)
        room.task = asyncio.create_task(room.run())

    async def leave(self, player):
        async with self.lock:
            if player in self.waiting:
                self.waiting.remove(player)


class Room:
    def __init__(self, a, b, on_finish, questions=None, mode="ranked"):
        self.players = [a, b]
        self.mode = mode  # "ranked" (matchmaking or friends) or "fun" (friends, no points)
        a.room = self
        b.room = self
        BUSY.update({a.user_id, b.user_id})
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
                "mode": self.mode,
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
                BUSY.discard(p.user_id)
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
                "mode": self.mode,
            })
            p.room = None
            BUSY.discard(p.user_id)


# ---------------------------------------------------------------------------
# Friend battles: an invite, then both players join it with its id
# ---------------------------------------------------------------------------
async def no_points(room, winner, loser):
    """'fun' battles: nobody's points change."""
    return {}


class Invite:
    def __init__(self, invite_id, host_id, host_name, guest_id, guest_name, mode):
        self.id = invite_id
        self.host_id = host_id
        self.host_name = host_name
        self.guest_id = guest_id
        self.guest_name = guest_name
        self.mode = mode
        self.status = "pending"   # pending -> accepted -> started   (or declined / expired / cancelled)
        self.created = time.monotonic()
        self.players = {}         # user id -> Player, once their socket has joined

    def seconds_left(self):
        return max(0, round(self.created + INVITE_SECONDS - time.monotonic()))

    def public(self):
        return {"inviteId": self.id, "fromId": self.host_id, "fromName": self.host_name,
                "mode": self.mode, "seconds": self.seconds_left()}


class FriendHub:
    def __init__(self):
        self.invites = {}
        self.on_finish = {"fun": no_points, "ranked": no_points}  # "ranked" is set in setup()

    def incoming(self, user_id):
        """Open battle invites sent to this player (for the pop-up)."""
        return [i.public() for i in self.invites.values()
                if i.guest_id == user_id and i.status == "pending" and i.seconds_left() > 0]

    def pending_between(self, a_id, b_id):
        for i in self.invites.values():
            if i.status == "pending" and {i.host_id, i.guest_id} == {a_id, b_id} and i.seconds_left() > 0:
                return i
        return None

    async def create(self, host_id, host_name, guest_id, guest_name, mode):
        # One open invite per player: a new one replaces the old one
        for old in list(self.invites.values()):
            if old.host_id == host_id and old.status in ("pending", "accepted"):
                await self._close(old, "cancelled")
        # Forget invites older than 5 minutes
        for key, old in list(self.invites.items()):
            if time.monotonic() - old.created > 300:
                del self.invites[key]
        invite = Invite(secrets_token(), host_id, host_name, guest_id, guest_name, mode)
        self.invites[invite.id] = invite
        asyncio.create_task(self._timeout(invite))
        # Friend already has the battle screen open (e.g. rematch): tell them right there
        guest = SOCKETS.get(guest_id)
        if guest and not guest.room:
            await guest.send({"type": "friend_invite", **invite.public()})
        return invite

    async def _timeout(self, invite):
        await asyncio.sleep(INVITE_SECONDS)
        if invite.status == "pending":
            await self._close(invite, "expired")
            return
        if invite.status == "accepted":
            await asyncio.sleep(JOIN_SECONDS)
            if invite.status == "accepted":
                await self._close(invite, "expired")

    async def _close(self, invite, reason):
        invite.status = reason
        for p in list(invite.players.values()):
            if p.invite is invite:
                p.invite = None
            await p.send({"type": "invite_over", "reason": reason})
        invite.players.clear()

    async def respond(self, invite_id, user_id, accept):
        """Friend taps Accept or Decline. Returns an error message, or None if it worked."""
        invite = self.invites.get(invite_id)
        if not invite or invite.guest_id != user_id:
            return "That battle invite isn't for you."
        if invite.status != "pending" or invite.seconds_left() <= 0:
            return "That battle invite has ended."
        if not accept:
            await self._close(invite, "declined")
            return None
        invite.status = "accepted"
        host = invite.players.get(invite.host_id)
        if host:
            await host.send({"type": "friend_accepted"})
        await self._maybe_start(invite)
        return None

    async def join(self, player, invite_id):
        """A player's battle socket joins an invite (the inviter right away, the friend after accepting)."""
        invite = self.invites.get(invite_id)
        if not invite or player.user_id not in (invite.host_id, invite.guest_id):
            await player.send({"type": "invite_over", "reason": "gone"})
            return
        if invite.status not in ("pending", "accepted"):
            await player.send({"type": "invite_over", "reason": invite.status})
            return
        if player.user_id == invite.guest_id and invite.status == "pending":
            await player.send({"type": "invite_over", "reason": "gone"})  # accept first (respond)
            return
        if player.invite is invite:
            return  # already in this one
        await self.leave(player)  # leave any other invite
        invite.players[player.user_id] = player
        player.invite = invite
        if player.user_id == invite.host_id and invite.status == "pending":
            await player.send({"type": "waiting_friend", "friend": invite.guest_name,
                               "seconds": invite.seconds_left(), "mode": invite.mode})
        await self._maybe_start(invite)

    async def _maybe_start(self, invite):
        if invite.status != "accepted" or len(invite.players) < 2:
            return
        host = invite.players[invite.host_id]
        guest = invite.players[invite.guest_id]
        invite.status = "started"
        host.invite = guest.invite = None
        room = Room(host, guest, self.on_finish[invite.mode], mode=invite.mode)
        room.task = asyncio.create_task(room.run())

    async def leave(self, player):
        """Player cancelled or closed the battle screen: the invite is off."""
        invite = player.invite
        if not invite:
            return
        player.invite = None
        invite.players.pop(player.user_id, None)
        if invite.status in ("pending", "accepted"):
            await self._close(invite, "cancelled")


def secrets_token():
    import secrets
    return secrets.token_urlsafe(8)


HUB = FriendHub()


# ---------------------------------------------------------------------------
# Web + database (called from main.py)
# ---------------------------------------------------------------------------
def setup(app, SessionLocal, User, Base, engine, level_from_xp):
    from fastapi import HTTPException, WebSocket, WebSocketDisconnect
    from sqlalchemy import Column, Integer, String, func

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
        """Bots aren't saved: only the real player's points change."""
        db = SessionLocal()
        try:
            season = season_key()
            if winner is None:
                out = {}
                for p in room.players:
                    if p.is_bot:
                        out[p] = (0, p.points)
                        continue
                    row = score_row(db, p.user_id, season)
                    row.draws += 1
                    out[p] = (0, row.points)
                db.commit()
                return out
            w = None if winner.is_bot else score_row(db, winner.user_id, season)
            l = None if loser.is_bot else score_row(db, loser.user_id, season)
            w_points = w.points if w else winner.points
            l_points = l.points if l else loser.points
            change = points_change(w_points, l_points)
            taken = min(change, l_points)
            if w:
                w.points += change
                w.wins += 1
            if l:
                l.points -= taken
                l.losses += 1
            db.commit()
            return {winner: (change, w_points + change), loser: (-taken, l_points - taken)}
        finally:
            db.close()

    def make_bot(player):
        """A bot that looks like a normal player, about as strong as this player."""
        db = SessionLocal()
        try:
            name = bot_username()
            for _ in range(10):  # don't borrow a real player's name
                if not db.query(User).filter(func.lower(User.username) == name.lower()).first():
                    break
                name = bot_username()
        finally:
            db.close()
        skill = max(0.0, min(1.0, player.points / BOT_TOP_POINTS + random.uniform(-0.1, 0.1)))
        return BotPlayer(
            user_id=-random.randint(1000, 9_999_999),
            username=name,
            pet_name=random.choice(BOT_PETS),
            animal_id=random.choice((1, 2, 3, 4)),
            level=max(1, player.level + random.randint(-2, 2)),
            points=max(0, player.points + random.randint(-40, 40)),
            skill=skill,
        )

    matchmaker = Matchmaker(save_result, make_bot)
    HUB.on_finish["ranked"] = save_result

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

        SOCKETS[player.user_id] = player
        try:
            while True:
                msg = await ws.receive_json()
                kind = msg.get("type") if isinstance(msg, dict) else None
                if kind in ("queue", "friend") and not player.room:
                    player.pet_name = (str(msg.get("petName") or "").strip() or player.username)[:12]
                    if kind == "queue":
                        await HUB.leave(player)
                        await matchmaker.join(player)
                    else:
                        await matchmaker.leave(player)
                        await HUB.join(player, str(msg.get("inviteId") or ""))
                elif kind == "cancel":
                    await matchmaker.leave(player)
                    await HUB.leave(player)
                    await player.send({"type": "cancelled"})
                elif player.room:
                    await player.room.inbox.put((player, msg))
        except WebSocketDisconnect:
            pass
        except Exception:
            pass
        finally:
            if SOCKETS.get(player.user_id) is player:
                del SOCKETS[player.user_id]
            await matchmaker.leave(player)
            await HUB.leave(player)
            if player.room:
                await player.room.inbox.put((player, {"type": "left"}))
