import json
import re
import os

BOOK_MAP = {
    "GEN": "Genesis", "EXO": "Exodus", "LEV": "Leviticus", "NUM": "Numbers", "DEU": "Deuteronomy",
    "JOSH": "Joshua", "JUG": "Judges", "RUTH": "Ruth", "1SAM": "1 Samuel", "2SAM": "2 Samuel",
    "1KIN": "1 Kings", "2KIN": "2 Kings", "1CHR": "1 Chronicles", "2CHR": "2 Chronicles",
    "EZRA": "Ezra", "NEH": "Nehemiah", "EST": "Esther", "JOB": "Job", "PSA": "Psalms",
    "PRO": "Proverbs", "ECC": "Ecclesiastes", "SOL": "Song of Solomon", "ISA": "Isaiah",
    "JER": "Jeremiah", "LAM": "Lamentations", "EZE": "Ezekiel", "DAN": "Daniel",
    "HOS": "Hosea", "JOEL": "Joel", "AMOS": "Amos", "OBA": "Obadiah", "JON": "Jonah",
    "MIC": "Micah", "NAH": "Nahum", "HAB": "Habakkuk", "ZEP": "Zephaniah", "HAG": "Haggai",
    "ZEC": "Zechariah", "MAL": "Malachi", "MAT": "Matthew", "MAR": "Mark", "LUK": "Luke",
    "JOH": "John", "ACT": "Acts", "ROM": "Romans", "1COR": "1 Corinthians", "2COR": "2 Corinthians",
    "GAL": "Galatians", "EPH": "Ephesians", "PHI": "Philippians", "COL": "Colossians",
    "1TH": "1 Thessalonians", "2TH": "2 Thessalonians", "1TIM": "1 Timothy", "2TIM": "2 Timothy",
    "TIT": "Titus", "PHILE": "Philemon", "HEB": "Hebrews", "JAM": "James", "1PET": "1 Peter",
    "2PET": "2 Peter", "1JOH": "1 John", "2JOH": "2 John", "3JOH": "3 John", "JUDE": "Jude", "REV": "Revelation"
}

def clean_header_title(raw_title: str) -> str:
    """Strips out footnotes, page numbers, cross-references, and partial book names from headers."""
    # Remove cross references in parentheses
    title = re.sub(r'\s*\([^)]*\)', '', raw_title)
    
    # Remove PAGE markers and footnote references
    title = re.sub(r'=+\s*PAGE\s*\d+\s*=+', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\b[a-z]\s+\d+\s+Cited in.*', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\b(Literally|Or a|Or|also in|verses|firmament|canopy|vault)\b.*', '', title, flags=re.IGNORECASE)
    
    # Remove stray partial book names at start (e.g. "nesis The Fourth Day" -> "The Fourth Day")
    title = re.sub(r'^(nesis|odus|iticus|ronomy)\s+', '', title, flags=re.IGNORECASE)

    # Clean up excess whitespace
    return re.sub(r'\s+', ' ', title).strip()

def is_valid_header(line: str) -> bool:
    line = line.strip()
    if not line:
        return False
    # Ignore lines that look like page headers/footers or footnotes
    if "PAGE" in line or "Cited in" in line or "Literally" in line or "Or a " in line:
        return False
    if line[-1] in ".!?,;:—”\"'":
        return False
    if len(line) < 3 or line.lower() in ["a", "b", "c", "d"]:
        return False
    if re.match(r'^(and|or|then|so|but|for|ness|tion)\b', line, re.IGNORECASE):
        return False
    return True

def extract_headers_from_bsb():
    headers_map = {}
    
    if not os.path.exists("bsb.txt"):
        print("⚠️ Warning: bsb.txt not found. Proceeding without section headers.")
        return headers_map

    with open("bsb.txt", "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    
    current_book = "Genesis"
    current_chapter = 1
    pending_header_lines = []

    for line in lines:
        clean_upper = line.upper().replace(".", "")
        if clean_upper in BOOK_MAP:
            current_book = BOOK_MAP[clean_upper]
            pending_header_lines = []
            continue

        if line.isdigit() and int(line) < 175:
            current_chapter = int(line)
            continue

        verse_match = re.match(r'^(\d+)\s+', line)
        if verse_match:
            v_num = int(verse_match.group(1))
            if pending_header_lines:
                raw_title = " ".join(pending_header_lines)
                cleaned_title = clean_header_title(raw_title)
                if cleaned_title:
                    headers_map[(current_book, current_chapter, v_num)] = cleaned_title
                pending_header_lines = []
        else:
            if is_valid_header(line):
                pending_header_lines.append(line)
            else:
                pending_header_lines = []

    return headers_map

def build_json():
    if not os.path.exists("bsb2.txt"):
        print("❌ Error: bsb2.txt not found in project folder.")
        return

    print("⏳ Extracting clean section titles from bsb.txt...")
    headers_map = extract_headers_from_bsb()

    print("⏳ Building structured JSON using clean verse text from bsb2.txt...")
    
    sections = []
    order_index = 1
    
    current_book = None
    current_chapter = None
    current_header = "The Creation"
    current_verses = []
    start_verse = None
    last_verse = None

    ref_pattern = re.compile(r"^((?:[1-3]\s+)?[\w\s]+?)\s+(\d+):(\d+)$")

    with open("bsb2.txt", "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            parts = [p.strip() for p in line.split('\t') if p.strip()]
            if len(parts) >= 2:
                ref_str = parts[0]
                text_str = " ".join(parts[1:])

                match = ref_pattern.match(ref_str)
                if match:
                    book, chapter_str, verse_str = match.groups()
                    chapter = int(chapter_str)
                    verse = int(verse_str)
                    book = book.strip()

                    header_key = (book, chapter, verse)

                    if (header_key in headers_map and current_verses) or (current_book and (book != current_book or chapter != current_chapter)):
                        if current_verses:
                            title_range = f"{start_verse}-{last_verse}" if start_verse != last_verse else f"{start_verse}"
                            hdr_text = current_header if current_header else f"{current_book} {current_chapter}"
                            
                            sections.append({
                                "order_index": order_index,
                                "book": current_book,
                                "chapter": current_chapter,
                                "section_title": f"{hdr_text} ({current_book} {current_chapter}:{title_range})",
                                "content": " ".join(current_verses)
                            })
                            order_index += 1
                            current_verses = []
                            start_verse = None

                    if start_verse is None:
                        start_verse = verse
                    last_verse = verse

                    if header_key in headers_map:
                        current_header = headers_map[header_key]

                    current_book = book
                    current_chapter = chapter
                    current_verses.append(f"[{verse}] {text_str}")

        if current_book and current_verses:
            title_range = f"{start_verse}-{last_verse}" if start_verse != last_verse else f"{start_verse}"
            hdr_text = current_header if current_header else f"{current_book} {current_chapter}"
            sections.append({
                "order_index": order_index,
                "book": current_book,
                "chapter": current_chapter,
                "section_title": f"{hdr_text} ({current_book} {current_chapter}:{title_range})",
                "content": " ".join(current_verses)
            })

    with open("bsb_bible.json", "w", encoding="utf-8") as out:
        json.dump(sections, out, indent=2, ensure_ascii=False)

    print(f"🎉 SUCCESS! Generated bsb_bible.json with {len(sections)} header-based sections!")

if __name__ == "__main__":
    build_json()