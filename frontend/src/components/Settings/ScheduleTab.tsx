/**
 * ScheduleTab - Scheduled scan automation
 * Create and manage automated scan schedules
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardTitle,
  Stack,
  StackItem,
  Flex,
  FlexItem,
  Button,
  Label,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  TextInput,
  FormSelect,
  FormSelectOption,
  Switch,
} from "@patternfly/react-core";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:9000" });
API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("access_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

interface Schedule {
  id: number;
  name: string;
  frequency: string;
  day_of_week: number | null;
  hour: number;
  directories: string[] | null;
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
  created_at: string | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ScheduleTab() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [hour, setHour] = useState(9);
  const [enabled, setEnabled] = useState(true);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/schedules/");
      setSchedules(res.data.schedules || []);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const resetForm = () => {
    setName("");
    setFrequency("daily");
    setDayOfWeek(0);
    setHour(9);
    setEnabled(true);
  };

  const createSchedule = async () => {
    setSaving(true);
    try {
      await API.post("/api/schedules/", {
        name,
        frequency,
        day_of_week: frequency === "weekly" ? dayOfWeek : null,
        hour,
        enabled,
      });
      setIsModalOpen(false);
      resetForm();
      await fetchSchedules();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const toggleSchedule = async (schedule: Schedule) => {
    try {
      await API.put(`/api/schedules/${schedule.id}`, {
        enabled: !schedule.enabled,
      });
      setSchedules((prev) =>
        prev.map((s) => (s.id === schedule.id ? { ...s, enabled: !s.enabled } : s))
      );
    } catch {
      // ignore
    }
  };

  const deleteSchedule = async (id: number) => {
    setDeleting(id);
    try {
      await API.delete(`/api/schedules/${id}`);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString();
  };

  const frequencyLabel = (s: Schedule) => {
    if (s.frequency === "daily") return `Daily at ${s.hour}:00 UTC`;
    if (s.frequency === "weekly") return `Weekly on ${DAYS[s.day_of_week ?? 0]} at ${s.hour}:00 UTC`;
    if (s.frequency === "monthly") return `Monthly on the 1st at ${s.hour}:00 UTC`;
    return s.frequency;
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "1rem" }}>
      <Stack hasGutter>
        <StackItem>
          <Flex justifyContent={{ default: "justifyContentSpaceBetween" }} alignItems={{ default: "alignItemsCenter" }}>
            <FlexItem>
              <strong>Scan Schedules</strong>
              <span style={{ marginLeft: "0.5rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                Automate repository analysis on a recurring basis
              </span>
            </FlexItem>
            <FlexItem>
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Create Schedule
              </Button>
            </FlexItem>
          </Flex>
        </StackItem>

        {schedules.length === 0 ? (
          <StackItem>
            <EmptyState>
              <EmptyStateBody>
                No scan schedules configured. Create one to automate your repository analysis.
              </EmptyStateBody>
            </EmptyState>
          </StackItem>
        ) : (
          schedules.map((schedule) => (
            <StackItem key={schedule.id}>
              <Card isCompact>
                <CardTitle>
                  <Flex justifyContent={{ default: "justifyContentSpaceBetween" }} alignItems={{ default: "alignItemsCenter" }}>
                    <FlexItem>
                      {schedule.name}
                      <Label
                        color={schedule.enabled ? "green" : "grey"}
                        isCompact
                        style={{ marginLeft: "0.5rem" }}
                      >
                        {schedule.enabled ? "Active" : "Paused"}
                      </Label>
                    </FlexItem>
                    <FlexItem>
                      <Flex spaceItems={{ default: "spaceItemsSm" }}>
                        <FlexItem>
                          <Switch
                            id={`toggle-${schedule.id}`}
                            label="Enabled"
                            isChecked={schedule.enabled}
                            onChange={() => toggleSchedule(schedule)}
                          />
                        </FlexItem>
                        <FlexItem>
                          <Button
                            variant="secondary"
                            isDanger
                            size="sm"
                            onClick={() => deleteSchedule(schedule.id)}
                            isLoading={deleting === schedule.id}
                            isDisabled={deleting === schedule.id}
                          >
                            Delete
                          </Button>
                        </FlexItem>
                      </Flex>
                    </FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody>
                  <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsXs" }}>
                    <FlexItem>
                      <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Schedule:</span>{" "}
                      {frequencyLabel(schedule)}
                    </FlexItem>
                    <FlexItem>
                      <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Last run:</span>{" "}
                      {formatDate(schedule.last_run)}
                    </FlexItem>
                    <FlexItem>
                      <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Next run:</span>{" "}
                      {formatDate(schedule.next_run)}
                    </FlexItem>
                  </Flex>
                </CardBody>
              </Card>
            </StackItem>
          ))
        )}
      </Stack>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        variant="medium"
      >
        <ModalHeader title="Create Scan Schedule" />
        <ModalBody>
          <Stack hasGutter>
            <StackItem>
              <FormGroup label="Schedule Name" isRequired fieldId="schedule-name">
                <TextInput
                  id="schedule-name"
                  value={name}
                  onChange={(_e, val) => setName(val)}
                  placeholder="e.g., Daily Morning Scan"
                />
              </FormGroup>
            </StackItem>

            <StackItem>
              <FormGroup label="Frequency" fieldId="schedule-frequency">
                <FormSelect
                  id="schedule-frequency"
                  value={frequency}
                  onChange={(_e, val) => setFrequency(val)}
                >
                  <FormSelectOption value="daily" label="Daily" />
                  <FormSelectOption value="weekly" label="Weekly" />
                  <FormSelectOption value="monthly" label="Monthly" />
                </FormSelect>
              </FormGroup>
            </StackItem>

            {frequency === "weekly" && (
              <StackItem>
                <FormGroup label="Day of Week" fieldId="schedule-dow">
                  <FormSelect
                    id="schedule-dow"
                    value={String(dayOfWeek)}
                    onChange={(_e, val) => setDayOfWeek(Number(val))}
                  >
                    {DAYS.map((day, i) => (
                      <FormSelectOption key={i} value={String(i)} label={day} />
                    ))}
                  </FormSelect>
                </FormGroup>
              </StackItem>
            )}

            <StackItem>
              <FormGroup label="Hour (UTC)" fieldId="schedule-hour">
                <FormSelect
                  id="schedule-hour"
                  value={String(hour)}
                  onChange={(_e, val) => setHour(Number(val))}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <FormSelectOption key={i} value={String(i)} label={`${String(i).padStart(2, "0")}:00 UTC`} />
                  ))}
                </FormSelect>
              </FormGroup>
            </StackItem>

            <StackItem>
              <Switch
                id="schedule-enabled"
                label="Enable immediately"
                isChecked={enabled}
                onChange={() => setEnabled(!enabled)}
              />
            </StackItem>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={createSchedule}
            isLoading={saving}
            isDisabled={saving || !name.trim()}
          >
            Create
          </Button>
          <Button variant="link" onClick={() => { setIsModalOpen(false); resetForm(); }}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
