import { Label } from "@patternfly/react-core";
import type { PullRequestInfo } from "../../api/types";

interface PRTableProps {
  pullRequests: PullRequestInfo[];
}

function stateColor(state: string): "blue" | "green" | "red" | "grey" {
  switch (state) {
    case "OPEN":
      return "blue";
    case "MERGED":
      return "green";
    case "CLOSED":
      return "red";
    default:
      return "grey";
  }
}

export default function PRTable({ pullRequests }: PRTableProps) {
  if (pullRequests.length === 0) {
    return (
      <div style={{ padding: 16, color: "var(--pf-t--global--text--color--subtle)" }}>
        No pull requests found.
      </div>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "2px solid var(--pf-t--global--border--color--default)" }}>
          <th style={{ padding: "6px 8px" }}>PR#</th>
          <th style={{ padding: "6px 8px" }}>Title</th>
          <th style={{ padding: "6px 8px" }}>Branch</th>
          <th style={{ padding: "6px 8px" }}>State</th>
          <th style={{ padding: "6px 8px" }}>Created</th>
          <th style={{ padding: "6px 8px" }}>Merged</th>
        </tr>
      </thead>
      <tbody>
        {pullRequests.map((pr) => (
          <tr
            key={pr.number}
            style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}
          >
            <td style={{ padding: "6px 8px" }}>
              <a href={pr.url} target="_blank" rel="noopener noreferrer">
                #{pr.number}
              </a>
            </td>
            <td style={{ padding: "6px 8px" }}>{pr.title}</td>
            <td style={{ padding: "6px 8px" }}>
              <code style={{ fontSize: "0.85em" }}>{pr.branch}</code>
            </td>
            <td style={{ padding: "6px 8px" }}>
              <Label color={stateColor(pr.state)} isCompact>
                {pr.state}
              </Label>
            </td>
            <td style={{ padding: "6px 8px" }}>
              {pr.created_at ? new Date(pr.created_at).toLocaleDateString() : "—"}
            </td>
            <td style={{ padding: "6px 8px" }}>
              {pr.merged_at ? new Date(pr.merged_at).toLocaleDateString() : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
