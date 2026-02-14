import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@patternfly/react-table";
import { Button, Label } from "@patternfly/react-core";
import { TrashIcon } from "@patternfly/react-icons";
import type { AnalysisRunSummary } from "../../api/types";

interface HistoryListProps {
  runs: AnalysisRunSummary[];
  selectedRunId: number | null;
  onSelectRun: (id: number) => void;
  onDeleteRun: (id: number) => void;
}

export function HistoryList({
  runs,
  selectedRunId,
  onSelectRun,
  onDeleteRun,
}: HistoryListProps) {
  return (
    <Table aria-label="Analysis history" variant="compact" isStickyHeader>
      <Thead>
        <Tr>
          <Th>Date</Th>
          <Th>Repos</Th>
          <Th>Suggestions</Th>
          <Th>Created</Th>
          <Th>Project</Th>
          <Th width={10}>Actions</Th>
        </Tr>
      </Thead>
      <Tbody>
        {runs.map((run) => (
          <Tr
            key={run.id}
            isClickable
            isRowSelected={selectedRunId === run.id}
            onRowClick={() => onSelectRun(run.id)}
          >
            <Td dataLabel="Date">
              {new Date(run.timestamp).toLocaleString()}
            </Td>
            <Td dataLabel="Repos">{run.repos_count} repos</Td>
            <Td dataLabel="Suggestions">{run.total_suggestions}</Td>
            <Td dataLabel="Created">
              {run.created_tickets > 0 ? (
                <Label color="green">{run.created_tickets} created</Label>
              ) : (
                <Label>None</Label>
              )}
            </Td>
            <Td dataLabel="Project">
              {run.project_key ? (
                <Label color="blue">{run.project_key}</Label>
              ) : (
                "-"
              )}
            </Td>
            <Td isActionCell>
              <Button
                variant="plain"
                aria-label="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm(
                      "Are you sure you want to delete this analysis run?"
                    )
                  ) {
                    onDeleteRun(run.id);
                  }
                }}
              >
                <TrashIcon />
              </Button>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
