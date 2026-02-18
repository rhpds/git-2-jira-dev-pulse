/**
 * Ticket Preview Panel
 * Shows a preview of what Jira tickets will look like before creation.
 * Displayed at the bottom of the Work Dashboard.
 */

import { useState } from "react";
import {
  Card,
  CardBody,
  CardTitle,
  CardExpandableContent,
  CardHeader,
  Label,
  Badge,
  Button,
  ExpandableSection,
  Spinner,
  Divider,
  Truncate,
} from "@patternfly/react-core";
import {
  AngleDownIcon,
  AngleRightIcon,
  ExternalLinkAltIcon,
} from "@patternfly/react-icons";
import type { TicketSuggestion, WorkSummary } from "../../api/types";

interface TicketPreviewPanelProps {
  summaries: WorkSummary[];
  suggestions: TicketSuggestion[];
  isLoading: boolean;
  projectKey: string;
  projectName?: string;
  jiraUrl?: string;
  onOpenDrawer: () => void;
}

const PRIORITY_COLORS: Record<string, "red" | "orange" | "blue" | "grey" | "cyan"> = {
  Blocker: "red",
  Critical: "red",
  Major: "orange",
  Normal: "blue",
  Minor: "grey",
};

const TYPE_COLORS: Record<string, "green" | "blue" | "red" | "purple"> = {
  Story: "green",
  Task: "blue",
  Bug: "red",
  Epic: "purple",
};

export default function TicketPreviewPanel({
  summaries,
  suggestions,
  isLoading,
  projectKey,
  projectName,
  jiraUrl,
  onOpenDrawer,
}: TicketPreviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());

  const toggleTicket = (id: string) => {
    setExpandedTickets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Count repos that need tickets (active repos without Jira refs)
  const activeRepos = summaries.filter(
    (s) => s.recent_commits.length > 0 || s.pull_requests.length > 0
  );
  const untrackedRepos = activeRepos.filter(
    (s) => !s.recent_commits.some((c) => c.jira_refs.length > 0)
  );

  const selectedCount = suggestions.filter((s) => s.selected).length;
  const trackedCount = suggestions.filter((s) => s.already_tracked).length;
  const newCount = suggestions.filter((s) => !s.already_tracked).length;

  return (
    <Card isExpanded={isExpanded} style={{ marginTop: 24 }}>
      <CardHeader
        onExpand={() => setIsExpanded(!isExpanded)}
        toggleButtonProps={{ "aria-label": "Toggle ticket preview" }}
      >
        <CardTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>
              Ticket Preview
            </span>
            {projectKey && (
              <Label color="blue" isCompact>
                {projectName || projectKey}
              </Label>
            )}
            {suggestions.length > 0 && (
              <>
                <Badge isRead>{suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}</Badge>
                {newCount > 0 && (
                  <Badge>{newCount} new</Badge>
                )}
                {trackedCount > 0 && (
                  <Label color="orange" isCompact>
                    {trackedCount} already tracked
                  </Label>
                )}
              </>
            )}
            {isLoading && <Spinner size="md" aria-label="Loading previews..." />}
          </div>
        </CardTitle>
      </CardHeader>
      <CardExpandableContent>
        <CardBody>
          {isLoading && suggestions.length === 0 && (
            <div style={{ textAlign: "center", padding: 24 }}>
              <Spinner aria-label="Generating previews..." />
              <div style={{ marginTop: 8, color: "var(--pf-t--global--text--color--subtle)" }}>
                Analyzing commits and generating ticket previews...
              </div>
            </div>
          )}

          {!isLoading && suggestions.length === 0 && (
            <div style={{ textAlign: "center", padding: 24 }}>
              <div style={{ color: "var(--pf-t--global--text--color--subtle)", marginBottom: 12 }}>
                {activeRepos.length === 0
                  ? "No active repositories in this quarter."
                  : untrackedRepos.length === 0
                    ? "All active repositories already have Jira tickets linked via commit messages."
                    : "Click the button below to generate ticket suggestions for untracked work."}
              </div>
              {untrackedRepos.length > 0 && (
                <Button variant="primary" onClick={onOpenDrawer}>
                  Generate Ticket Suggestions ({untrackedRepos.length} repos)
                </Button>
              )}
            </div>
          )}

          {suggestions.length > 0 && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 8,
                }}
              >
                {suggestions.map((ticket) => (
                  <TicketPreviewRow
                    key={ticket.id}
                    ticket={ticket}
                    isExpanded={expandedTickets.has(ticket.id)}
                    onToggle={() => toggleTicket(ticket.id)}
                    jiraUrl={jiraUrl}
                  />
                ))}
              </div>

              <Divider style={{ margin: "16px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "var(--pf-t--global--text--color--subtle)", fontSize: "0.85rem" }}>
                  {selectedCount} ticket{selectedCount !== 1 ? "s" : ""} selected for creation
                  {trackedCount > 0 && ` / ${trackedCount} already tracked`}
                </div>
                <Button variant="primary" onClick={onOpenDrawer}>
                  Review &amp; Create Tickets
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </CardExpandableContent>
    </Card>
  );
}

function TicketPreviewRow({
  ticket,
  isExpanded,
  onToggle,
  jiraUrl,
}: {
  ticket: TicketSuggestion;
  isExpanded: boolean;
  onToggle: () => void;
  jiraUrl?: string;
}) {
  const priorityColor = PRIORITY_COLORS[ticket.priority] || "grey";
  const typeColor = TYPE_COLORS[ticket.issue_type] || "blue";

  return (
    <div
      style={{
        border: "1px solid var(--pf-t--global--border--color--default)",
        borderRadius: 4,
        padding: "8px 12px",
        opacity: ticket.already_tracked ? 0.7 : 1,
        background: ticket.already_tracked
          ? "var(--pf-t--global--background--color--secondary--default)"
          : undefined,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <span style={{ width: 16 }}>
          {isExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
        </span>

        <Label color={typeColor as any} isCompact>
          {ticket.issue_type}
        </Label>
        <Label color={priorityColor as any} isCompact>
          {ticket.priority}
        </Label>

        <span style={{ flex: 1, fontWeight: 500 }}>
          <Truncate content={ticket.summary} />
        </span>

        <Label color="blue" isCompact>{ticket.source_repo}</Label>
        <Label color="purple" isCompact>{ticket.source_branch}</Label>

        {ticket.already_tracked && (
          <Label color="orange" isCompact>
            Duplicate ({ticket.existing_jira.length})
          </Label>
        )}

        {ticket.pr_urls.length > 0 && (
          <Label color="cyan" isCompact>
            {ticket.pr_urls.length} PR{ticket.pr_urls.length !== 1 ? "s" : ""}
          </Label>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div style={{ marginTop: 8, marginLeft: 24 }}>
          {/* Target project */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: "0.85rem", marginRight: 8 }}>
              Target:
            </span>
            <Label color="blue" isCompact>{ticket.project_key}</Label>
            {jiraUrl && (
              <a
                href={`${jiraUrl}/projects/${ticket.project_key}/board`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: 8, fontSize: "0.85rem" }}
              >
                Open board <ExternalLinkAltIcon />
              </a>
            )}
          </div>

          {/* Description preview */}
          <div
            style={{
              background: "var(--pf-t--global--background--color--secondary--default)",
              borderRadius: 4,
              padding: "8px 12px",
              fontSize: "0.85rem",
              whiteSpace: "pre-wrap",
              maxHeight: 200,
              overflow: "auto",
              marginBottom: 8,
            }}
          >
            {ticket.description}
          </div>

          {/* Existing Jira links */}
          {ticket.existing_jira.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: "0.85rem", marginRight: 8 }}>
                Existing tickets:
              </span>
              {ticket.existing_jira.map((ej) => (
                <Label key={ej.key} color="orange" isCompact style={{ marginRight: 4 }}>
                  <a href={ej.url} target="_blank" rel="noopener noreferrer">
                    {ej.key}
                  </a>{" "}
                  - {ej.summary}
                </Label>
              ))}
            </div>
          )}

          {/* Commit SHAs */}
          {ticket.source_commits.length > 0 && (
            <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>
              {ticket.source_commits.length} commit{ticket.source_commits.length !== 1 ? "s" : ""}: {ticket.source_commits.slice(0, 8).join(", ")}
              {ticket.source_commits.length > 8 && ` ... +${ticket.source_commits.length - 8} more`}
            </div>
          )}

          {/* Labels */}
          {ticket.labels.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {ticket.labels.map((l) => (
                <Label key={l} isCompact style={{ marginRight: 4 }}>
                  {l}
                </Label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
