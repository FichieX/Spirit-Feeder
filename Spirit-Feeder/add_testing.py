# Turns on the test-account XP saving: adds two lines to the bottom of main.py. Safe to run twice.
p = 'main.py'
s = open(p, newline='').read()
if 'testing.setup(' in s:
    print('already added')
else:
    nl = '\r\n' if '\r\n' in s else '\n'
    code = '''

# ------------------------------------------------------------------------------
# TEST ACCOUNTS (tester/test/admin): save the test level on the server - see testing.py
# ------------------------------------------------------------------------------
import testing
testing.setup(app, SessionLocal, User, level_from_xp, MAX_XP)
'''
    s = s.rstrip('\r\n') + code.replace('\n', nl)
    open(p, 'w', newline='').write(s)
    print('test account XP saving turned on')
