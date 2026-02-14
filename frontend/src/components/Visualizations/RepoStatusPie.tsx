/**
 * Repository Status Pie Chart
 * Shows distribution of clean vs dirty repositories
 */

import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { RepoInfo } from '../../api/types';
import { GlassCard } from '../GlassCard/GlassCard';

interface RepoStatusPieProps {
  repos: RepoInfo[];
  height?: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
  gradient: [string, string];
}

const STATUS_COLORS = {
  clean: {
    base: '#38ef7d',
    gradient: ['#11998e', '#38ef7d'],
  },
  dirty: {
    base: '#f5576c',
    gradient: ['#f093fb', '#f5576c'],
  },
};

export function RepoStatusPie({ repos, height = 300 }: RepoStatusPieProps) {
  // Calculate status distribution
  const cleanCount = repos.filter(r => r.status === 'clean').length;
  const dirtyCount = repos.filter(r => r.status === 'dirty').length;

  const data: StatusData[] = [
    {
      name: 'Clean',
      value: cleanCount,
      color: STATUS_COLORS.clean.base,
      gradient: STATUS_COLORS.clean.gradient,
    },
    {
      name: 'Has Changes',
      value: dirtyCount,
      color: STATUS_COLORS.dirty.base,
      gradient: STATUS_COLORS.dirty.gradient,
    },
  ].filter(item => item.value > 0);

  if (data.length === 0) {
    return (
      <GlassCard>
        <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '2rem' }}>
          No repository status data available
        </p>
      </GlassCard>
    );
  }

  const total = cleanCount + dirtyCount;
  const cleanPercentage = total > 0 ? Math.round((cleanCount / total) * 100) : 0;
  const dirtyPercentage = total > 0 ? Math.round((dirtyCount / total) * 100) : 0;

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    if (percent < 0.05) return null; // Don't show label for very small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '14px', fontWeight: 'bold' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <GlassCard variant="gradient" gradient="info">
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            📊 Repository Status
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
            Distribution of clean vs modified repositories
          </p>
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <defs>
              <linearGradient id="cleanGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={STATUS_COLORS.clean.gradient[0]} />
                <stop offset="100%" stopColor={STATUS_COLORS.clean.gradient[1]} />
              </linearGradient>
              <linearGradient id="dirtyGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={STATUS_COLORS.dirty.gradient[0]} />
                <stop offset="100%" stopColor={STATUS_COLORS.dirty.gradient[1]} />
              </linearGradient>
            </defs>

            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#${entry.name === 'Clean' ? 'clean' : 'dirty'}Gradient)`}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth={2}
                />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                color: 'white',
              }}
            />

            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ color: 'white' }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Status Summary Cards */}
        <div
          style={{
            marginTop: '1rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
          }}
        >
          {/* Clean Status */}
          <div
            style={{
              background: 'rgba(56, 239, 125, 0.1)',
              border: '1px solid rgba(56, 239, 125, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center',
            }}
          >
            <div style={{ color: STATUS_COLORS.clean.base, fontSize: '2rem', fontWeight: 'bold' }}>
              {cleanCount}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Clean Repos
            </div>
            <div style={{ color: STATUS_COLORS.clean.base, fontSize: '1.25rem', marginTop: '0.5rem' }}>
              {cleanPercentage}%
            </div>
          </div>

          {/* Dirty Status */}
          <div
            style={{
              background: 'rgba(245, 87, 108, 0.1)',
              border: '1px solid rgba(245, 87, 108, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center',
            }}
          >
            <div style={{ color: STATUS_COLORS.dirty.base, fontSize: '2rem', fontWeight: 'bold' }}>
              {dirtyCount}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Has Changes
            </div>
            <div style={{ color: STATUS_COLORS.dirty.base, fontSize: '1.25rem', marginTop: '0.5rem' }}>
              {dirtyPercentage}%
            </div>
          </div>
        </div>

        {/* Total Count */}
        <div
          style={{
            marginTop: '1rem',
            textAlign: 'center',
            padding: '0.75rem',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
            Total Repositories:{' '}
          </span>
          <span style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>
            {total}
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
}
