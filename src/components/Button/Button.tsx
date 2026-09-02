import type { ReactNode, MouseEvent } from "react";
import { cx } from "../../lib/cx";
import styles from "./Button.module.css";

interface ButtonProps {
  /** Renders an <a> when provided, otherwise a <button>. */
  href?: string;
  onClick?: (e: MouseEvent) => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg";
  external?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  "aria-label"?: string;
  children: ReactNode;
}

/** Link or button in the dexo.games square-edged house style. */
export function Button({
  href,
  onClick,
  variant = "primary",
  size = "md",
  external = true,
  disabled = false,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  const cls = cx(
    styles.btn,
    styles[variant],
    size === "lg" && styles.lg,
    disabled && styles.disabled,
    className,
  );

  if (href !== undefined) {
    const externalProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
    return (
      <a href={href} className={cls} onClick={onClick} {...externalProps} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
