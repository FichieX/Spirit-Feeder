import json
import urllib.request
import re

# Official Berean Standard Bible Tab-Separated Values (TSV/TXT) dataset
BSB_TSV_URL = "https://raw.githubusercontent.com/gratis-bible/bible-bsb/master/bsb.tsv"

def create_bsb_json():
    print("⏳ Downloading Berean Standard Bible dataset...")
    try:
        req = urllib.request.Request(
            BSB_TSV_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            tsv_lines = response.read().decode('utf-8').splitlines()

        print("⚡ Processing verses and building chapter sections...")
        
        sections = []
        order_index = 1
        current_book = None
        current_chapter = None
        current_verses = []

        for line in tsv_lines:
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("Book"):
                continue

            # TSV columns are typically: Book \t Chapter \t Verse \t Text
            parts = line.split('\t')
            if len(parts) >= 4:
                book = parts[0].strip()
                try:
                    chapter = int(parts[1].strip())
                    verse = parts[2].strip()
                    text = parts[3].strip()
                except ValueError:
                    continue

                # Check if we moved to a new chapter or new book
                if current_book and (book != current_book or chapter != current_chapter):
                    sections.append({
                        "order_index": order_index,
                        "book": current_book,
                        "chapter": current_chapter,
                        "section_title": f"{current_book} {current_chapter}",
                        "content": " ".join(current_verses)
                    })
                    order_index += 1
                    current_verses = []

                current_book = book
                current_chapter = chapter
                current_verses.append(f"[{verse}] {text}")

        # Append the final chapter (Revelation 22)
        if current_book and current_verses:
            sections.append({
                "order_index": order_index,
                "book": current_book,
                "chapter": current_chapter,
                "section_title": f"{current_book} {current_chapter}",
                "content": " ".join(current_verses)
            })

        with open("bsb_bible.json", "w", encoding="utf-8") as f:
            json.dump(sections, f, indent=2, ensure_ascii=False)

        print(f"🎉 SUCCESS! Created bsb_bible.json with {len(sections)} chapters (Genesis to Revelation).")

    except Exception as e:
        print(f"❌ Error during download or formatting: {e}")

if __name__ == "__main__":
    create_bsb_json()