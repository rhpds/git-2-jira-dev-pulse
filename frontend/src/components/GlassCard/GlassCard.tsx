/**
 * GlassCard Component
 * Reusable glassmorphic card with gradient overlays and animations
 */

import { motion } from 'framer-motion';
import { ReactNode, ComponentProps } from 'react';
import '../../styles/glassmorphism.css';

export type GlassCardVariant = 'default' | 'gradient' | 'border-gradient' | 'strong';
export type GlassCardGradient = 'primary' | 'success' | 'warning' | 'info' | 'accent' | 'dark';

interface GlassCardProps extends Omit<ComponentProps<typeof motion.div>, 'children'> {
  children: ReactNode;
  variant?: GlassCardVariant;
  gradient?: GlassCardGradient;
  hover?: boolean;
  pulse?: boolean;
  float?: boolean;
  className?: string;
}

const gradientMap: Record<GlassCardGradient, string> = {
  primary: 'var(--gradient-primary)',
  success: 'var(--gradient-success)',
  warning: 'var(--gradient-warning)',
  info: 'var(--gradient-info)',
  accent: 'var(--gradient-accent)',
  dark: 'var(--gradient-dark)',
};

export function GlassCard({
  children,
  variant = 'default',
  gradient = 'primary',
  hover = true,
  pulse = false,
  float = false,
  className = '',
  ...motionProps
}: GlassCardProps) {
  const baseClasses = ['glass-card'];

  // Add variant classes
  if (variant === 'gradient') {
    baseClasses.push('glass-card-gradient');
  } else if (variant === 'border-gradient') {
    baseClasses.push('glass-card-border-gradient');
  } else if (variant === 'strong') {
    baseClasses.push('glass-card-strong');
  }

  // Add animation classes
  if (pulse) baseClasses.push('glass-pulse');
  if (float) baseClasses.push('glass-float');

  const combinedClassName = [...baseClasses, className].filter(Boolean).join(' ');

  // Default animation variants
  const defaultVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
    hover: hover
      ? {
          y: -4,
          transition: {
            duration: 0.2,
            ease: 'easeInOut',
          },
        }
      : {},
  };

  // Custom style for gradient variant
  const customStyle: React.CSSProperties = {};
  if (variant === 'gradient' || variant === 'border-gradient') {
    customStyle['--gradient-primary' as string] = gradientMap[gradient];
  }

  return (
    <motion.div
      className={combinedClassName}
      style={customStyle}
      variants={defaultVariants}
      initial="hidden"
      animate="visible"
      whileHover={hover ? 'hover' : undefined}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

/**
 * GlassCardHeader - Header section with optional gradient text
 */
interface GlassCardHeaderProps {
  children: ReactNode;
  gradient?: boolean;
  gradientType?: GlassCardGradient;
  className?: string;
}

export function GlassCardHeader({
  children,
  gradient = false,
  gradientType = 'primary',
  className = '',
}: GlassCardHeaderProps) {
  const gradientClass = gradient ? `text-gradient-${gradientType}` : '';
  return (
    <div className={`glass-card-header ${gradientClass} ${className}`}>
      {children}
    </div>
  );
}

/**
 * GlassCardBody - Body section with padding
 */
interface GlassCardBodyProps {
  children: ReactNode;
  className?: string;
}

export function GlassCardBody({ children, className = '' }: GlassCardBodyProps) {
  return <div className={`glass-card-body ${className}`}>{children}</div>;
}

/**
 * GlassCardFooter - Footer section
 */
interface GlassCardFooterProps {
  children: ReactNode;
  className?: string;
}

export function GlassCardFooter({ children, className = '' }: GlassCardFooterProps) {
  return <div className={`glass-card-footer ${className}`}>{children}</div>;
}
