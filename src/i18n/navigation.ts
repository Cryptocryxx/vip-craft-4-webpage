import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

/**
 * Sprachbewusste Ersatzstücke für `next/link` und `next/navigation`.
 *
 * Wichtig, WARUM es die hier überhaupt braucht: Bei `localePrefix: "as-needed"`
 * trägt Deutsch keinen Präfix, Englisch schon (`/en/...`). Ein gewöhnliches
 * `<Link href="/dashboard">` würde auf einer englischen Seite trotzdem auf die
 * DEUTSCHE Version verlinken, weil `/dashboard` ohne Präfix eben Deutsch ist -
 * die Sprache ginge mitten in der Navigation verloren. `Link`, `redirect` und
 * `useRouter` von hier kennen die aktuelle Sprache und hängen den Präfix nur
 * dort an, wo er hingehört.
 *
 * Deshalb: In jeder Komponente, die zu einer anderen Seite verlinkt, kommt
 * `Link` von hier statt von `next/link` - mit genau derselben Schnittstelle,
 * ein Austausch des Imports reicht.
 */
export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
