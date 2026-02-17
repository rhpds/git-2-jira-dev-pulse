import { Card, CardBody, Grid, GridItem } from "@patternfly/react-core";

interface QuarterSummaryBarProps {
  repoCount: number;
  commitCount: number;
  prCount: number;
  trackedCount: number;
  needTicketsCount: number;
  onCreateTickets?: () => void;
}

function StatCard({
  value,
  label,
  onClick,
  highlight,
}: {
  value: number;
  label: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  return (
    <Card
      isCompact
      isClickable={!!onClick}
      isSelectable={!!onClick}
      onClick={onClick}
      style={highlight && value > 0 ? { borderColor: "var(--pf-t--global--color--status--warning--default)", borderWidth: 2 } : undefined}
    >
      <CardBody style={{ textAlign: "center", padding: "12px 8px", cursor: onClick ? "pointer" : undefined }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{value}</div>
        <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>
          {label}
          {onClick && value > 0 && (
            <div style={{ fontSize: "0.7rem", marginTop: 2, color: "var(--pf-t--global--color--brand--default)" }}>
              Click to create
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default function QuarterSummaryBar({
  repoCount,
  commitCount,
  prCount,
  trackedCount,
  needTicketsCount,
  onCreateTickets,
}: QuarterSummaryBarProps) {
  return (
    <Grid hasGutter style={{ marginBottom: 16 }}>
      <GridItem span={2}>
        <StatCard value={repoCount} label="repos analyzed" />
      </GridItem>
      <GridItem span={2}>
        <StatCard value={commitCount} label="commits" />
      </GridItem>
      <GridItem span={2}>
        <StatCard value={prCount} label="PRs" />
      </GridItem>
      <GridItem span={3}>
        <StatCard value={trackedCount} label="tracked in Jira" />
      </GridItem>
      <GridItem span={3}>
        <StatCard
          value={needTicketsCount}
          label="need tickets"
          onClick={onCreateTickets}
          highlight
        />
      </GridItem>
    </Grid>
  );
}
