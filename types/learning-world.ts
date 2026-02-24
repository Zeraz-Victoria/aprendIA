export type DayType = "concept_story" | "guided_practice" | "boss_fight";

export interface DayContent {
    dayNumber: number;
    type: DayType;
    title: string;
    narrative: string;
    content: {
        explanation?: {
            chunks: string[];
            analogy: string;
        };
        miniGame?: {
            type: "multiple_choice" | "drag_drop" | "tap_correct";
            question: string;
            options: string[];
            correctAnswer: string;
            feedbackSuccess: string;
            feedbackError: string;
        };
        practiceProblem?: {
            statement: string;
            correctValue: number;
            hint: string;
        };
    };
}

export interface BossDayContent {
    dayNumber: number;
    type: "boss_fight";
    title: string;
    originalProblemImage?: string;
    originalProblemText: string;
    hints: string[];
}

export type LevelContent = DayContent | BossDayContent;
