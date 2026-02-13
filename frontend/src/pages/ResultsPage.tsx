import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Label,
  Title,
} from "@patternfly/react-core";
import type { BatchCreateResult } from "../api/types";

function getCreatedResults(): BatchCreateResult | null {
  const raw = sessionStorage.getItem("createdResults");
  return raw ? JSON.parse(raw) : null;
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState<BatchCreateResult | null>(null);

  useEffect(() => {
    setResults(getCreatedResults());
  }, []);

  if (!results) {
    return (
      <EmptyState>
        <Title headingLevel="h2" size="lg">
          No results yet
        </Title>
        <EmptyStateBody>
          Complete the ticket creation flow first.
        </EmptyStateBody>
        <Button variant="primary" onClick={() => navigate("/")}>
          Start Over
        </Button>
      </EmptyState>
    );
  }

  return (
    <>
      <Title headingLevel="h1" size="2xl" style={{ marginBottom: 16 }}>
        Ticket Creation Results
      </Title>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Label color="green">
          {results.created.filter((t) => !t.error && !t.duplicate).length} created
        </Label>
        {results.skipped_duplicates > 0 && (
          <Label color="orange">
            {results.skipped_duplicates} skipped (duplicates)
          </Label>
        )}
        {results.errors > 0 && (
          <Label color="red">{results.errors} errors</Label>
        )}
      </div>

      <Card>
        <CardBody>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid var(--pf-t--global--border--color--default)" }}>
                <th style={{ padding: "8px" }}>Key</th>
                <th style={{ padding: "8px" }}>Summary</th>
                <th style={{ padding: "8px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {results.created.map((ticket, i) => (
                <tr
                  key={ticket.key + i}
                  style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}
                >
                  <td style={{ padding: "8px" }}>
                    {ticket.url ? (
                      <a
                        href={ticket.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {ticket.key}
                      </a>
                    ) : (
                      ticket.key
                    )}
                  </td>
                  <td style={{ padding: "8px" }}>{ticket.summary}</td>
                  <td style={{ padding: "8px" }}>
                    {ticket.error ? (
                      <Label color="red">Error: {ticket.error}</Label>
                    ) : ticket.duplicate ? (
                      <Label color="orange">Duplicate</Label>
                    ) : (
                      <Label color="green">Created</Label>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Button variant="primary" onClick={() => navigate("/")}>
          Start New Scan
        </Button>
      </div>
    </>
  );
}
