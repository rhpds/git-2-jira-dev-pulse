import {
  Button,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Label,
  Spinner,
  Title,
} from "@patternfly/react-core";
import type { TicketSuggestion } from "../../api/types";
import TicketSuggestionRow from "./TicketSuggestionRow";

interface TicketDrawerProps {
  tickets: TicketSuggestion[];
  onUpdateTicket: (id: string, updates: Partial<TicketSuggestion>) => void;
  onClose: () => void;
  onCreateTickets: () => void;
  isLoading: boolean;
  isCreating: boolean;
  projectKey?: string;
  projectName?: string;
}

export default function TicketDrawerPanel({
  tickets,
  onUpdateTicket,
  onClose,
  onCreateTickets,
  isLoading,
  isCreating,
  projectKey,
  projectName,
}: TicketDrawerProps) {
  const selectedCount = tickets.filter((t) => t.selected).length;

  return (
    <DrawerPanelContent widths={{ default: "width_50" }}>
      <DrawerHead>
        <div>
          <Title headingLevel="h2" size="lg">
            Ticket Suggestions
          </Title>
          {projectKey && (
            <div style={{ marginTop: 4 }}>
              <Label color="blue" isCompact>
                {projectName || projectKey}
              </Label>
              <span style={{ marginLeft: 8, fontSize: "0.85rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                Tickets will be created in {projectKey}
              </span>
            </div>
          )}
        </div>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 32 }}>
            <Spinner aria-label="Generating suggestions..." />
            <div style={{ marginTop: 8 }}>Analyzing work and generating suggestions...</div>
          </div>
        ) : (
          <>
            {tickets.length === 0 && (
              <div style={{ padding: 16, color: "var(--pf-t--global--text--color--subtle)" }}>
                No ticket suggestions generated. Try selecting repos with more recent activity.
              </div>
            )}
            {tickets.map((ticket) => (
              <TicketSuggestionRow
                key={ticket.id}
                ticket={ticket}
                onUpdate={(updates) => onUpdateTicket(ticket.id, updates)}
              />
            ))}
            {tickets.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <Button
                  variant="primary"
                  onClick={onCreateTickets}
                  isDisabled={selectedCount === 0 || isCreating}
                  isLoading={isCreating}
                >
                  Create {selectedCount} Ticket{selectedCount !== 1 ? "s" : ""}
                </Button>
                <Button variant="link" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            )}
          </>
        )}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
}
