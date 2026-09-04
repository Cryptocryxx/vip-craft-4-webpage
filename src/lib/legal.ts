/**
 * Angaben für Impressum, Datenschutzerklärung und Nutzungsbedingungen.
 *
 * ▸ ALLE mit PLACEHOLDER markierten Felder müssen vor dem Livegang ausgefüllt werden.
 *   Solange dort noch der Platzhalter steht, blendet die Seite einen sichtbaren
 *   Warnhinweis ein (siehe `LegalPlaceholderNotice`).
 *
 * ▸ Rechtsgrundlagen: § 5 DDG (Impressum), § 18 Abs. 2 MStV (inhaltlich Verantwortlicher),
 *   Art. 13 DSGVO (Informationspflichten), § 25 TDDDG (Endgeräte-Zugriff).
 */

export const PLACEHOLDER = "[BITTE AUSFÜLLEN]";

export type LegalConfig = {
  /** Betreiber der Website – bei Privatpersonen der volle bürgerliche Name. */
  operator: {
    name: string;
    /** Optional: Vereins-/Firmenname, falls die Seite nicht privat betrieben wird. */
    organisation: string | null;
    street: string;
    zip: string;
    city: string;
    country: string;
    email: string;
    /** § 5 DDG verlangt eine zweite, unmittelbare Kontaktmöglichkeit neben der E-Mail. */
    phone: string;
    /** Verantwortlich nach § 18 Abs. 2 MStV (meist dieselbe Person). */
    responsibleForContent: string;
    /** Nur falls vorhanden – sonst null. */
    register: string | null;
    vatId: string | null;
  };
  /** Hoster der Website (für die Datenschutzerklärung, Auftragsverarbeitung). */
  hosting: {
    name: string;
    address: string;
  };
  /** Betreiber des Minecraft-Servers, falls abweichend vom Website-Betreiber. */
  gameServerHosting: {
    name: string;
    address: string;
  };
  /** Stand der Dokumente (ISO-Datum). */
  lastUpdated: string;
};

export const legal: LegalConfig = {
  operator: {
    name: "Lorenz Bauscher",
    organisation: "Dendree",
    street: "Mosaikstraße 1",
    zip: "12345",
    city: "Berlin",
    country: "Deutschland",
    email: "l.bauscher@gmx.de",
    phone: "+49 30 12345678",
    responsibleForContent: "Lorenz Bauscher",
    register: null,
    vatId: null,
  },
  hosting: {
    name: "Lorenz Bauscher",
    address: "Mosaikstraße 1, 12345 Berlin, Deutschland",
  },
  gameServerHosting: {
    name: "Lorenz Bauscher",
    address: "Mosaikstraße 1, 12345 Berlin, Deutschland",
  },
  lastUpdated: "2026-09-04",
};

/** Alle Felder, die noch den Platzhalter enthalten – für den Warnhinweis. */
export function missingLegalFields(config: LegalConfig = legal): string[] {
  const missing: string[] = [];
  const check = (label: string, value: string | null) => {
    if (value === PLACEHOLDER) missing.push(label);
  };

  check("Name des Betreibers", config.operator.name);
  check("Straße und Hausnummer", config.operator.street);
  check("Postleitzahl", config.operator.zip);
  check("Ort", config.operator.city);
  check("E-Mail-Adresse", config.operator.email);
  check("Telefonnummer", config.operator.phone);
  check("Inhaltlich Verantwortlicher (§ 18 Abs. 2 MStV)", config.operator.responsibleForContent);
  check("Hosting-Anbieter der Website", config.hosting.name);
  check("Anschrift des Hosting-Anbieters", config.hosting.address);
  check("Anbieter des Spielservers", config.gameServerHosting.name);
  check("Anschrift des Spielserver-Anbieters", config.gameServerHosting.address);

  return missing;
}

/** Anschrift als mehrzeiliger Block. */
export function addressLines(config: LegalConfig = legal): string[] {
  const { operator } = config;
  return [
    operator.organisation,
    operator.name,
    operator.street,
    `${operator.zip} ${operator.city}`,
    operator.country,
  ].filter((line): line is string => Boolean(line));
}
