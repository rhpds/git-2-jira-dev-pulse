import { Label, Spinner, Alert, AlertVariant } from "@patternfly/react-core";
import type { RepoJiraTicket } from "../../api/types";

interface JiraTableProps {
  tickets: RepoJiraTicket[];
  isLoading: boolean;
}

export default function JiraTable({ tickets, isLoading }: JiraTableProps) {
  if (isLoading) {
    return <Spinner size="md" aria-label="Loading Jira tickets..." />;
  }

  if (tickets.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <Alert
          variant={AlertVariant.info}
          title="No Jira tickets found for this repository"
          isInline
          isPlain
        >
          This means no Jira tickets have summaries matching this repo name.
          Commits without PROJ-123 references in their messages are not
          automatically linked. Use the "Create Tickets" button in the toolbar
          or the Ticket Preview panel below to generate ticket suggestions
          for this work.
        </Alert>
      </div>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "2px solid var(--pf-t--global--border--color--default)" }}>
          <th style={{ padding: "6px 8px" }}>Key</th>
          <th style={{ padding: "6px 8px" }}>Summary</th>
          <th style={{ padding: "6px 8px" }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map((t) => (
          <tr
            key={t.key}
            style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}
          >
            <td style={{ padding: "6px 8px" }}>
              <a href={t.url} target="_blank" rel="noopener noreferrer">
                {t.key}
              </a>
            </td>
            <td style={{ padding: "6px 8px" }}>{t.summary}</td>
            <td style={{ padding: "6px 8px" }}>
              <Label isCompact>{t.status}</Label>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
