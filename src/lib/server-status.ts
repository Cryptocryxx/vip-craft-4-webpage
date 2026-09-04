/**
 * Live-Server-Status über die öffentliche API von mcsrvstat.us (Platzhalter).
 * Später kann hier auch ein direkter Server-Ping erfolgen.
 */
export type ServerStatus = {
  address: string;
  online: boolean;
  players: { online: number; max: number; sample: string[] };
  version: string | null;
  motd: string[];
  icon: string | null;
  checkedAt: string;
  error?: string;
};

type McSrvStatResponse = {
  online: boolean;
  ip?: string;
  port?: number;
  hostname?: string;
  version?: string;
  players?: { online: number; max: number; list?: { name: string; uuid: string }[] };
  motd?: { raw: string[]; clean: string[]; html: string[] };
  icon?: string;
};

/**
 * Wie ServerStatus, aber die Adresse kann fehlen: /api/server-status liefert sie
 * nur an freigeschaltete Spieler aus (siehe lib/viewer.ts).
 */
export type ServerStatusResponse = Omit<ServerStatus, "address"> & { address: string | null };

export async function fetchServerStatus(address: string): Promise<ServerStatus> {
  const checkedAt = new Date().toISOString();
  const offline: ServerStatus = {
    address,
    online: false,
    players: { online: 0, max: 0, sample: [] },
    version: null,
    motd: [],
    icon: null,
    checkedAt,
  };

  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(address)}`, {
      headers: { "User-Agent": "VIPCraft4-Website/1.0 (server status widget)" },
      // mcsrvstat.us cached selbst ~1 min – häufiger abzufragen bringt nichts.
      next: { revalidate: 60 },
      // Nicht erreichbare Hosts brauchen bei mcsrvstat.us mehrere Sekunden – hart begrenzen.
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      throw new Error(`mcsrvstat.us antwortete mit HTTP ${res.status}`);
    }
    const data = (await res.json()) as McSrvStatResponse;

    return {
      address,
      online: Boolean(data.online),
      players: {
        online: data.players?.online ?? 0,
        max: data.players?.max ?? 0,
        sample: (data.players?.list ?? []).map((p) => p.name).slice(0, 12),
      },
      version: data.version ?? null,
      motd: (data.motd?.clean ?? []).map((line) => line.trim()).filter(Boolean),
      icon: data.icon ?? null,
      checkedAt,
    };
  } catch (err) {
    return { ...offline, error: err instanceof Error ? err.message : "Unbekannter Fehler" };
  }
}
