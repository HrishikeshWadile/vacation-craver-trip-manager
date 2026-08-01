import type { ReactNode } from "react";

interface AuthCardProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared shell for Login / Register. The dashed divider + notch
 * evoke a boarding-pass stub, a small nod to "trip" without
 * overdoing it — everything else stays quiet and functional.
 */
export function AuthCard({ eyebrow, title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="relative rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.6)] overflow-hidden">
          {/* stub notches */}
          <div className="absolute -left-3 top-[168px] h-6 w-6 rounded-full bg-slate-950" />
          <div className="absolute -right-3 top-[168px] h-6 w-6 rounded-full bg-slate-950" />

          <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-indigo-700 to-indigo-900 text-white">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-200">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-indigo-100/80">{subtitle}</p>
            )}
          </div>

          <div
            className="border-t-2 border-dashed border-slate-200"
            aria-hidden="true"
          />

          <div className="px-8 py-8">{children}</div>

          {footer && (
            <div className="px-8 pb-8 -mt-2 text-sm text-slate-500">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
