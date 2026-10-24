# Turns on "forgot password": adds two lines to the bottom of main.py,
# and makes sure the .env file (email password) is never committed.
p = 'main.py'
s = open(p, newline='').read()
if 'password_reset.setup(' in s:
    print('already added')
else:
    nl = '\r\n' if '\r\n' in s else '\n'
    code = '''

# ------------------------------------------------------------------------------
# FORGOT PASSWORD (6-digit code by email) - see password_reset.py
# ------------------------------------------------------------------------------
import password_reset
password_reset.setup(app, SessionLocal, User, Base, engine)
'''
    s = s.rstrip('\r\n') + code.replace('\n', nl)
    open(p, 'w', newline='').write(s)
    print('forgot password turned on')

g = '.gitignore'
try:
    lines = open(g).read().splitlines()
except FileNotFoundError:
    lines = []
if '.env' not in lines:
    lines.append('.env')
    open(g, 'w').write('\n'.join(lines) + '\n')
print('.env is ignored by git:', True)
