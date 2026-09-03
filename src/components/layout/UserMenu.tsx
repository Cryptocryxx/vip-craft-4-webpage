import Image from "next/image";
import Link from "next/link";
import { Cog, User } from "lucide-react";
import type { Session } from "next-auth";
import { SignInButton } from "@/components/auth/SignInButton";
import { SignOutButton } from "@/components/auth/SignOutButton";

/** Login-Button bzw. Avatar + Logout im Header. */
export function UserMenu({ session }: { session: Session | null }) {
  if (!session?.user) {
    return <SignInButton size="sm" label="Login" className="hidden sm:inline-flex" />;
  }

  const { name, image, role } = session.user;

  return (
    <div className="flex items-center gap-1">
      {role === "ADMIN" && (
        <Link
          href="/admin"
          title="Kontrollraum"
          aria-label="Kontrollraum"
          className="btn btn-ghost btn-sm hidden size-9 px-0 text-brass-200 hover:text-brass-100 sm:inline-flex"
        >
          <Cog className="size-4" />
        </Link>
      )}
      <Link
        href="/dashboard"
        className="flex h-9 items-center gap-2 rounded-lg border border-brass-500/30 bg-wood-900/60 pr-3 pl-1.5 text-sm transition-colors hover:border-brass-400 hover:bg-wood-800"
        title="Zum Dashboard"
      >
        {image ? (
          <Image src={image} alt="" width={26} height={26} className="rounded-full ring-1 ring-brass-500/40" />
        ) : (
          <span className="flex size-[26px] items-center justify-center rounded-full bg-brass-500/20 text-brass-200">
            <User className="size-4" />
          </span>
        )}
        <span className="hidden max-w-28 truncate font-display font-semibold text-cream sm:inline">{name ?? "Profil"}</span>
      </Link>
      <SignOutButton iconOnly className="hidden sm:inline-flex" />
    </div>
  );
}
