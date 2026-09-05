import { getTranslations } from "next-intl/server";
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
export async function SignInButton({ size = "md", className, redirectTo = "/dashboard", label }: SignInButtonProps) {
  const t = await getTranslations("Auth");
  const beschriftung = label ?? t("signInWithDiscord");

  if (!authConfigured) {
    return (
      <span
        title={t("signInNotConfigured")}
        className={buttonClasses("outline", size, `cursor-not-allowed opacity-60 ${className ?? ""}`)}
      >
        <DiscordIcon className="size-4" />
        {beschriftung}
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
        {beschriftung}
      </button>
    </form>
  );
}
