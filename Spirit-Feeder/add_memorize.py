# Turns on XP for verse memorization: adds two lines to the bottom of main.py
# (or updates them if an older version was added before).
p = 'main.py'
s = open(p, newline='').read()
NEW = 'memorize.setup(app, SessionLocal, User, Base, engine, get_feeding_xp, level_from_xp, xp_for_level, MAX_XP)'
OLD = 'memorize.setup(app, SessionLocal, User, get_feeding_xp, level_from_xp, xp_for_level, MAX_XP)'
if NEW in s:
    print('already added')
elif OLD in s:
    s = s.replace(OLD, NEW)
    open(p, 'w', newline='').write(s)
    print('memorize XP updated (daily limit)')
else:
    nl = '\r\n' if '\r\n' in s else '\n'
    code = '''

# ------------------------------------------------------------------------------
# VERSE MEMORIZATION XP (about one level a day) - see memorize.py
# ------------------------------------------------------------------------------
import memorize
''' + NEW + '\n'
    s = s.rstrip('\r\n') + code.replace('\n', nl)
    open(p, 'w', newline='').write(s)
    print('memorize XP turned on')
