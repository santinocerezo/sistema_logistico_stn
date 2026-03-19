import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'default';
  children: React.ReactNode;
}

export default function Badge({ variant = 'default', children, className = '', ...props }: BadgeProps) {
  const variantClasses = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    default: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`badge ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
