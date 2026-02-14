import { useState } from "react";
import {
  PageSection,
  EmptyState,
  EmptyStateBody,
  Spinner,
} from "@patternfly/react-core";
import { HistoryList } from "../components/History/HistoryList";
import { HistoryDetailDrawer } from "../components/History/HistoryDetailDrawer";
import {
  useAnalysisHistory,
  useAnalysisRun,
  useDeleteAnalysisRun,
  useRestoreAnalysisRun,
} from "../hooks/useHistory";

export default function HistoryPage() {
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: runs, isLoading, error } = useAnalysisHistory();
  const {
    data: runDetail,
    isLoading: isLoadingDetail,
  } = useAnalysisRun(selectedRunId);
  const deleteMutation = useDeleteAnalysisRun();
  const restoreMutation = useRestoreAnalysisRun();

  const handleSelectRun = (id: number) => {
    setSelectedRunId(id);
    setIsDrawerOpen(true);
  };

  const handleDeleteRun = (id: number) => {
    deleteMutation.mutate(id);
    if (selectedRunId === id) {
      setIsDrawerOpen(false);
      setSelectedRunId(null);
    }
  };

  const handleRestore = () => {
    if (selectedRunId) {
      restoreMutation.mutate(selectedRunId, {
        onSuccess: (suggestions) => {
          alert(`Restored ${suggestions.length} suggestions!`);
          // Could navigate to results page or handle differently
        },
      });
    }
  };

  if (isLoading) {
    return <Spinner aria-label="Loading history..." />;
  }

  if (error) {
    return (
      <EmptyState titleText="Error loading history" status="danger">
        <EmptyStateBody>{String(error)}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <PageSection>
        <EmptyState titleText="No analysis history">
          <EmptyStateBody>
            Run an analysis to see your history here.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Title headingLevel="h1" size="2xl" style={{ marginBlockEnd: "var(--pf-t--global--spacer--md)" }}>
        Analysis History
      </Title>

      <HistoryDetailDrawer
        isOpen={isDrawerOpen}
        runDetail={runDetail}
        isLoading={isLoadingDetail}
        onClose={() => setIsDrawerOpen(false)}
        onRestore={handleRestore}
      />

      <HistoryList
        runs={runs}
        selectedRunId={selectedRunId}
        onSelectRun={handleSelectRun}
        onDeleteRun={handleDeleteRun}
      />
    </PageSection>
  );
}
