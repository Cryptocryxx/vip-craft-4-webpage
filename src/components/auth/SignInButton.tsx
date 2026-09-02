import { authConfigured, signIn } from "@/auth";
import { buttonClasses, type ButtonSize } from "@/components/ui/Button";
import { DiscordIcon } from "@/components/ui/DiscordIcon";

type SignInButtonProps = {
  size?: ButtonSize;
  className?: string;
  redirectTo?: string;
  label?: string;
};

/** Discord-Login (Server Component mit Server Action). */
export function SignInButton({ size = "md", className, redirectTo = "/dashboard", label = "Login mit Discord" }: SignInButtonProps) {
  if (!authConfigured) {
    return (
      <span
        title="Discord-Login ist noch nicht konfiguriert – AUTH_DISCORD_ID und AUTH_DISCORD_SECRET in der .env setzen."
        className={buttonClasses("outline", size, `cursor-not-allowed opacity-60 ${className ?? ""}`)}
      >
        <DiscordIcon className="size-4" />
        {label}
      </span>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await signIn("discord", { redirectTo });
      }}
    >
      <button type="submit" className={buttonClasses("brass", size, className)}>
        <DiscordIcon className="size-4" />
        {label}
      </button>
    </form>
  );
}
