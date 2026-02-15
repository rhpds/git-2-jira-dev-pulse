import { Grid, GridItem } from "@patternfly/react-core";
import { motion } from "framer-motion";
import { GlassCard } from "../GlassCard/GlassCard";
import type { GlassCardGradient } from "../GlassCard/GlassCard";

interface QuarterSummaryBarProps {
  repoCount: number;
  commitCount: number;
  prCount: number;
  trackedCount: number;
  needTicketsCount: number;
}

interface StatDef {
  value: number;
  label: string;
  gradient: GlassCardGradient;
  icon: string;
  color: string;
}

function AnimatedStat({
  value,
  label,
  gradient,
  icon,
  color,
  delay,
}: StatDef & { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      <GlassCard variant="gradient" gradient={gradient} enableHover>
        <div style={{ textAlign: "center", padding: "0.5rem 0.25rem" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{icon}</div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.2, type: "spring", stiffness: 180, damping: 12 }}
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color,
              lineHeight: 1.1,
            }}
          >
            {value}
          </motion.div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--pf-t--global--text--color--subtle)",
              marginTop: "0.25rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight: 500,
            }}
          >
            {label}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function QuarterSummaryBar({
  repoCount,
  commitCount,
  prCount,
  trackedCount,
  needTicketsCount,
}: QuarterSummaryBarProps) {
  const stats: StatDef[] = [
    {
      value: repoCount,
      label: "Repos Analyzed",
      gradient: "primary",
      icon: "\u{1F4C2}",
      color: "#667eea",
    },
    {
      value: commitCount,
      label: "Commits",
      gradient: "info",
      icon: "\u{1F4DD}",
      color: "#36d1dc",
    },
    {
      value: prCount,
      label: "Pull Requests",
      gradient: "accent",
      icon: "\u{1F500}",
      color: "#f093fb",
    },
    {
      value: trackedCount,
      label: "Tracked in Jira",
      gradient: "success",
      icon: "\u{2705}",
      color: "#38ef7d",
    },
    {
      value: needTicketsCount,
      label: "Need Tickets",
      gradient: "warning",
      icon: "\u{26A0}\u{FE0F}",
      color: "#ffc107",
    },
  ];

  return (
    <Grid hasGutter style={{ marginBottom: 16 }}>
      {stats.map((stat, i) => (
        <GridItem key={stat.label} span={2} lg={2} md={4} sm={6}>
          <AnimatedStat {...stat} delay={i * 0.08} />
        </GridItem>
      ))}
    </Grid>
  );
}
