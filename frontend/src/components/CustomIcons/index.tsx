/**
 * Custom Icons
 * Abstract, modern SVG icons with animations
 * NO traditional folder or git icons - these are unique to our app
 */

import { motion } from 'framer-motion';
import { ComponentProps } from 'react';

interface IconProps extends Omit<ComponentProps<typeof motion.svg>, 'children'> {
  size?: number;
  color?: string;
  animate?: boolean;
}

/**
 * PulseIcon - Represents activity and heartbeat of a repository
 */
export function PulseIcon({ size = 24, color = 'currentColor', animate = true, ...props }: IconProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={animate ? { scale: 0.8, opacity: 0 } : {}}
      animate={animate ? { scale: 1, opacity: 1 } : {}}
      transition={{ duration: 0.3 }}
      {...props}
    >
      <motion.path
        d="M3 12h4l3-9 4 18 3-9h4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0 } : {}}
        animate={animate ? { pathLength: 1 } : {}}
        transition={{ duration: 1, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="12"
        cy="12"
        r="2"
        fill={color}
        initial={animate ? { scale: 0 } : {}}
        animate={animate ? { scale: [0, 1.2, 1] } : {}}
        transition={{ duration: 0.5, delay: 0.5 }}
      />
    </motion.svg>
  );
}

/**
 * CodeFlowIcon - Represents code flow and branching
 */
export function CodeFlowIcon({ size = 24, color = 'currentColor', animate = true, ...props }: IconProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={animate ? { rotate: -10 } : {}}
      animate={animate ? { rotate: 0 } : {}}
      transition={{ duration: 0.5 }}
      {...props}
    >
      <motion.circle
        cx="5"
        cy="5"
        r="2"
        fill={color}
        initial={animate ? { scale: 0 } : {}}
        animate={animate ? { scale: 1 } : {}}
        transition={{ delay: 0.1 }}
      />
      <motion.circle
        cx="19"
        cy="5"
        r="2"
        fill={color}
        initial={animate ? { scale: 0 } : {}}
        animate={animate ? { scale: 1 } : {}}
        transition={{ delay: 0.2 }}
      />
      <motion.circle
        cx="5"
        cy="19"
        r="2"
        fill={color}
        initial={animate ? { scale: 0 } : {}}
        animate={animate ? { scale: 1 } : {}}
        transition={{ delay: 0.3 }}
      />
      <motion.circle
        cx="19"
        cy="19"
        r="2"
        fill={color}
        initial={animate ? { scale: 0 } : {}}
        animate={animate ? { scale: 1 } : {}}
        transition={{ delay: 0.4 }}
      />
      <motion.path
        d="M5 7v10M19 7v10M7 5h10M7 19h10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        initial={animate ? { pathLength: 0, opacity: 0 } : {}}
        animate={animate ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
    </motion.svg>
  );
}

/**
 * ActivityBurstIcon - Represents bursts of activity
 */
export function ActivityBurstIcon({ size = 24, color = 'currentColor', animate = true, ...props }: IconProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="3"
        fill={color}
        animate={animate ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.g
        animate={animate ? { rotate: 360 } : {}}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '12px 12px' }}
      >
        <circle cx="12" cy="4" r="1.5" fill={color} opacity="0.7" />
        <circle cx="18" cy="6" r="1.5" fill={color} opacity="0.6" />
        <circle cx="20" cy="12" r="1.5" fill={color} opacity="0.5" />
        <circle cx="18" cy="18" r="1.5" fill={color} opacity="0.4" />
        <circle cx="12" cy="20" r="1.5" fill={color} opacity="0.3" />
        <circle cx="6" cy="18" r="1.5" fill={color} opacity="0.4" />
        <circle cx="4" cy="12" r="1.5" fill={color} opacity="0.5" />
        <circle cx="6" cy="6" r="1.5" fill={color} opacity="0.6" />
      </motion.g>
    </motion.svg>
  );
}

/**
 * RepoIdentityIcon - Unique identity marker for repositories
 */
export function RepoIdentityIcon({ size = 24, color = 'currentColor', animate = true, ...props }: IconProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={animate ? { opacity: 0 } : {}}
      animate={animate ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
      {...props}
    >
      <motion.rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4"
        stroke={color}
        strokeWidth="2"
        fill="none"
        initial={animate ? { scale: 0, rotate: -45 } : {}}
        animate={animate ? { scale: 1, rotate: 0 } : {}}
        transition={{ duration: 0.6, type: 'spring' }}
      />
      <motion.path
        d="M8 12h8M12 8v8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        initial={animate ? { pathLength: 0 } : {}}
        animate={animate ? { pathLength: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
      <motion.circle
        cx="12"
        cy="12"
        r="1.5"
        fill={color}
        initial={animate ? { scale: 0 } : {}}
        animate={animate ? { scale: 1 } : {}}
        transition={{ delay: 0.6 }}
      />
    </motion.svg>
  );
}

/**
 * DataFlowIcon - Represents data and commit flow
 */
export function DataFlowIcon({ size = 24, color = 'currentColor', animate = true, ...props }: IconProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <motion.path
        d="M4 6 L20 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        animate={animate ? { x: [0, 2, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.path
        d="M4 12 L20 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        animate={animate ? { x: [0, -2, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
      />
      <motion.path
        d="M4 18 L20 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        animate={animate ? { x: [0, 2, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
      />
      <motion.circle
        cx="20"
        cy="6"
        r="2"
        fill={color}
        animate={animate ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle
        cx="20"
        cy="12"
        r="2"
        fill={color}
        animate={animate ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
      />
      <motion.circle
        cx="20"
        cy="18"
        r="2"
        fill={color}
        animate={animate ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
      />
    </motion.svg>
  );
}

/**
 * NetworkIcon - Represents connected repositories
 */
export function NetworkIcon({ size = 24, color = 'currentColor', animate = true, ...props }: IconProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Connection lines */}
      <motion.line
        x1="12"
        y1="5"
        x2="6"
        y2="15"
        stroke={color}
        strokeWidth="1.5"
        initial={animate ? { pathLength: 0, opacity: 0 } : {}}
        animate={animate ? { pathLength: 1, opacity: 0.5 } : {}}
        transition={{ duration: 0.8 }}
      />
      <motion.line
        x1="12"
        y1="5"
        x2="18"
        y2="15"
        stroke={color}
        strokeWidth="1.5"
        initial={animate ? { pathLength: 0, opacity: 0 } : {}}
        animate={animate ? { pathLength: 1, opacity: 0.5 } : {}}
        transition={{ duration: 0.8, delay: 0.1 }}
      />
      <motion.line
        x1="6"
        y1="15"
        x2="18"
        y2="15"
        stroke={color}
        strokeWidth="1.5"
        initial={animate ? { pathLength: 0, opacity: 0 } : {}}
        animate={animate ? { pathLength: 1, opacity: 0.5 } : {}}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
      {/* Nodes */}
      <motion.circle
        cx="12"
        cy="5"
        r="2.5"
        fill={color}
        initial={animate ? { scale: 0 } : {}}
        animate={animate ? { scale: 1 } : {}}
        transition={{ delay: 0.3 }}
      />
      <motion.circle
        cx="6"
        cy="15"
        r="2.5"
        fill={color}
        initial={animate ? { scale: 0 } : {}}
        animate={animate ? { scale: 1 } : {}}
        transition={{ delay: 0.4 }}
      />
      <motion.circle
        cx="18"
        cy="15"
        r="2.5"
        fill={color}
        initial={animate ? { scale: 0 } : {}}
        animate={animate ? { scale: 1 } : {}}
        transition={{ delay: 0.5 }}
      />
    </motion.svg>
  );
}

/**
 * StatusIcon - Repository status indicator
 */
interface StatusIconProps extends IconProps {
  status: 'clean' | 'dirty' | 'active';
}

export function StatusIcon({ status, size = 24, animate = true, ...props }: StatusIconProps) {
  const colorMap = {
    clean: '#38ef7d',
    dirty: '#f5576c',
    active: '#4facfe',
  };

  const color = colorMap[status];

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="8"
        stroke={color}
        strokeWidth="2"
        fill="none"
        initial={animate ? { scale: 0, rotate: -180 } : {}}
        animate={animate ? { scale: 1, rotate: 0 } : {}}
        transition={{ duration: 0.5, type: 'spring' }}
      />
      {status === 'clean' && (
        <motion.path
          d="M8 12l2 2 4-4"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animate ? { pathLength: 0 } : {}}
          animate={animate ? { pathLength: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
        />
      )}
      {status === 'dirty' && (
        <>
          <motion.line
            x1="9"
            y1="9"
            x2="15"
            y2="15"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            initial={animate ? { pathLength: 0 } : {}}
            animate={animate ? { pathLength: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.3 }}
          />
          <motion.line
            x1="15"
            y1="9"
            x2="9"
            y2="15"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            initial={animate ? { pathLength: 0 } : {}}
            animate={animate ? { pathLength: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.4 }}
          />
        </>
      )}
      {status === 'active' && (
        <motion.circle
          cx="12"
          cy="12"
          r="3"
          fill={color}
          initial={animate ? { scale: 0 } : {}}
          animate={animate ? { scale: [0, 1.2, 1] } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
        />
      )}
    </motion.svg>
  );
}
