/**
 * Typen der Server-Timeline („Die Lore").
 *
 * Die Einträge sollen von Hand gepflegt werden – sobald auf dem Server etwas
 * passiert, das es wert ist. Solange die Liste leer ist, zeigt die Seite das
 * ehrlich an, statt eine erfundene Geschichte zu erzählen.
 */

export type MilestoneKind = "launch" | "build" | "train" | "disaster" | "nether" | "community";

export type Milestone = {
  id: string;
  date: string;
  title: string;
  description: string;
  kind: MilestoneKind;
  players?: string[];
};

export const milestones: Milestone[] = [];
