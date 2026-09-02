import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      minecraftName: string | null;
      whitelisted: boolean;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    minecraftName?: string | null;
    whitelisted?: boolean;
    role?: string;
  }
}
