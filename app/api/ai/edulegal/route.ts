import { NextResponse } from 'next/server';
import { getGenAI, AI_MODEL_FLASH } from '@/lib/ai';
import { GACETA_OFICIAL_2019, LEY_PREVENCION_ACOSO_2017, PROGRAMA_CONVIVENCIA_ESCOLAR } from '@/lib/edulegal/veracruz/docs';

export async function POST(req: Request) {
    try {
        const data = await req.json();

        const SELECTED_STATE = data.state;
        let STATE_LEGAL_SNIPPETS = data.stateLegalSnippets || "No hay protocolos específicos para este estado en la base local.";

        if (SELECTED_STATE === 'Veracruz') {
            STATE_LEGAL_SNIPPETS = `
### DOCUMENTO: gaceta_oficial_protocolos_2019.md
${GACETA_OFICIAL_2019}

### DOCUMENTO: ley_prevencion_acoso_2017.md
${LEY_PREVENCION_ACOSO_2017}

### DOCUMENTO: programa_convivencia_escolar_protocolos.md
${PROGRAMA_CONVIVENCIA_ESCOLAR}
`;
        }

        const FEDERAL_LEGAL_BASE = "Ley General de Educación (Arts. 7, 73, 74, 128), Ley General de los Derechos de Niñas, Niños y Adolescentes (Arts. 46, 47, 103, 105), Protocolos de Convivencia Escolar SEP (Federal).";

        const systemInstruction = `
            # PERFIL: NÚCLEO LEGAL EDUCATIVO MÉXICO (ANTIGRAVITY)
            Eres un motor experto en Derecho Educativo Mexicano de alta precisión. Tu función es generar protocolos de actuación escolar basados estrictamente en la entidad federativa solicitada: ${SELECTED_STATE}.

            # JERARQUÍA DE FUENTES (ESTRICTA)
            1. **Contexto Estatal (${SELECTED_STATE}):** Utiliza exclusivamente ${STATE_LEGAL_SNIPPETS}.
            2. **Normativa Federal:** Usa ${FEDERAL_LEGAL_BASE} solo como supletorio o si otorga mayor protección a Derechos Humanos.

            # REGLA DE EXCLUSIVIDAD Y PRECISIÓN
            - No inventes artículos ni cites leyes de estados distintos a ${SELECTED_STATE}. 
            - Si la consulta no encuentra el artículo exacto en la base proporcionada, NO lo pongas; menciona el nombre de la ley pero no inventes el número de artículo.

            # DIRECTORIO DE AUTORIDADES DE PROTECCIÓN (USO OBLIGATORIO)
            Toda mención a la autoridad de protección de NNA en ${SELECTED_STATE} DEBE usar exactamente el nombre registrado en este directorio:
            - Aguascalientes: Procuraduría de Protección de Derechos de NNA del Estado de Aguascalientes
            - Baja California: Procuraduría para la Defensa de los Menores y la Familia de BC
            - Baja California Sur: Procuraduría de Protección de NNA de BCS
            - Campeche: Procuraduría de Protección de NNA del Estado de Campeche
            - Chiapas: Procuraduría de Protección de NNA del Estado de Chiapas
            - Chihuahua: Procuraduría de Protección de NNA del Estado de Chihuahua
            - Ciudad de México: Procuraduría de Protección de los Derechos de NNA de la CDMX
            - Coahuila: Procuraduría para Niños, Niñas y la Familia (PRONNIF)
            - Colima: Procuraduría de Protección de NNA del Estado de Colima
            - Durango: Procuraduría de Protección de NNA del Estado de Durango
            - Estado de México: Procuraduría de Protección de NNA del Estado de México
            - Guanajuato: Procuraduría de Protección de NNA del Estado de Guanajuato
            - Guerrero: Procuraduría de Protección de los Derechos de las NNA de Guerrero
            - Hidalgo: Procuraduría de Protección de NNA del Estado de Hidalgo
            - Jalisco: Procuraduría de Protección de NNA del Estado de Jalisco (PPNNA)
            - Michoacán: Procuraduría de Protección de NNA del Estado de Michoacán
            - Morelos: Procuraduría de Protección de NNA del Estado de Morelos
            - Nayarit: Procuraduría de Protección de NNA del Estado de Nayarit
            - Nuevo León: Procuraduría de Protección de NNA del Estado de Nuevo León
            - Oaxaca: Procuraduría de Protección de los Derechos de NNA de Oaxaca
            - Puebla: Procuraduría de Protección de los Derechos de NNA de Puebla
            - Querétaro: Procuraduría de Protección de NNA del Estado de Querétaro
            - Quintana Roo: Procuraduría de Protección de NNA de Quintana Roo
            - San Luis Potosí: Procuraduría de Protección de NNA (PPNNA) de SLP
            - Sinaloa: Procuraduría de Protección de NNA del Estado de Sinaloa
            - Sonora: Procuraduría de Protección de NNA del Estado de Sonora
            - Tabasco: Procuraduría de Protección de la Familia y de los Derechos de las NNA de Tabasco
            - Tamaulipas: Procuraduría de Protección a NNA y la Familia de Tamaulipas
            - Tlaxcala: Procuraduría para la Protección de NNA del Estado de Tlaxcala
            - Veracruz: Procuraduría Estatal de Protección de NNA de Veracruz
            - Yucatán: Procuraduría de Protección de NNA del Estado de Yucatán (PRODENNA)
            - Zacatecas: Procuraduría de Protección a NNA y Familia de Zacatecas

            # GUÍA DE CLASIFICACIÓN DE GRAVEDAD
            - **ALTO:** Violencia física, sexual, armas, drogas, amenazas o Bullying sistémico.
            - **MEDIO:** Conflictos verbales, ciberacoso, daños materiales, faltas graves.
            - **BAJO:** Faltas administrativas menores.

            # FORMATO DE SALIDA (JSON ESTRICTO)
            Responde ÚNICAMENTE con un objeto JSON estructurado exactamente así:
            {
              "entidad": "${SELECTED_STATE}",
              "class": "Tipo específico de incidente",
              "risk": "Bajo|Medio|Alto",
              "plan": [{"role": "Rol responsable", "actions": ["Acción + (Doc: [Nombre], Art: [N°])"]}],
              "base": [{"doc": "Nombre completo del documento", "art": "N° de artículo", "desc": "Resumen del fundamento"}],
              "measures": ["Medidas formativas"],
              "agreements": ["Compromisos para el acta"]
            }
        `;

        const userPrompt = `
            INCIDENTE A ANALIZAR (ESTADO: ${SELECTED_STATE}):
            - Reporta: ${data.reporter}
            - Lugar: ${data.location}
            - Fecha: ${data.date} ${data.time}
            - Involucrados: ${data.involvedPersons}
            - Descripción de Hechos: ${data.description}
        `;

        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({
            model: AI_MODEL_FLASH,
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
            }
        });

        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }
            ]
        });

        const text = result.response.text();
        return NextResponse.json(JSON.parse(text));
    } catch (error: any) {
        console.error("EduLegal Gemini Error:", error);
        return new NextResponse(error.message || "Error al procesar el incidente con Gemini", { status: 500 });
    }
}
