/**
 * Weekly Breakdown Chart
 * Stacked bar chart showing commits, PRs, and code changes by week
 */

import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { WorkSummary } from "../../api/types";
import type { Quarter, Week } from "../../utils/quarterUtils";
import { getWeeksInQuarter } from "../../utils/quarterUtils";
import { GlassCard } from "../GlassCard/GlassCard";

interface WeeklyBreakdownChartProps {
  summaries: WorkSummary[];
  quarter: Quarter;
  height?: number;
}

interface WeekData {
  week: string;
  weekNum: number;
  commits: number;
  pullRequests: number;
  insertions: number;
  deletions: number;
}

export function WeeklyBreakdownChart({
  summaries,
  quarter,
  height = 280,
}: WeeklyBreakdownChartProps) {
  const weeks = getWeeksInQuarter(quarter);

  const allCommits = summaries.flatMap((s) => s.recent_commits);
  const allPRs = summaries.flatMap((s) => s.pull_requests);

  const weeklyData: WeekData[] = weeks.map((week: Week) => {
    const weekCommits = allCommits.filter((c) => {
      const d = new Date(c.date);
      return d >= week.start && d <= week.end;
    });
    const weekPRs = allPRs.filter((pr) => {
      if (!pr.created_at) return false;
      const d = new Date(pr.created_at);
      return d >= week.start && d <= week.end;
    });

    return {
      week: `W${week.weekNum}`,
      weekNum: week.weekNum,
      commits: weekCommits.length,
      pullRequests: weekPRs.length,
      insertions: weekCommits.reduce((s, c) => s + c.insertions, 0),
      deletions: weekCommits.reduce((s, c) => s + c.deletions, 0),
    };
  });

  const hasData = weeklyData.some(
    (w) => w.commits > 0 || w.pullRequests > 0
  );

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
          No activity data for this quarter
        </p>
      </GlassCard>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
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
            Weekly Breakdown
          </h3>
          <p
            style={{
              color: "var(--pf-t--global--text--color--subtle)",
              fontSize: "0.8rem",
            }}
          >
            Commits and PRs by week
          </p>
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={weeklyData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="wbCommits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#667eea" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#764ba2" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="wbPRs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38ef7d" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#11998e" stopOpacity={0.7} />
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
                background: "rgba(0,0,0,0.85)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                color: "white",
                fontSize: "0.85rem",
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: "0.85rem" }} />
            <Bar
              dataKey="commits"
              fill="url(#wbCommits)"
              name="Commits"
              radius={[2, 2, 0, 0]}
              animationDuration={1000}
            />
            <Bar
              dataKey="pullRequests"
              fill="url(#wbPRs)"
              name="Pull Requests"
              radius={[2, 2, 0, 0]}
              animationDuration={1000}
              animationBegin={400}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Code change summary */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "2rem",
            marginTop: "0.75rem",
            padding: "0.5rem",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "8px",
            fontSize: "0.85rem",
          }}
        >
          <span>
            <span
              style={{
                color: "var(--pf-t--global--text--color--status--success--default)",
                fontWeight: 600,
              }}
            >
              +{weeklyData.reduce((s, w) => s + w.insertions, 0).toLocaleString()}
            </span>{" "}
            <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>
              insertions
            </span>
          </span>
          <span>
            <span
              style={{
                color: "var(--pf-t--global--text--color--status--danger--default)",
                fontWeight: 600,
              }}
            >
              -{weeklyData.reduce((s, w) => s + w.deletions, 0).toLocaleString()}
            </span>{" "}
            <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>
              deletions
            </span>
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
}
