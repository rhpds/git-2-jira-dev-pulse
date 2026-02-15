/**
 * Commit Activity Chart
 * Area chart showing commit activity by week within a quarter
 */

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CommitInfo } from "../../api/types";
import type { Quarter, Week } from "../../utils/quarterUtils";
import { getWeeksInQuarter } from "../../utils/quarterUtils";
import { GlassCard } from "../GlassCard/GlassCard";

interface CommitActivityChartProps {
  commits: CommitInfo[];
  quarter: Quarter;
  height?: number;
}

interface WeeklyData {
  week: string;
  weekNum: number;
  commits: number;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export function CommitActivityChart({
  commits,
  quarter,
  height = 280,
}: CommitActivityChartProps) {
  const weeks = getWeeksInQuarter(quarter);

  const weeklyData: WeeklyData[] = weeks.map((week: Week) => {
    const weekCommits = commits.filter((c) => {
      const d = new Date(c.date);
      return d >= week.start && d <= week.end;
    });
    return {
      week: `W${week.weekNum}`,
      weekNum: week.weekNum,
      commits: weekCommits.length,
      filesChanged: weekCommits.reduce((s, c) => s + c.files_changed, 0),
      insertions: weekCommits.reduce((s, c) => s + c.insertions, 0),
      deletions: weekCommits.reduce((s, c) => s + c.deletions, 0),
    };
  });

  const hasData = weeklyData.some((w) => w.commits > 0);

  if (!hasData) {
    return (
      <GlassCard>
        <p
          style={{
            color: "var(--pf-t--global--text--color--subtle)",
            textAlign: "center",
            padding: "2rem",
          }}
        >
          No commit activity in this quarter
        </p>
      </GlassCard>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <GlassCard variant="gradient" gradient="primary">
        <div style={{ marginBottom: "1rem" }}>
          <h3
            style={{
              color: "var(--pf-t--global--text--color--regular)",
              fontSize: "1.1rem",
              fontWeight: 600,
              marginBottom: "0.25rem",
            }}
          >
            Commit Activity
          </h3>
          <p
            style={{
              color: "var(--pf-t--global--text--color--subtle)",
              fontSize: "0.8rem",
            }}
          >
            Weekly commits across all analyzed repositories
          </p>
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={weeklyData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="commitsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#667eea" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#764ba2" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="filesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38ef7d" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#11998e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.08)"
            />
            <XAxis
              dataKey="week"
              tick={{ fill: "var(--pf-t--global--text--color--subtle)", fontSize: 11 }}
              stroke="rgba(255,255,255,0.15)"
            />
            <YAxis
              tick={{ fill: "var(--pf-t--global--text--color--subtle)", fontSize: 11 }}
              stroke="rgba(255,255,255,0.15)"
            />
            <Tooltip
              contentStyle={{
                background: "rgba(0, 0, 0, 0.85)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                color: "white",
                fontSize: "0.85rem",
              }}
            />
            <Area
              type="monotone"
              dataKey="commits"
              stroke="#667eea"
              strokeWidth={2}
              fill="url(#commitsFill)"
              name="Commits"
              animationDuration={1200}
            />
            <Area
              type="monotone"
              dataKey="filesChanged"
              stroke="#38ef7d"
              strokeWidth={1.5}
              fill="url(#filesFill)"
              name="Files Changed"
              animationDuration={1200}
              animationBegin={400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>
    </motion.div>
  );
}
