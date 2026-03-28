import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  children: React.ReactNode;
}

export function Card({ hover, children, className = '', style, ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-white ${className}`}
      style={{
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        transition: hover ? 'box-shadow 0.2s, transform 0.2s' : undefined,
        ...style,
      }}
      onMouseEnter={hover ? (e) => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(2,132,199,0.15)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      } : undefined}
      onMouseLeave={hover ? (e) => {
        e.currentTarget.style.boxShadow = '0 1px 8px rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = '';
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 py-5 ${className}`} style={{ borderBottom: '1px solid #E2E8F0' }} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`font-bold text-slate-900 ${className}`} style={{ fontFamily: "'Poppins', sans-serif" }} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-slate-400 mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 py-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 py-4 flex items-center gap-2 ${className}`} style={{ borderTop: '1px solid #E2E8F0' }} {...props}>
      {children}
    </div>
  );
}
