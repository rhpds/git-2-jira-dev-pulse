import {
  Badge,
  Button,
  SearchInput,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
} from "@patternfly/react-core";
import { FilterIcon } from "@patternfly/react-icons";
import { useState } from "react";

interface RepoFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activityFilter: "all" | "active" | "inactive";
  onActivityFilterChange: (value: "all" | "active" | "inactive") => void;
  statusFilter: "all" | "clean" | "dirty";
  onStatusFilterChange: (value: "all" | "clean" | "dirty") => void;
  selectedBranch: string;
  onBranchChange: (value: string) => void;
  branches: string[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  filteredCount: number;
  totalCount: number;
}

export function RepoFilters({
  searchTerm,
  onSearchChange,
  activityFilter,
  onActivityFilterChange,
  statusFilter,
  onStatusFilterChange,
  selectedBranch,
  onBranchChange,
  branches,
  onClearFilters,
  hasActiveFilters,
  filteredCount,
  totalCount,
}: RepoFiltersProps) {
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);

  return (
    <Toolbar clearAllFilters={onClearFilters}>
      <ToolbarContent>
        <ToolbarGroup>
          <ToolbarItem>
            <SearchInput
              placeholder="Search repos..."
              value={searchTerm}
              onChange={(_e, value) => onSearchChange(value)}
              onClear={() => onSearchChange("")}
            />
          </ToolbarItem>

          <ToolbarItem>
            <Select
              id="activity-filter"
              isOpen={isActivityOpen}
              selected={activityFilter}
              onSelect={(_e, value) => {
                onActivityFilterChange(value as "all" | "active" | "inactive");
                setIsActivityOpen(false);
              }}
              onOpenChange={(isOpen) => setIsActivityOpen(isOpen)}
              toggle={(toggleRef) => (
                <MenuToggle ref={toggleRef} onClick={() => setIsActivityOpen(!isActivityOpen)}>
                  <FilterIcon /> Activity: {activityFilter === 'active' ? 'Recently updated' : activityFilter === 'inactive' ? 'Older repos' : 'All'}
                </MenuToggle>
              )}
            >
              <SelectList>
                <SelectOption value="all">All repositories</SelectOption>
                <SelectOption value="active" description="Updated in the last 30 days">
                  Recently updated
                </SelectOption>
                <SelectOption value="inactive" description="No updates in 30+ days">
                  Older repos
                </SelectOption>
              </SelectList>
            </Select>
          </ToolbarItem>

          <ToolbarItem>
            <Select
              id="status-filter"
              isOpen={isStatusOpen}
              selected={statusFilter}
              onSelect={(_e, value) => {
                onStatusFilterChange(value as "all" | "clean" | "dirty");
                setIsStatusOpen(false);
              }}
              onOpenChange={(isOpen) => setIsStatusOpen(isOpen)}
              toggle={(toggleRef) => (
                <MenuToggle ref={toggleRef} onClick={() => setIsStatusOpen(!isStatusOpen)}>
                  <FilterIcon /> Changes: {statusFilter === 'clean' ? 'No changes' : statusFilter === 'dirty' ? 'Has changes' : 'All'}
                </MenuToggle>
              )}
            >
              <SelectList>
                <SelectOption value="all">All repositories</SelectOption>
                <SelectOption value="clean" description="No uncommitted changes">
                  No changes
                </SelectOption>
                <SelectOption value="dirty" description="Has uncommitted changes">
                  Has changes
                </SelectOption>
              </SelectList>
            </Select>
          </ToolbarItem>

          {branches.length > 0 && (
            <ToolbarItem>
              <Select
                id="branch-filter"
                isOpen={isBranchOpen}
                selected={selectedBranch}
                onSelect={(_e, value) => {
                  onBranchChange(value as string);
                  setIsBranchOpen(false);
                }}
                onOpenChange={(isOpen) => setIsBranchOpen(isOpen)}
                toggle={(toggleRef) => (
                  <MenuToggle ref={toggleRef} onClick={() => setIsBranchOpen(!isBranchOpen)}>
                    <FilterIcon /> Branch: {selectedBranch}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="all">All branches</SelectOption>
                  {branches.map((branch) => (
                    <SelectOption key={branch} value={branch}>
                      {branch}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </ToolbarItem>
          )}
        </ToolbarGroup>

        <ToolbarItem>
          <Badge>
            {filteredCount} of {totalCount}
          </Badge>
        </ToolbarItem>

        {hasActiveFilters && (
          <ToolbarItem>
            <Button variant="link" onClick={onClearFilters}>
              Clear filters
            </Button>
          </ToolbarItem>
        )}
      </ToolbarContent>
    </Toolbar>
  );
}
