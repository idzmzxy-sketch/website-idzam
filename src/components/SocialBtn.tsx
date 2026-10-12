import type { ReactNode } from 'react';

interface SocialBtnProps {
  className: string;
  label: string;
  href?: string;
  children: ReactNode;
}

export default function SocialBtn({ className, label, href = '#', children }: SocialBtnProps) {
  return (
    <a
      href={href}
      aria-label={label}
      className={`w-8 h-8 rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity ${className}`}
    >
      {children}
    </a>
  );
}
