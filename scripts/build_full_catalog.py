import os
import json
import re

TEXTBOOKS_DIR = '/Users/adrianvira/.gemini/antigravity-ide/scratch/aprendIA/data/textbooks_md'
CATALOG_PATH = '/Users/adrianvira/.gemini/antigravity-ide/scratch/aprendIA/data/books_index/catalog.json'

def parse_markdown_file(file_path):
    filename = os.path.basename(file_path)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract metadata headers
    book_title = filename.replace('.md', '').replace('_', ' ').title()
    grade = "Secundaria"
    field = "General"

    meta_match = re.search(r'# (.*?)\n- \*\*Grado\*\*: (.*?)\n- \*\*Campo Formativo\*\*: (.*?)\n', content)
    if meta_match:
        book_title = meta_match.group(1).strip()
        grade = meta_match.group(2).strip()
        field = meta_match.group(3).strip()

    # Split by ### Página X
    pages_raw = re.split(r'### Página (\d+)', content)
    entries = []

    for i in range(1, len(pages_raw), 2):
        p_num = int(pages_raw[i])
        p_text = pages_raw[i+1].strip()

        # Clean snippet text
        clean_text = ' '.join(p_text.split())
        if len(clean_text) < 15:
            continue

        entries.append({
            "bookTitle": book_title,
            "grade": grade,
            "field": field,
            "page": p_num,
            "snippet": clean_text[:400],
            "file": filename
        })

    return entries

def main():
    if not os.path.exists(TEXTBOOKS_DIR):
        print(f"Error: Directory {TEXTBOOKS_DIR} does not exist.")
        return

    all_entries = []
    files = sorted(os.listdir(TEXTBOOKS_DIR))

    for fn in files:
        if fn.endswith('.md'):
            fp = os.path.join(TEXTBOOKS_DIR, fn)
            entries = parse_markdown_file(fp)
            all_entries.extend(entries)
            print(f"Indexed {len(entries)} pages from {fn}")

    os.makedirs(os.path.dirname(CATALOG_PATH), exist_ok=True)
    with open(CATALOG_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Total catalog build complete! {len(all_entries)} pages indexed in {CATALOG_PATH}")

if __name__ == '__main__':
    main()
