export type DayType = "concept_story" | "guided_practice" | "boss_fight";

export interface DayContent {
    dayNumber: number;
    type: string;
    title: string;
    narrative?: string;
    content?: {
        explanation?: {
            chunks: string[];
            analogy: string;
        };
        miniGame?: {
            type?: "multiple_choice" | "drag_drop" | "tap_correct" | "word_search" | "memory_match";
            question?: string;
            options?: string[];
            correctAnswer?: string;
            words?: string[];
            pairs?: { concept: string; definition: string }[];
            feedbackSuccess?: string;
            feedbackError?: string;
        };
        practiceProblem?: {
            statement: string;
            correctValue: string;
            hint: string;
            tipo_evidencia_requerida?: string;
        };
    };
    isGenerating?: boolean;
    isRetrying?: boolean;
    pda_objetivo?: string;
    cierre_metacognicion?: string;
    glosario?: any[];
    presentationType?: string;
    isStudentMission?: boolean;
    insertAfterDay?: number;
    lecturas_sugeridas?: any[];
}

export interface BossDayContent {
    dayNumber: number;
    type: "boss_fight";
    title: string;
    originalProblemText: string;
    tipo_evidencia_requerida?: string;
    solvedVariations?: string[];
    isGenerating?: boolean;
    isRetrying?: boolean;
    isStudentMission?: boolean;
    insertAfterDay?: number;
    lecturas_sugeridas?: any[];
}

export type LevelContent = DayContent | BossDayContent;
