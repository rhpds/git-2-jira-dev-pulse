import { useState } from "react";
import {
  Checkbox,
  ExpandableSection,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Label,
  TextArea,
  TextInput,
} from "@patternfly/react-core";
import type { TicketSuggestion } from "../../api/types";
import { AVAILABLE_LABELS } from "../../api/types";

interface TicketSuggestionRowProps {
  ticket: TicketSuggestion;
  onUpdate: (updates: Partial<TicketSuggestion>) => void;
}

export default function TicketSuggestionRow({ ticket, onUpdate }: TicketSuggestionRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        padding: "8px 0",
        borderBottom: "1px solid var(--pf-t--global--border--color--default)",
        opacity: ticket.already_tracked ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Checkbox
          id={`drawer-sel-${ticket.id}`}
          isChecked={ticket.selected}
          onChange={(_e, checked) => onUpdate({ selected: checked })}
        />
        <TextInput
          aria-label="Summary"
          value={ticket.summary}
          onChange={(_e, val) => onUpdate({ summary: val })}
          style={{ flex: 1 }}
        />
        <FormSelect
          aria-label="Type"
          value={ticket.issue_type}
          onChange={(_e, val) => onUpdate({ issue_type: val as TicketSuggestion["issue_type"] })}
          style={{ width: 100 }}
        >
          <FormSelectOption value="Story" label="Story" />
          <FormSelectOption value="Task" label="Task" />
          <FormSelectOption value="Bug" label="Bug" />
        </FormSelect>
        <FormSelect
          aria-label="Priority"
          value={ticket.priority}
          onChange={(_e, val) => onUpdate({ priority: val as TicketSuggestion["priority"] })}
          style={{ width: 100 }}
        >
          <FormSelectOption value="Major" label="Major" />
          <FormSelectOption value="Normal" label="Normal" />
          <FormSelectOption value="Minor" label="Minor" />
          <FormSelectOption value="Critical" label="Critical" />
          <FormSelectOption value="Blocker" label="Blocker" />
        </FormSelect>
      </div>

      {ticket.already_tracked && ticket.existing_jira.length > 0 && (
        <div style={{ marginLeft: 32, marginTop: 4 }}>
          {ticket.existing_jira.map((ej) => (
            <Label key={ej.key} color="orange" isCompact style={{ marginRight: 4 }}>
              <a href={ej.url} target="_blank" rel="noopener noreferrer">
                {ej.key}
              </a>
            </Label>
          ))}
        </div>
      )}

      <div style={{ marginLeft: 32, marginTop: 4 }}>
        <Label color="blue" isCompact>{ticket.source_repo}</Label>{" "}
        <Label color="purple" isCompact>{ticket.source_branch}</Label>
        {ticket.pr_urls.length > 0 && (
          <Label color="cyan" isCompact style={{ marginLeft: 4 }}>
            {ticket.pr_urls.length} PR{ticket.pr_urls.length > 1 ? "s" : ""}
          </Label>
        )}
      </div>

      <ExpandableSection
        toggleText={expanded ? "Hide details" : "Show details"}
        isExpanded={expanded}
        onToggle={(_e, isOpen) => setExpanded(isOpen)}
        style={{ marginLeft: 32, marginTop: 4 }}
      >
        <FormGroup label="Description" fieldId={`drawer-desc-${ticket.id}`}>
          <TextArea
            id={`drawer-desc-${ticket.id}`}
            value={ticket.description}
            onChange={(_e, val) => onUpdate({ description: val })}
            rows={3}
            resizeOrientation="vertical"
          />
        </FormGroup>
        <FormGroup label="Labels" fieldId={`drawer-labels-${ticket.id}`} style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {AVAILABLE_LABELS.map((label) => (
              <Checkbox
                key={label}
                id={`drawer-label-${ticket.id}-${label}`}
                label={label}
                isChecked={ticket.labels.includes(label)}
                onChange={(_e, checked) => {
                  const next = checked
                    ? [...ticket.labels, label]
                    : ticket.labels.filter((l) => l !== label);
                  onUpdate({ labels: next });
                }}
              />
            ))}
          </div>
        </FormGroup>
        <FormGroup label="Assignee" fieldId={`drawer-assign-${ticket.id}`} style={{ marginTop: 8 }}>
          <TextInput
            id={`drawer-assign-${ticket.id}`}
            value={ticket.assignee}
            onChange={(_e, val) => onUpdate({ assignee: val })}
          />
        </FormGroup>
      </ExpandableSection>
    </div>
  );
}
