import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Button — shadcn-style: rounded-md, shadow-xs, h-9, focus ring        */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "link";
type ButtonSize = "sm" | "default" | "lg" | "icon";

const buttonBase =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
  secondary:
    "border border-border bg-card text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground",
  outline:
    "border border-border bg-transparent text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground",
  ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
  danger: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
  link: "text-primary underline-offset-4 hover:underline",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 rounded-md gap-1.5 px-3",
  default: "h-9 px-4 py-2",
  lg: "h-10 rounded-md px-6 text-[15px]",
  icon: "size-9",
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                 */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge — shadcn rounded-md chip                                       */
/* ------------------------------------------------------------------ */

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "red" | "dark" | "brand";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3",
        tone === "neutral" && "border-border bg-muted text-muted-foreground",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "danger" && "border-red-200 bg-red-50 text-red-700",
        tone === "red" && "border-red-200 bg-red-50 text-red-700",
        tone === "brand" && "border-transparent bg-primary text-primary-foreground",
        tone === "dark" && "border-transparent bg-foreground text-background",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Input                                                                */
/* ------------------------------------------------------------------ */

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow]",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* SectionHeader                                                        */
/* ------------------------------------------------------------------ */

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TableShell                                                           */
/* ------------------------------------------------------------------ */

export function TableShell({
  columns,
  rows,
  children,
}: {
  columns: string[];
  rows?: number;
  children: ReactNode;
}) {
  return (
    <div className="table-scroll overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/60">
            {columns.map((column) => (
              <th
                key={column}
                className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {rows === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No rows available.</div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* NewlyPlannedHighlight — subtle red border on freshly planned data    */
/* ------------------------------------------------------------------ */

export function NewlyPlannedHighlight({
  children,
  active = true,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl transition-all",
        active && "ring-1 ring-primary/25 ring-offset-2 ring-offset-background",
      )}
    >
      {children}
    </div>
  );
}
