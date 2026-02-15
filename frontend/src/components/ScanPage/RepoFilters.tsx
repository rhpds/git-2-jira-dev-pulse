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
  Dropdown,
  DropdownList,
  DropdownItem,
  TextInput,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import { FilterIcon } from "@patternfly/react-icons";
import { useState, useEffect } from "react";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:9000" });
API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("access_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

interface FilterPreset {
  id: number;
  name: string;
  search_term: string;
  activity_filter: string;
  status_filter: string;
  branch_filter: string;
  is_default: boolean;
}

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
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => {
    API.get("/api/filter-presets/")
      .then((res) => setPresets(res.data.presets || []))
      .catch(() => {});
  }, []);

  const loadPreset = (preset: FilterPreset) => {
    onSearchChange(preset.search_term);
    onActivityFilterChange(preset.activity_filter as "all" | "active" | "inactive");
    onStatusFilterChange(preset.status_filter as "all" | "clean" | "dirty");
    onBranchChange(preset.branch_filter);
    setIsPresetOpen(false);
  };

  const savePreset = async () => {
    if (!saveName.trim()) return;
    try {
      const res = await API.post("/api/filter-presets/", {
        name: saveName,
        search_term: searchTerm,
        activity_filter: activityFilter,
        status_filter: statusFilter,
        branch_filter: selectedBranch,
      });
      setPresets((prev) => [...prev, res.data]);
      setSaveName("");
      setShowSaveInput(false);
    } catch {
      // ignore
    }
  };

  const deletePreset = async (id: number) => {
    try {
      await API.delete(`/api/filter-presets/${id}`);
      setPresets((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // ignore
    }
  };

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

        <ToolbarItem>
          <Dropdown
            isOpen={isPresetOpen}
            onSelect={() => {}}
            onOpenChange={setIsPresetOpen}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setIsPresetOpen(!isPresetOpen)}
                variant="secondary"
              >
                Presets
              </MenuToggle>
            )}
          >
            <DropdownList>
              {presets.length > 0 ? (
                presets.map((p) => (
                  <DropdownItem
                    key={p.id}
                    onClick={() => loadPreset(p)}
                    description={`${p.activity_filter}/${p.status_filter}`}
                  >
                    <Flex justifyContent={{ default: "justifyContentSpaceBetween" }} alignItems={{ default: "alignItemsCenter" }}>
                      <FlexItem>{p.name}{p.is_default ? " *" : ""}</FlexItem>
                      <FlexItem>
                        <Button
                          variant="plain"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); deletePreset(p.id); }}
                          style={{ padding: "0 4px", fontSize: "0.7rem" }}
                        >
                          X
                        </Button>
                      </FlexItem>
                    </Flex>
                  </DropdownItem>
                ))
              ) : (
                <DropdownItem key="empty" isDisabled>No saved presets</DropdownItem>
              )}
              <DropdownItem
                key="save"
                onClick={() => { setShowSaveInput(true); setIsPresetOpen(false); }}
              >
                + Save current filters
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        </ToolbarItem>

        {showSaveInput && (
          <ToolbarItem>
            <Flex spaceItems={{ default: "spaceItemsXs" }} alignItems={{ default: "alignItemsCenter" }}>
              <FlexItem>
                <TextInput
                  id="preset-name"
                  value={saveName}
                  onChange={(_e, val) => setSaveName(val)}
                  placeholder="Preset name..."
                  onKeyDown={(e) => { if (e.key === "Enter") savePreset(); if (e.key === "Escape") setShowSaveInput(false); }}
                  style={{ width: "150px" }}
                />
              </FlexItem>
              <FlexItem>
                <Button variant="primary" size="sm" onClick={savePreset} isDisabled={!saveName.trim()}>
                  Save
                </Button>
              </FlexItem>
              <FlexItem>
                <Button variant="link" size="sm" onClick={() => setShowSaveInput(false)}>
                  Cancel
                </Button>
              </FlexItem>
            </Flex>
          </ToolbarItem>
        )}
      </ToolbarContent>
    </Toolbar>
  );
}
