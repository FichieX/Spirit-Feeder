# Turns on friends (+ live ranked battles if they aren't on yet): adds lines to the bottom of main.py.
# Safe to run twice.
p = 'main.py'
s = open(p, newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'
added = []
if 'pvp.setup(' not in s:
    s = s.rstrip('\r\n') + '''

# ------------------------------------------------------------------------------
# LIVE RANKED BATTLES (player vs player) - see pvp.py
# ------------------------------------------------------------------------------
import pvp
pvp.setup(app, SessionLocal, User, Base, engine, level_from_xp)
'''.replace('\n', nl)
    added.append('ranked battles')
if 'friends.setup(' not in s:
    s = s.rstrip('\r\n') + '''

# ------------------------------------------------------------------------------
# FRIENDS (requests, online list, live friend battles) - see friends.py
# ------------------------------------------------------------------------------
import friends
friends.setup(app, SessionLocal, User, Base, engine, level_from_xp)
'''.replace('\n', nl)
    added.append('friends')
open(p, 'w', newline='').write(s)
print('turned on: ' + ', '.join(added) if added else 'already added')
