import os
import json
import re
import pymupdf

SOURCE_DIR = "/Users/adrianvira/Desktop/Libros"
OUTPUT_MD_DIR = "/Users/adrianvira/.gemini/antigravity-ide/scratch/aprendIA/data/textbooks_md"
OUTPUT_INDEX_DIR = "/Users/adrianvira/.gemini/antigravity-ide/scratch/aprendIA/data/books_index"

os.makedirs(OUTPUT_MD_DIR, exist_ok=True)
os.makedirs(OUTPUT_INDEX_DIR, exist_ok=True)

BOOK_MAP = {
    "2_TS-ENS-BAJA.pdf": {"grade": "2° Secundaria", "field": "Ética, Naturaleza y Sociedades", "title": "Ética, Naturaleza y Sociedades (2°)"},
    "2_TS-HC-BAJA.pdf": {"grade": "2° Secundaria", "field": "De lo Humano y lo Comunitario", "title": "De lo Humano y lo Comunitario (2°)"},
    "2_TS-INGLES-BAJA.pdf": {"grade": "2° Secundaria", "field": "Lenguajes", "title": "Lenguajes - Inglés (2°)"},
    "2_TS-ML-BAJA.pdf": {"grade": "2° Secundaria", "field": "Múltiples Lenguajes", "title": "Múltiples Lenguajes (2°)"},
    "2_TS-NLP-T1-BAJA.pdf": {"grade": "2° Secundaria", "field": "Proyectos", "title": "Nuestro Libro de Proyectos Tomo 1 (2°)"},
    "2_TS-NLP-T2-BAJA.pdf": {"grade": "2° Secundaria", "field": "Proyectos", "title": "Nuestro Libro de Proyectos Tomo 2 (2°)"},
    "2_TS-NLP-T3-BAJA.pdf": {"grade": "2° Secundaria", "field": "Proyectos", "title": "Nuestro Libro de Proyectos Tomo 3 (2°)"},
    "2_TS-SPC-BAJA.pdf": {"grade": "2° Secundaria", "field": "Saberes y Pensamiento Científico", "title": "Saberes y Pensamiento Científico (2°)"},
    "2_TS_LENGUAJES-BAJA.pdf": {"grade": "2° Secundaria", "field": "Lenguajes", "title": "Lenguajes (2°)"},

    "3_TS-ENS-BAJA.pdf": {"grade": "3° Secundaria", "field": "Ética, Naturaleza y Sociedades", "title": "Ética, Naturaleza y Sociedades (3°)"},
    "3_TS-HC-BAJA.pdf": {"grade": "3° Secundaria", "field": "De lo Humano y lo Comunitario", "title": "De lo Humano y lo Comunitario (3°)"},
    "3_TS-INGLES-BAJA.pdf": {"grade": "3° Secundaria", "field": "Lenguajes", "title": "Lenguajes - Inglés (3°)"},
    "3_TS-LENGUAJES-BAJA.pdf": {"grade": "3° Secundaria", "field": "Lenguajes", "title": "Lenguajes (3°)"},
    "3_TS-ML-BAJA.pdf": {"grade": "3° Secundaria", "field": "Múltiples Lenguajes", "title": "Múltiples Lenguajes (3°)"},
    "3_TS-NLP-T1-BAJA.pdf": {"grade": "3° Secundaria", "field": "Proyectos", "title": "Nuestro Libro de Proyectos Tomo 1 (3°)"},
    "3_TS-NLP-T2-BAJA.pdf": {"grade": "3° Secundaria", "field": "Proyectos", "title": "Nuestro Libro de Proyectos Tomo 2 (3°)"},
    "3_TS-NLP-T3-BAJA.pdf": {"grade": "3° Secundaria", "field": "Proyectos", "title": "Nuestro Libro de Proyectos Tomo 3 (3°)"},
    "3_TS-SPC-BAJA.pdf": {"grade": "3° Secundaria", "field": "Saberes y Pensamiento Científico", "title": "Saberes y Pensamiento Científico (3°)"},

    "MULTI-TS-HIST-PUEBLO-MEX-BAJA.pdf": {"grade": "Multigrado", "field": "Ética, Naturaleza y Sociedades", "title": "Historia del Pueblo de México"}
}

catalog = []

print("🚀 Iniciando indexación de libros de 2° y 3° de Telesecundaria...")

for pdf_file, info in BOOK_MAP.items():
    pdf_path = os.path.join(SOURCE_DIR, pdf_file)
    if not os.path.exists(pdf_path):
        print(f"⚠️ Archivo no encontrado: {pdf_path}")
        continue

    slug = pdf_file.replace(".pdf", "").replace("-", "_").lower()
    md_filename = f"{slug}.md"
    md_path = os.path.join(OUTPUT_MD_DIR, md_filename)

    if os.path.exists(md_path) and os.path.getsize(md_path) > 1000:
        print(f"⏩ Ya procesado: {info['title']} ({md_filename})")
        continue

    print(f"📖 Procesando {info['title']} ({pdf_file})...")

    import pypdf
    reader = pypdf.PdfReader(pdf_path)
    md_lines = []
    md_lines.append(f"# {info['title']}")
    md_lines.append(f"- **Grado**: {info['grade']}")
    md_lines.append(f"- **Campo Formativo**: {info['field']}")
    md_lines.append(f"- **Total Páginas**: {len(reader.pages)}")
    md_lines.append("\n---\n")

    book_entries = []

    for page_num, page in enumerate(reader.pages):
        try:
            raw_text = page.extract_text() or ""
            cleaned_text = re.sub(r'\n+', '\n', raw_text).strip()
        except Exception as e:
            cleaned_text = ""

        if not cleaned_text:
            continue

        page_display = page_num + 1

        md_lines.append(f"### Página {page_display}\n")
        md_lines.append(cleaned_text)
        md_lines.append("\n---\n")

        snippet = cleaned_text[:300].replace("\n", " ")

        book_entries.append({
            "bookTitle": info["title"],
            "grade": info["grade"],
            "field": info["field"],
            "page": page_display,
            "snippet": snippet,
            "file": md_filename
        })

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    catalog.extend(book_entries)
    print(f"  ✅ Guardado {md_filename} ({len(book_entries)} páginas procesadas).")

# Guardar catálogo master en JSON
catalog_json_path = os.path.join(OUTPUT_INDEX_DIR, "catalog.json")
with open(catalog_json_path, "w", encoding="utf-8") as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)

print(f"\n🎉 Indexación completada con éxito. Se indexaron {len(catalog)} páginas en total.")
print(f"📁 Markdown guardados en: {OUTPUT_MD_DIR}")
print(f"📄 Catálogo JSON guardado en: {catalog_json_path}")
