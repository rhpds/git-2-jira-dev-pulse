import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Alert,
  AlertActionCloseButton,
} from "@patternfly/react-core";
import type { RepoInfo } from "../../api/types";
import type { RemoteBranch } from "../../api/client";

interface PullBranchModalProps {
  pullRepo: RepoInfo | null;
  remoteBranches: RemoteBranch[];
  loadingBranches: boolean;
  pulling: boolean;
  pullResult: { success: boolean; message: string } | null;
  onClose: () => void;
  onPull: (branch: string) => void;
  onClearResult: () => void;
}

export function PullBranchModal({
  pullRepo,
  remoteBranches,
  loadingBranches,
  pulling,
  pullResult,
  onClose,
  onPull,
}: PullBranchModalProps) {
  return (
    <Modal isOpen={!!pullRepo} onClose={onClose} variant="medium">
      <ModalHeader
        title={`Pull Branch — ${pullRepo?.name ?? ""}`}
        description="Select a branch to checkout and pull. Showing branches with your PRs."
      />
      <ModalBody>
        {loadingBranches && <Spinner aria-label="Loading branches..." />}

        {!loadingBranches && remoteBranches.length === 0 && (
          <p>No rhjcd branches with PRs found for this repo.</p>
        )}

        {!loadingBranches &&
          remoteBranches.map((rb) => (
            <div
              key={rb.branch}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 0",
                borderBottom:
                  "1px solid var(--pf-t--global--border--color--default)",
              }}
            >
              <div style={{ flex: 1 }}>
                <strong>{rb.branch}</strong>
                <div
                  style={{
                    fontSize: "var(--pf-t--global--font--size--sm)",
                    color: "var(--pf-t--global--text--color--subtle)",
                  }}
                >
                  PR #{rb.pr_number}: {rb.pr_title}
                </div>
              </div>
              <Label
                color={
                  rb.pr_state === "MERGED"
                    ? "green"
                    : rb.pr_state === "OPEN"
                      ? "blue"
                      : rb.pr_state === "DEFAULT"
                        ? "purple"
                        : "grey"
                }
                isCompact
              >
                {rb.pr_state === "DEFAULT" ? "base" : rb.pr_state}
              </Label>
              <Button
                variant="secondary"
                isSmall
                isLoading={pulling}
                isDisabled={pulling}
                onClick={() => onPull(rb.branch)}
              >
                Pull
              </Button>
            </div>
          ))}

        {pullResult && (
          <Alert
            variant={pullResult.success ? "success" : "danger"}
            title={pullResult.message}
            style={{ marginTop: 16 }}
            actionClose={<AlertActionCloseButton onClose={onClose} />}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
