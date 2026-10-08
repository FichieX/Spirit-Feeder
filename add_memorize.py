# Turns on XP for verse memorization: adds two lines to the bottom of main.py.
p = 'main.py'
s = open(p, newline='').read()
if 'memorize.setup(' in s:
    print('already added')
else:
    nl = '\r\n' if '\r\n' in s else '\n'
    code = '''

# ------------------------------------------------------------------------------
# VERSE MEMORIZATION XP - see memorize.py
# ------------------------------------------------------------------------------
import memorize
memorize.setup(app, SessionLocal, User, get_feeding_xp, level_from_xp, xp_for_level, MAX_XP)
'''
    s = s.rstrip('\r\n') + code.replace('\n', nl)
    open(p, 'w', newline='').write(s)
    print('memorize XP turned on')
