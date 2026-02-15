/**
 * Jira Coverage Gauge
 * Radial bar showing percentage of work tracked in Jira
 */

import { motion } from "framer-motion";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";
import { GlassCard } from "../GlassCard/GlassCard";

interface JiraCoverageGaugeProps {
  trackedCount: number;
  totalCount: number;
  height?: number;
}

export function JiraCoverageGauge({
  trackedCount,
  totalCount,
  height = 240,
}: JiraCoverageGaugeProps) {
  const percentage = totalCount > 0 ? Math.round((trackedCount / totalCount) * 100) : 0;
  const untrackedCount = Math.max(0, totalCount - trackedCount);

  const getColor = (pct: number) => {
    if (pct >= 80) return { base: "#38ef7d", label: "Excellent" };
    if (pct >= 60) return { base: "#667eea", label: "Good" };
    if (pct >= 40) return { base: "#ffc107", label: "Fair" };
    return { base: "#f5576c", label: "Needs Attention" };
  };

  const colorInfo = getColor(percentage);

  const data = [
    {
      name: "Coverage",
      value: percentage,
      fill: colorInfo.base,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <GlassCard variant="gradient" gradient="success">
        <div style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              color: "var(--pf-t--global--text--color--regular)",
              fontSize: "1.1rem",
              fontWeight: 600,
              marginBottom: "0.25rem",
            }}
          >
            Jira Coverage
          </h3>
          <p
            style={{
              color: "var(--pf-t--global--text--color--subtle)",
              fontSize: "0.8rem",
            }}
          >
            Repos with commits linked to Jira tickets
          </p>
        </div>

        <div style={{ position: "relative" }}>
          <ResponsiveContainer width="100%" height={height}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="90%"
              barSize={16}
              data={data}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                dataKey="value"
                cornerRadius={10}
                animationDuration={1200}
                background={{ fill: "rgba(255,255,255,0.08)" }}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -60%)",
              textAlign: "center",
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              style={{
                fontSize: "2.5rem",
                fontWeight: 800,
                color: colorInfo.base,
                lineHeight: 1,
              }}
            >
              {percentage}%
            </motion.div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--pf-t--global--text--color--subtle)",
                marginTop: "0.25rem",
              }}
            >
              {colorInfo.label}
            </div>
          </div>
        </div>

        {/* Summary row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
            marginTop: "0.5rem",
          }}
        >
          <div
            style={{
              background: "rgba(56, 239, 125, 0.08)",
              border: "1px solid rgba(56, 239, 125, 0.2)",
              borderRadius: "10px",
              padding: "0.75rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#38ef7d" }}>
              {trackedCount}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--pf-t--global--text--color--subtle)" }}>
              Tracked
            </div>
          </div>
          <div
            style={{
              background: "rgba(245, 87, 108, 0.08)",
              border: "1px solid rgba(245, 87, 108, 0.2)",
              borderRadius: "10px",
              padding: "0.75rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f5576c" }}>
              {untrackedCount}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--pf-t--global--text--color--subtle)" }}>
              Untracked
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
