# Adds the Raven (3) and Camel (4) as pets you can pick. Run it in the Spirit-Feeder folder.
# Safe to run twice. It does two things:
#   1. adds them to the animals table in game.db (this computer's database)
#   2. adds them to main.py's starter list, so a brand-new database gets them too
import sqlite3

NEW = [
    (3, 'Raven', 'Chick', 'Fledgling', 'Raven'),
    (4, 'Camel', 'Calf', 'Young Camel', 'Camel'),
]

db = sqlite3.connect('game.db')
added = []
for row in NEW:
    if not db.execute('SELECT 1 FROM animals WHERE animal_id = ?', (row[0],)).fetchone():
        db.execute('INSERT INTO animals (animal_id, species, baby_name, young_name, adult_name) VALUES (?, ?, ?, ?, ?)', row)
        added.append(row[1])
db.commit()
db.close()
print('game.db: added ' + ', '.join(added) if added else 'game.db: already has them')

p = 'main.py'
s = open(p, newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'
lion = 'Animal(animal_id=2, species="Lion", baby_name="Cub", young_name="Young Lion", adult_name="Lion"),'
if 'species="Raven"' in s:
    print('main.py: already has them')
elif lion in s:
    i = s.index(lion) + len(lion)
    line_start = s.rfind('\n', 0, s.index(lion)) + 1
    indent = s[line_start:s.index(lion)]
    extra = (nl + indent + 'Animal(animal_id=3, species="Raven", baby_name="Chick", young_name="Fledgling", adult_name="Raven"),'
             + nl + indent + 'Animal(animal_id=4, species="Camel", baby_name="Calf", young_name="Young Camel", adult_name="Camel"),')
    s = s[:i] + extra + s[i:]
    open(p, 'w', newline='').write(s)
    print('main.py: added Raven and Camel to the starter animals')
else:
    print("main.py: couldn't find the Lion line, skipped (game.db is still updated)")
