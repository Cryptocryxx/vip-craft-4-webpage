import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "brass" | "diamond" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export const buttonVariantClass: Record<ButtonVariant, string> = {
  brass: "btn-brass",
  diamond: "btn-diamond",
  outline: "btn-outline",
  ghost: "btn-ghost",
};

export const buttonSizeClass: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

type BaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

type LinkProps = ComponentProps<typeof Link>;

type ButtonAsButton = BaseProps & Omit<ComponentProps<"button">, "className" | "children"> & { href?: undefined };
type ButtonAsLink = BaseProps & Omit<LinkProps, "className" | "children"> & { href: LinkProps["href"] };

export function buttonClasses(variant: ButtonVariant = "brass", size: ButtonSize = "md", className?: string): string {
  return cn("btn", buttonVariantClass[variant], buttonSizeClass[size], className);
}

/** Button im Messing-/Diamant-Look. Mit `href` wird ein Next-Link gerendert. */
export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "brass", size = "md", className, children, ...rest } = props;
  const classes = buttonClasses(variant, size, className);

  if (rest.href !== undefined) {
    const linkProps = rest as Omit<LinkProps, "className" | "children">;
    return (
      <Link {...linkProps} className={classes}>
        {children}
      </Link>
    );
  }

  const buttonProps = rest as Omit<ComponentProps<"button">, "className" | "children">;
  return (
    <button type="button" {...buttonProps} className={classes}>
      {children}
    </button>
  );
}
