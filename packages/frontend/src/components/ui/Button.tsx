import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const styles = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '-0.01em',
    outline: 'none',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  variants: {
    primary: {
      background: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 12px rgba(2,132,199,0.30)',
    },
    secondary: {
      background: '#0F172A',
      color: '#ffffff',
      boxShadow: '0 2px 8px rgba(15,23,42,0.20)',
    },
    outline: {
      background: 'transparent',
      color: '#0284C7',
      border: '1.5px solid #38BDF8',
      boxShadow: 'none',
    },
    ghost: {
      background: 'transparent',
      color: '#334155',
      boxShadow: 'none',
    },
    danger: {
      background: 'linear-gradient(135deg, #F87171 0%, #DC2626 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 8px rgba(220,38,38,0.25)',
    },
  },
  sizes: {
    sm: { padding: '6px 14px', fontSize: '12px', borderRadius: '8px' },
    md: { padding: '10px 20px', fontSize: '14px' },
    lg: { padding: '13px 28px', fontSize: '15px', borderRadius: '14px' },
  },
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, style, ...props }, ref) => {
    const isDisabled = disabled || loading;

    const computedStyle = {
      ...styles.base,
      ...styles.variants[variant],
      ...styles.sizes[size],
      ...(isDisabled ? styles.disabled : {}),
      ...style,
    };

    return (
      <button
        ref={ref}
        style={computedStyle}
        disabled={isDisabled}
        className={`stn-btn stn-btn-${variant} ${className}`}
        {...props}
        onMouseEnter={(e) => {
          if (!isDisabled) {
            const el = e.currentTarget;
            if (variant === 'primary') {
              el.style.transform = 'translateY(-1px)';
              el.style.boxShadow = '0 6px 20px rgba(2,132,199,0.40)';
            } else if (variant === 'secondary') {
              el.style.transform = 'translateY(-1px)';
              el.style.background = '#1E293B';
            } else if (variant === 'outline') {
              el.style.background = '#F0F9FF';
              el.style.borderColor = '#0284C7';
            } else if (variant === 'ghost') {
              el.style.background = '#F1F5F9';
              el.style.color = '#0284C7';
            } else if (variant === 'danger') {
              el.style.transform = 'translateY(-1px)';
              el.style.boxShadow = '0 6px 16px rgba(220,38,38,0.35)';
            }
          }
          props.onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          if (!isDisabled) {
            const el = e.currentTarget;
            Object.assign(el.style, {
              ...styles.variants[variant],
              transform: '',
            });
          }
          props.onMouseLeave?.(e);
        }}
        onMouseDown={(e) => {
          if (!isDisabled) {
            e.currentTarget.style.transform = 'scale(0.97)';
          }
          props.onMouseDown?.(e);
        }}
        onMouseUp={(e) => {
          if (!isDisabled) {
            e.currentTarget.style.transform = '';
          }
          props.onMouseUp?.(e);
        }}
      >
        {loading && (
          <Loader2
            style={{ marginRight: '8px', width: '15px', height: '15px', animation: 'spin 1s linear infinite' }}
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
