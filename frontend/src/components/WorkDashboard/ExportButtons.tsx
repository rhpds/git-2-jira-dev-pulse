import {
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
} from "@patternfly/react-core";
import { DownloadIcon } from "@patternfly/react-icons";
import { useState } from "react";
import {
  exportSuggestionsToCSV,
  exportSuggestionsToJSON,
  exportWorkSummariesToCSV,
  exportWorkSummariesToJSON,
} from "../../utils/exportUtils";
import type { TicketSuggestion, WorkSummary } from "../../api/types";

interface ExportButtonsProps {
  suggestions?: TicketSuggestion[];
  workSummaries?: WorkSummary[];
  variant?: "suggestions" | "work-summaries";
}

export function ExportButtons({
  suggestions,
  workSummaries,
  variant = "suggestions",
}: ExportButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: "csv" | "json") => {
    if (variant === "suggestions" && suggestions) {
      if (format === "csv") {
        exportSuggestionsToCSV(suggestions);
      } else {
        exportSuggestionsToJSON(suggestions);
      }
    } else if (variant === "work-summaries" && workSummaries) {
      if (format === "csv") {
        exportWorkSummariesToCSV(workSummaries);
      } else {
        exportWorkSummariesToJSON(workSummaries);
      }
    }
    setIsOpen(false);
  };

  const isEmpty =
    (variant === "suggestions" && (!suggestions || suggestions.length === 0)) ||
    (variant === "work-summaries" && (!workSummaries || workSummaries.length === 0));

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen(!isOpen)}
          isDisabled={isEmpty}
          variant="secondary"
          icon={<DownloadIcon />}
        >
          Export
        </MenuToggle>
      )}
    >
      <DropdownList>
        <DropdownItem onClick={() => handleExport("csv")}>
          Export as CSV
        </DropdownItem>
        <DropdownItem onClick={() => handleExport("json")}>
          Export as JSON
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
}
