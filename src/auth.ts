import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { discordCheckEnabled, recordMembershipFromLogin } from "@/lib/discord";
import { prisma } from "@/lib/prisma";
import { onUserSignIn } from "@/lib/whitelist";

/** true, sobald eine Discord-OAuth-App in der .env hinterlegt ist. */
export const authConfigured = Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET);

// Der Adapter ist gegen den Legacy-Typ aus "@prisma/client" typisiert; der von Prisma 7
// generierte Client ist zur Laufzeit strukturell identisch.
type AdapterClient = Parameters<typeof PrismaAdapter>[0];

/**
 * Schreibt Token und erteilte Rechte bei jeder Anmeldung in die Datenbank.
 *
 * Auth.js legt die Account-Zeile nur beim allerersten Verknüpfen an und rührt
 * sie danach nicht mehr an. Wer sich also erneut anmeldet – etwa weil die App
 * inzwischen einen weiteren Scope anfragt – hat zwar ein frisches Token mit
 * neuen Rechten, in der Datenbank steht aber weiter das alte. Jede spätere
 * Abfrage (siehe lib/discord.ts) lief damit ins Leere, obwohl die Anmeldung
 * selbst funktioniert hat. Deshalb hier von Hand nachziehen.
 */
async function aktualisiereKonto(account: {
  provider: string;
  providerAccountId: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
  token_type?: string;
}): Promise<void> {
  if (!account.access_token) return;

  try {
    await prisma.account.update({
      where: {
        provider_providerAccountId: {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
      },
      data: {
        access_token: account.access_token,
        // Nur überschreiben, wenn Discord etwas mitschickt – sonst stünde da
        // hinterher nichts mehr, und die Erneuerung wäre unmöglich.
        ...(account.refresh_token ? { refresh_token: account.refresh_token } : {}),
        ...(account.expires_at ? { expires_at: account.expires_at } : {}),
        ...(account.scope ? { scope: account.scope } : {}),
        ...(account.token_type ? { token_type: account.token_type } : {}),
      },
    });
  } catch (error) {
    // Beim allerersten Login legt der Adapter die Zeile selbst an – dass sie
    // hier noch fehlt, ist also kein Fehler.
    console.error("[auth] Konto konnte nicht aktualisiert werden:", error);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma as unknown as AdapterClient),
  // Ohne konfigurierte Discord-App bleibt die Provider-Liste leer, damit die Seite
  // trotzdem startet (Login-Button wird dann als "nicht konfiguriert" angezeigt).
  providers: authConfigured
    ? [
        Discord({
          // Zusätzlich zum Standard ("identify email") die Berechtigung, die
          // Mitgliedschaft in genau EINEM Server abzufragen – nicht "guilds",
          // das die komplette Serverliste preisgeben würde. Siehe lib/discord.ts.
          authorization: { params: { scope: "identify email guilds.members.read" } },
        }),
      ]
    : [],
  session: { strategy: "database" },
  pages: {
    signIn: "/dashboard",
    error: "/dashboard",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.minecraftName = user.minecraftName ?? null;
      session.user.whitelisted = user.whitelisted ?? false;
      session.user.role = user.role ?? "PLAYER";
      return session;
    },
  },
  events: {
    /**
     * Beim Login wird automatisch ein Whitelist-Antrag angelegt (falls noch keiner
     * existiert und der User noch nicht freigeschaltet ist), und die
     * Discord-Mitgliedschaft wird gleich mitgeprüft – hier ist das Access-Token
     * frisch. Fehler dürfen den Login nicht blockieren.
     */
    async signIn({ user, account }) {
      if (!user?.id) return;

      if (account?.provider === "discord") await aktualisiereKonto(account);

      if (discordCheckEnabled && account?.provider === "discord" && account.access_token) {
        try {
          await recordMembershipFromLogin(user.id, account.access_token);
        } catch (error) {
          console.error("[auth] Discord-Mitgliedschaft konnte nicht geprüft werden:", error);
        }
      }

      try {
        await onUserSignIn(user.id);
      } catch (error) {
        console.error("[auth] Whitelist-Antrag konnte nicht angelegt werden:", error);
      }
    },
  },
});
