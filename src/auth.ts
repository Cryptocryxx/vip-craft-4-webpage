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
