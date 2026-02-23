// Shared types used across WbsSection, GanttSection, and ProjectSetupSection

export type WbsPhase = {
    id: string;
    name: string;
    startWeek: number;
    durationWeeks: number;
    items: string[];
};

export type KanbanTask = {
    id: number;
    title: string;
};
