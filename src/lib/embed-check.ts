import "server-only";

/**
 * Prüft serverseitig, ob sich eine URL in einem iframe von `embedderOrigin` aus
 * einbetten lässt – ohne dass wir uns auf ein clientseitiges Erkennen von
 * X-Frame-Options/CSP-Blockaden verlassen müssen (das geht aus dem Browser heraus
 * wegen Same-Origin-Beschränkungen nicht zuverlässig: ein blockierter iframe feuert
 * trotzdem sein "load"-Event, nur eben mit leerem Inhalt).
 */

export type EmbedCheckResult = { embeddable: true } | { embeddable: false; reason: "blocked" | "unreachable" };

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { result: EmbedCheckResult; fetchedAt: number }>();

function isAllowedAncestor(source: string, embedderOrigin: string): boolean {
  const cleaned = source.replace(/^['"]|['"]$/g, "");
  return cleaned === "*" || cleaned === embedderOrigin;
}

export async function checkIframeEmbeddable(url: string, embedderOrigin: string): Promise<EmbedCheckResult> {
  const cacheKey = `${url}\n${embedderOrigin}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.result;

  const result = await probe(url, embedderOrigin);
  cache.set(cacheKey, { result, fetchedAt: Date.now() });
  return result;
}

async function probe(url: string, embedderOrigin: string): Promise<EmbedCheckResult> {
  let response: Response;
  try {
    response = await fetch(url, { method: "GET", redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(8000) });
  } catch {
    return { embeddable: false, reason: "unreachable" };
  }

  // Der Inhalt interessiert uns nicht, nur die Header – Verbindung nicht unnötig offen halten.
  response.body?.cancel().catch(() => {});

  if (!response.ok) {
    return { embeddable: false, reason: "unreachable" };
  }

  const xfo = response.headers.get("x-frame-options")?.trim().toLowerCase();
  if (xfo === "deny" || xfo === "sameorigin") {
    return { embeddable: false, reason: "blocked" };
  }

  const csp = response.headers.get("content-security-policy") ?? "";
  const frameAncestors = /frame-ancestors\s+([^;]+)/i.exec(csp)?.[1]?.trim();
  if (frameAncestors) {
    const sources = frameAncestors.split(/\s+/).filter(Boolean);
    const allowed = sources.some((source) => isAllowedAncestor(source, embedderOrigin));
    if (!allowed) return { embeddable: false, reason: "blocked" };
  }

  return { embeddable: true };
}
