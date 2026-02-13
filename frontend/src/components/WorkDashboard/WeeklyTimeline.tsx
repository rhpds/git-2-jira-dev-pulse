import { useState } from "react";
import type { CommitInfo } from "../../api/types";
import type { Quarter, Week } from "../../utils/quarterUtils";
import { getWeeksInQuarter, filterByDateRange, groupByWeek } from "../../utils/quarterUtils";

interface WeeklyTimelineProps {
  commits: CommitInfo[];
  quarter: Quarter;
  selectedWeek: number | null;
}

export default function WeeklyTimeline({ commits, quarter, selectedWeek }: WeeklyTimelineProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const weeks = getWeeksInQuarter(quarter);
  const grouped = groupByWeek(
    commits,
    (c) => new Date(c.date),
    quarter
  );

  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) next.delete(weekNum);
      else next.add(weekNum);
      return next;
    });
  };

  const visibleWeeks = selectedWeek
    ? weeks.filter((w) => w.weekNum === selectedWeek)
    : weeks;

  // Only show weeks that have commits, sorted most recent first
  const weeksWithData = visibleWeeks
    .filter((w) => (grouped.get(w.weekNum)?.length ?? 0) > 0)
    .reverse();

  if (weeksWithData.length === 0) {
    return (
      <div style={{ padding: 16, color: "var(--pf-t--global--text--color--subtle)" }}>
        No commits in this period.
      </div>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "2px solid var(--pf-t--global--border--color--default)" }}>
          <th style={{ padding: "6px 8px", width: 24 }}></th>
          <th style={{ padding: "6px 8px" }}>Week</th>
          <th style={{ padding: "6px 8px" }}>Commits</th>
          <th style={{ padding: "6px 8px" }}>Files</th>
          <th style={{ padding: "6px 8px" }}>Changes</th>
        </tr>
      </thead>
      <tbody>
        {weeksWithData.map((week) => {
          const weekCommits = grouped.get(week.weekNum) || [];
          const totalFiles = weekCommits.reduce((s, c) => s + c.files_changed, 0);
          const totalAdd = weekCommits.reduce((s, c) => s + c.insertions, 0);
          const totalDel = weekCommits.reduce((s, c) => s + c.deletions, 0);
          const isExpanded = expandedWeeks.has(week.weekNum);

          return (
            <WeekRow
              key={week.weekNum}
              week={week}
              commits={weekCommits}
              totalFiles={totalFiles}
              totalAdd={totalAdd}
              totalDel={totalDel}
              isExpanded={isExpanded}
              onToggle={() => toggleWeek(week.weekNum)}
            />
          );
        })}
      </tbody>
    </table>
  );
}

function WeekRow({
  week,
  commits,
  totalFiles,
  totalAdd,
  totalDel,
  isExpanded,
  onToggle,
}: {
  week: Week;
  commits: CommitInfo[];
  totalFiles: number;
  totalAdd: number;
  totalDel: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          cursor: "pointer",
          borderBottom: "1px solid var(--pf-t--global--border--color--default)",
          background: isExpanded ? "var(--pf-t--global--background--color--secondary--default)" : undefined,
        }}
      >
        <td style={{ padding: "6px 8px" }}>{isExpanded ? "▼" : "▶"}</td>
        <td style={{ padding: "6px 8px", fontWeight: 600 }}>{week.label}</td>
        <td style={{ padding: "6px 8px" }}>{commits.length} commits</td>
        <td style={{ padding: "6px 8px" }}>{totalFiles} files</td>
        <td style={{ padding: "6px 8px" }}>
          <span style={{ color: "green" }}>+{totalAdd}</span>{" "}
          <span style={{ color: "red" }}>−{totalDel}</span>
        </td>
      </tr>
      {isExpanded &&
        commits.map((c) => (
          <tr
            key={c.sha}
            style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)", fontSize: "0.9em" }}
          >
            <td></td>
            <td style={{ padding: "4px 8px" }}>
              <code style={{ fontSize: "0.85em" }}>{c.short_sha}</code>
            </td>
            <td style={{ padding: "4px 8px" }} colSpan={2}>
              {c.message.split("\n")[0].slice(0, 80)}
            </td>
            <td style={{ padding: "4px 8px", color: "var(--pf-t--global--text--color--subtle)" }}>
              {new Date(c.date).toLocaleDateString()}
            </td>
          </tr>
        ))}
    </>
  );
}
