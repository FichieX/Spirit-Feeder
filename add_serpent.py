# Turns on serpent battle XP: adds two lines to the bottom of main.py.
p = 'main.py'
s = open(p, newline='').read()
if 'serpent.setup(' in s:
    print('already added')
else:
    nl = '\r\n' if '\r\n' in s else '\n'
    code = '''

# ------------------------------------------------------------------------------
# SERPENT BATTLE XP (win = quiz XP once per serpent, lose = 30% of the level bar)
# ------------------------------------------------------------------------------
import serpent
serpent.setup(app, SessionLocal, User, Base, engine, get_quiz_xp_reward, level_from_xp, xp_for_level, MAX_XP)
'''
    s = s.rstrip('\r\n') + code.replace('\n', nl)
    open(p, 'w', newline='').write(s)
    print('serpent battle XP turned on')
