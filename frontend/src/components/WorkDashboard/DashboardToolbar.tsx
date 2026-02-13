import {
  Button,
  Switch,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  ToggleGroup,
  ToggleGroupItem,
} from "@patternfly/react-core";
import type { Quarter, QuarterMode, Week } from "../../utils/quarterUtils";
import { getQuarterLabel } from "../../utils/quarterUtils";

interface DashboardToolbarProps {
  quarters: Quarter[];
  selectedQuarter: Quarter;
  onSelectQuarter: (q: Quarter) => void;
  quarterMode: QuarterMode;
  onToggleMode: () => void;
  weeks: Week[];
  selectedWeek: number | null;
  onSelectWeek: (w: number | null) => void;
  onCreateTickets: () => void;
  ticketCount: number;
}

export default function DashboardToolbar({
  quarters,
  selectedQuarter,
  onSelectQuarter,
  quarterMode,
  onToggleMode,
  weeks,
  selectedWeek,
  onSelectWeek,
  onCreateTickets,
  ticketCount,
}: DashboardToolbarProps) {
  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarGroup>
          <ToolbarItem>
            <span style={{ fontWeight: 600, marginRight: 8 }}>Quarter:</span>
            <ToggleGroup aria-label="Select quarter">
              {quarters.map((q) => (
                <ToggleGroupItem
                  key={`${q.year}-${q.quarter}`}
                  text={getQuarterLabel(q)}
                  isSelected={
                    q.year === selectedQuarter.year &&
                    q.quarter === selectedQuarter.quarter
                  }
                  onChange={() => onSelectQuarter(q)}
                />
              ))}
            </ToggleGroup>
          </ToolbarItem>
          <ToolbarItem>
            <Switch
              id="quarter-mode-toggle"
              label="RH Fiscal"
              labelOff="Calendar"
              isChecked={quarterMode === "redhat"}
              onChange={onToggleMode}
            />
          </ToolbarItem>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarItem>
            <span style={{ fontWeight: 600, marginRight: 8 }}>Week:</span>
            <ToggleGroup aria-label="Select week">
              <ToggleGroupItem
                text="All"
                isSelected={selectedWeek === null}
                onChange={() => onSelectWeek(null)}
              />
              {weeks.map((w) => (
                <ToggleGroupItem
                  key={w.weekNum}
                  text={`W${w.weekNum}`}
                  isSelected={selectedWeek === w.weekNum}
                  onChange={() => onSelectWeek(w.weekNum)}
                />
              ))}
            </ToggleGroup>
          </ToolbarItem>
        </ToolbarGroup>

        <ToolbarItem align={{ default: "alignEnd" }}>
          <Button variant="primary" onClick={onCreateTickets}>
            Create Tickets{ticketCount > 0 ? ` (${ticketCount})` : ""}
          </Button>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
}
