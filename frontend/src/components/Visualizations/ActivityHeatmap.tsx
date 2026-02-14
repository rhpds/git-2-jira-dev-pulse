/**
 * Activity Heatmap
 * Bar chart showing top 10 most active repositories
 * Stacked bars: commits vs uncommitted changes
 */

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { RepoInfo } from '../../api/types';
import { GlassCard } from '../GlassCard/GlassCard';

interface ActivityHeatmapProps {
  repos: RepoInfo[];
  maxRepos?: number;
  height?: number;
}

interface ChartData {
  name: string;
  commits: number;
  uncommitted: number;
  total: number;
}

const GRADIENT_COLORS = {
  commits: ['#667eea', '#764ba2'],
  uncommitted: ['#f093fb', '#f5576c'],
};

export function ActivityHeatmap({ repos, maxRepos = 10, height = 300 }: ActivityHeatmapProps) {
  // Calculate activity scores and sort
  const chartData: ChartData[] = repos
    .map(repo => ({
      name: repo.name,
      commits: repo.recent_commit_count,
      uncommitted: repo.uncommitted_count,
      total: repo.recent_commit_count + repo.uncommitted_count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, maxRepos);

  if (chartData.length === 0) {
    return (
      <GlassCard>
        <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '2rem' }}>
          No repository activity data available
        </p>
      </GlassCard>
    );
  }

  const maxValue = Math.max(...chartData.map(d => d.total));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <GlassCard variant="gradient" gradient="primary">
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            🔥 Most Active Repositories
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
            Top {chartData.length} repos by commits and uncommitted changes
          </p>
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <defs>
              <linearGradient id="commitsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GRADIENT_COLORS.commits[0]} stopOpacity={0.9} />
                <stop offset="100%" stopColor={GRADIENT_COLORS.commits[1]} stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="uncommittedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GRADIENT_COLORS.uncommitted[0]} stopOpacity={0.9} />
                <stop offset="100%" stopColor={GRADIENT_COLORS.uncommitted[1]} stopOpacity={0.7} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />

            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 12 }}
              stroke="rgba(255,255,255,0.3)"
            />

            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 12 }}
              stroke="rgba(255,255,255,0.3)"
              label={{
                value: 'Activity Count',
                angle: -90,
                position: 'insideLeft',
                fill: 'rgba(255,255,255,0.8)',
              }}
            />

            <Tooltip
              contentStyle={{
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                color: 'white',
              }}
              cursor={{ fill: 'rgba(255,255,255,0.1)' }}
            />

            <Legend
              wrapperStyle={{
                color: 'white',
              }}
              iconType="circle"
            />

            <Bar
              dataKey="commits"
              stackId="a"
              fill="url(#commitsGradient)"
              name="Commits"
              radius={[0, 0, 0, 0]}
              animationDuration={1000}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-commits-${index}`}
                  fill="url(#commitsGradient)"
                />
              ))}
            </Bar>

            <Bar
              dataKey="uncommitted"
              stackId="a"
              fill="url(#uncommittedGradient)"
              name="Uncommitted"
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
              animationBegin={500}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-uncommitted-${index}`}
                  fill="url(#uncommittedGradient)"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Activity Summary */}
        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: GRADIENT_COLORS.commits[0], fontSize: '1.5rem', fontWeight: 'bold' }}>
              {chartData.reduce((sum, d) => sum + d.commits, 0)}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
              Total Commits
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: GRADIENT_COLORS.uncommitted[0], fontSize: '1.5rem', fontWeight: 'bold' }}>
              {chartData.reduce((sum, d) => sum + d.uncommitted, 0)}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
              Total Uncommitted
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {chartData.reduce((sum, d) => sum + d.total, 0)}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
              Total Activity
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
