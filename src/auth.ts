import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
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
  providers: authConfigured ? [Discord] : [],
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
     * existiert und der User noch nicht freigeschaltet ist). Fehler dürfen den
     * Login nicht blockieren.
     */
    async signIn({ user }) {
      if (!user?.id) return;
      try {
        await onUserSignIn(user.id);
      } catch (error) {
        console.error("[auth] Whitelist-Antrag konnte nicht angelegt werden:", error);
      }
    },
  },
});
