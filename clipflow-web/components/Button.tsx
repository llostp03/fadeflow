import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", type = "button", ...props }, ref) => {
    const base =
      "inline-flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-extrabold transition-opacity disabled:cursor-not-allowed disabled:opacity-50";
    const variants = {
      primary: "bg-[#d4af37] text-black hover:opacity-90",
      secondary:
        "border border-[#333] bg-[#14141a] text-white hover:border-[#d4af37] hover:text-[#d4af37]",
    };
    return (
      <button
        ref={ref}
        type={type}
        className={`${base} ${variants[variant]} ${className}`.trim()}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
