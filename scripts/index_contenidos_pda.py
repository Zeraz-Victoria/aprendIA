import os
import json
import openpyxl

EXCEL_PATH = '/Users/adrianvira/Desktop/Libros/Copia de Fase 6_1º_Conteniudos y PDA.xlsx'
OUTPUT_PATH = '/Users/adrianvira/.gemini/antigravity-ide/scratch/aprendIA/data/contenidos_pda.json'

def main():
    if not os.path.exists(EXCEL_PATH):
        print(f"Error: No se encontró el archivo Excel en {EXCEL_PATH}")
        return

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    records = []

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        
        campo_formativo = "LENGUAJES"
        if "BIO" in sheet_name or "GEO" in sheet_name or "MAT" in sheet_name:
            campo_formativo = "SABERES Y PENSAMIENTO CIENTÍFICO"
        elif "HIST" in sheet_name or "F.C.E" in sheet_name:
            campo_formativo = "ÉTICA, NATURALEZA Y SOCIEDADES"
        elif "TEC" in sheet_name or "TUTO" in sheet_name or "EDU.FIS" in sheet_name:
            campo_formativo = "DE LO HUMANO Y LO COMUNITARIO"

        curr_contenido = None

        for row in rows:
            if not any(row):
                continue
            
            val0 = str(row[0]).strip() if row[0] is not None else ""
            
            # Check for header rows
            if "CAMPO FORMATIVO" in val0.upper():
                campo_name = val0.upper().replace("CAMPO FORMATIVO", "").strip()
                if campo_name:
                    campo_formativo = campo_name
                continue
            
            if "CONTENIDOS DE LA FASE" in val0.upper() or "ANDRÉS" in val0.upper():
                continue

            val_pda = ""
            if len(row) > 2 and row[2] is not None:
                val_pda = str(row[2]).strip()
            elif len(row) > 1 and row[1] is not None:
                val_pda = str(row[1]).strip()

            if "1° GRADO" in val0.upper() or "1° GRADO" in val_pda.upper():
                continue

            if val0 and len(val0) > 5 and not val0.upper().startswith(sheet_name.strip().upper()):
                curr_contenido = val0

            if val_pda and len(val_pda) > 5 and not val_pda.upper().startswith("PROCESOS"):
                if not curr_contenido:
                    curr_contenido = val0 if val0 else "Contenido sin título"
                
                records.append({
                    "grado": "1° Secundaria",
                    "fase": "Fase 6",
                    "materia": sheet_name.strip(),
                    "campo_formativo": campo_formativo,
                    "contenido": curr_contenido,
                    "pda": val_pda
                })

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"✅ Se guardaron exitosamente {len(records)} registros en {OUTPUT_PATH}")

if __name__ == '__main__':
    main()
