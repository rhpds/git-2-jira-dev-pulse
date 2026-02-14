import { useState } from "react";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  ExpandableRowContent,
} from "@patternfly/react-table";
import { EmptyState, EmptyStateBody } from "@patternfly/react-core";
import type { CommitInfo } from "../../api/types";
import type { Quarter, Week } from "../../utils/quarterUtils";
import { getWeeksInQuarter, groupByWeek } from "../../utils/quarterUtils";

interface WeeklyTimelineProps {
  commits: CommitInfo[];
  quarter: Quarter;
  selectedWeek: number | null;
}

export default function WeeklyTimeline({
  commits,
  quarter,
  selectedWeek,
}: WeeklyTimelineProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const weeks = getWeeksInQuarter(quarter);
  const grouped = groupByWeek(commits, (c) => new Date(c.date), quarter);

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
      <EmptyState>
        <EmptyStateBody>No commits in this period.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Table aria-label="Weekly timeline" variant="compact" isStickyHeader>
      <Thead>
        <Tr>
          <Th width={10} />
          <Th>Week</Th>
          <Th>Commits</Th>
          <Th>Files</Th>
          <Th>Changes</Th>
        </Tr>
      </Thead>
      <Tbody>
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
      </Tbody>
    </Table>
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
      <Tr isClickable onClick={onToggle}>
        <Td expand={{ isExpanded, onToggle }} />
        <Td dataLabel="Week" modifier="fitContent">
          <strong>{week.label}</strong>
        </Td>
        <Td dataLabel="Commits">{commits.length} commits</Td>
        <Td dataLabel="Files">{totalFiles} files</Td>
        <Td dataLabel="Changes">
          <span style={{ color: "var(--pf-t--global--text--color--status--success--default)" }}>
            +{totalAdd}
          </span>{" "}
          <span style={{ color: "var(--pf-t--global--text--color--status--danger--default)" }}>
            −{totalDel}
          </span>
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td colSpan={5}>
          <ExpandableRowContent>
            <Table variant="compact" borders={false}>
              <Tbody>
                {commits.map((c) => (
                  <Tr key={c.sha}>
                    <Td width={15}>
                      <code style={{ fontSize: "var(--pf-t--global--font--size--sm)" }}>
                        {c.short_sha}
                      </code>
                    </Td>
                    <Td>{c.message.split("\n")[0].slice(0, 80)}</Td>
                    <Td modifier="fitContent">
                      {new Date(c.date).toLocaleDateString()}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ExpandableRowContent>
        </Td>
      </Tr>
    </>
  );
}
