import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function PageShell({ title, subtitle, action, children }: PageShellProps) {
  return (
    <div className="flex flex-col gap-5 pb-2">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-white text-3xl sm:text-4xl xl:text-5xl font-medium leading-tight drop-shadow-lg">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-white text-sm sm:text-base max-w-xl drop-shadow-lg">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
