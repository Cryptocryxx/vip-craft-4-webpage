import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";

type SignOutButtonProps = {
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
  iconOnly?: boolean;
};

export function SignOutButton({ size = "sm", variant = "ghost", className, iconOnly = false }: SignOutButtonProps) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        title="Ausloggen"
        aria-label="Ausloggen"
        className={buttonClasses(variant, size, `${iconOnly ? "size-9 px-0" : ""} ${className ?? ""}`)}
      >
        <LogOut className="size-4" />
        {!iconOnly && "Logout"}
      </button>
    </form>
  );
}
