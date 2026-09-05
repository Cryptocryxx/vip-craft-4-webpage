import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/auth";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";

type SignOutButtonProps = {
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
  iconOnly?: boolean;
};

export async function SignOutButton({ size = "sm", variant = "ghost", className, iconOnly = false }: SignOutButtonProps) {
  const t = await getTranslations("Auth");

  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        title={t("signOutAriaLabel")}
        aria-label={t("signOutAriaLabel")}
        className={buttonClasses(variant, size, `${iconOnly ? "size-9 px-0" : ""} ${className ?? ""}`)}
      >
        <LogOut className="size-4" />
        {!iconOnly && t("signOut")}
      </button>
    </form>
  );
}
