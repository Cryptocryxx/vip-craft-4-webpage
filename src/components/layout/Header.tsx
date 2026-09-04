import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { MobileNav } from "@/components/layout/MobileNav";
import { NavLinks } from "@/components/layout/NavLinks";
import { ServerStatusWidget } from "@/components/layout/ServerStatusWidget";
import { UserMenu } from "@/components/layout/UserMenu";

export async function Header() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 border-b border-brass-500/25 bg-wood-950/85 backdrop-blur-md">
      <div className="brass-line absolute inset-x-0 top-0 opacity-70" />
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="VIP Craft 4 – Startseite">
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            priority
            className="drop-shadow-[0_0_10px_rgba(217,168,63,0.35)]"
          />
        </Link>

        <NavLinks className="ml-4 hidden lg:flex" />

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ServerStatusWidget />
          <UserMenu session={session} />
          <MobileNav isAdmin={isAdmin} loggedIn={Boolean(session?.user)} />
        </div>
      </div>
    </header>
  );
}
