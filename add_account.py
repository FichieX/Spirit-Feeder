# Turns on "change your username once": adds two lines to the bottom of main.py. Safe to run twice.
p = 'main.py'
s = open(p, newline='').read()
if 'account.setup(' in s:
    print('already added')
else:
    nl = '\r\n' if '\r\n' in s else '\n'
    code = '''

# ------------------------------------------------------------------------------
# CHANGE USERNAME (once per account) - see account.py
# ------------------------------------------------------------------------------
import account
account.setup(app, SessionLocal, User, Base, engine)
'''
    s = s.rstrip('\r\n') + code.replace('\n', nl)
    open(p, 'w', newline='').write(s)
    print('username change turned on')
