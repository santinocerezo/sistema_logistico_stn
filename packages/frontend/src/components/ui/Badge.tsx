import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'default';
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<string, { background: string; color: string }> = {
  primary: { background: '#EFF6FF', color: '#1D4ED8' },
  success: { background: '#DCFCE7', color: '#15803D' },
  warning: { background: '#FEF9C3', color: '#92400E' },
  error:   { background: '#FEE2E2', color: '#B91C1C' },
  default: { background: '#F1F5F9', color: '#475569' },
};

export default function Badge({ variant = 'default', children, className = '', style, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${className}`}
      style={{ ...VARIANT_STYLES[variant], ...style }}
      {...props}
    >
      {children}
    </span>
  );
}
