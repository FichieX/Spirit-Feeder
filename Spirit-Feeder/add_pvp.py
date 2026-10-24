# Turns on live ranked battles: adds two lines to the bottom of main.py.
p = 'main.py'
s = open(p, newline='').read()
if 'pvp.setup(' in s:
    print('already added')
else:
    nl = '\r\n' if '\r\n' in s else '\n'
    code = '''

# ------------------------------------------------------------------------------
# LIVE RANKED BATTLES (player vs player) - see pvp.py
# ------------------------------------------------------------------------------
import pvp
pvp.setup(app, SessionLocal, User, Base, engine, level_from_xp)
'''
    s = s.rstrip('\r\n') + code.replace('\n', nl)
    open(p, 'w', newline='').write(s)
    print('ranked battles turned on')
