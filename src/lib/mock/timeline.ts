/**
 * Mock-Daten für die Server-Timeline ("Die Lore").
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

export const milestones: Milestone[] = [
  {
    id: "launch",
    date: "2026-08-15",
    title: "Season 4 startet",
    description: "Neue Welt, neues Modpack, 38 Leute am ersten Abend online. Der Spawn ist noch ein Feld mit einer Kiste.",
    kind: "launch",
  },
  {
    id: "first-press",
    date: "2026-08-17",
    title: "Erste Mechanical Press läuft",
    description: "Ein Wasserrad, eine Welle, eine Presse – und schon gibt es Messingplatten. Der industrielle Aufstieg beginnt.",
    kind: "build",
    players: ["TechnoTim"],
  },
  {
    id: "first-train",
    date: "2026-08-22",
    title: "Erste Zugstrecke: Spawn ↔ Uni-Campus",
    description: "1,8 km Schiene, zwei Bahnhöfe, ein Signal, das keiner versteht. Der Nordexpress fährt seitdem alle 10 Minuten.",
    kind: "train",
    players: ["Jonas_MC", "Felix_F"],
  },
  {
    id: "base-explosion",
    date: "2026-08-25",
    title: "Jonas' Basis explodiert",
    description: "Ein Creeper in der Blaze-Burner-Halle. Danach 40 Minuten Stille im Voice-Chat und ein neuer Rekord in der Hall of Shame.",
    kind: "disaster",
    players: ["Jonas_MC"],
  },
  {
    id: "nether-hub",
    date: "2026-08-29",
    title: "Nether-Hub eröffnet",
    description: "Zentraler Hub mit Portalen zu allen Basen, komplett aus Messing und Blackstone. Inklusive Wither-Arena.",
    kind: "nether",
    players: ["Nadja", "Kaya"],
  },
  {
    id: "first-schematic",
    date: "2026-09-01",
    title: "Erste Schematic in der Galerie",
    description: "Die kompakte Andesit-Alloy-Farm ist online – und wurde in den ersten 24 Stunden über 100-mal heruntergeladen.",
    kind: "community",
    players: ["Lorenz"],
  },
];
