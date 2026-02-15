/**
 * PR Status Distribution Chart
 * Donut chart showing pull request state distribution
 */

import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { PullRequestInfo } from "../../api/types";
import { GlassCard } from "../GlassCard/GlassCard";

interface PRStatusChartProps {
  pullRequests: PullRequestInfo[];
  height?: number;
}

const PR_COLORS: Record<string, { base: string; gradient: [string, string] }> = {
  open: { base: "#38ef7d", gradient: ["#11998e", "#38ef7d"] },
  merged: { base: "#667eea", gradient: ["#667eea", "#764ba2"] },
  closed: { base: "#f5576c", gradient: ["#f093fb", "#f5576c"] },
};

export function PRStatusChart({ pullRequests, height = 240 }: PRStatusChartProps) {
  const stateCounts = pullRequests.reduce<Record<string, number>>((acc, pr) => {
    const state = pr.state?.toLowerCase() || "unknown";
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(stateCounts)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: PR_COLORS[name]?.base || "#888",
    }))
    .filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <GlassCard>
        <p
          style={{
            color: "var(--pf-t--global--text--color--subtle)",
            textAlign: "center",
            padding: "2rem",
          }}
        >
          No pull requests in this quarter
        </p>
      </GlassCard>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <GlassCard variant="gradient" gradient="info">
        <div style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              color: "var(--pf-t--global--text--color--regular)",
              fontSize: "1.1rem",
              fontWeight: 600,
              marginBottom: "0.25rem",
            }}
          >
            Pull Requests
          </h3>
          <p
            style={{
              color: "var(--pf-t--global--text--color--subtle)",
              fontSize: "0.8rem",
            }}
          >
            Status distribution across all repos
          </p>
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <defs>
              {Object.entries(PR_COLORS).map(([key, { gradient }]) => (
                <linearGradient
                  key={key}
                  id={`pr-${key}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor={gradient[0]} />
                  <stop offset="100%" stopColor={gradient[1]} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              dataKey="value"
              animationDuration={1000}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={{ stroke: "var(--pf-t--global--text--color--subtle)" }}
            >
              {data.map((entry, i) => {
                const key = entry.name.toLowerCase();
                const fill = PR_COLORS[key]
                  ? `url(#pr-${key})`
                  : entry.color;
                return (
                  <Cell
                    key={`cell-${i}`}
                    fill={fill}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth={2}
                  />
                );
              })}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgba(0,0,0,0.85)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                color: "white",
                fontSize: "0.85rem",
              }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: "0.85rem" }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Total count */}
        <div
          style={{
            textAlign: "center",
            padding: "0.5rem",
            marginTop: "0.25rem",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "8px",
          }}
        >
          <span style={{ color: "var(--pf-t--global--text--color--subtle)", fontSize: "0.8rem" }}>
            Total PRs:{" "}
          </span>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>
            {pullRequests.length}
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
}
