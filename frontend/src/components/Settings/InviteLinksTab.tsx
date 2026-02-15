/**
 * InviteLinksTab - Shareable team invitation links
 * Create and manage invitation links with expiration and usage limits
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
  FormSelect,
  FormSelectOption,
  TextInput,
  ClipboardCopy,
} from "@patternfly/react-core";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:9000" });
API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("access_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

interface InviteLink {
  id: number;
  token: string;
  role: string;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  is_expired: boolean;
  expires_at: string | null;
  created_at: string | null;
}

export function InviteLinksTab() {
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState<number | null>(null);

  // Form state
  const [role, setRole] = useState("member");
  const [maxUses, setMaxUses] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("72");

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/org/invitations/");
      setLinks(res.data.links || []);
    } catch {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const createLink = async () => {
    setCreating(true);
    try {
      await API.post("/api/org/invitations/", {
        role,
        max_uses: maxUses ? Number(maxUses) : null,
        expires_in_hours: Number(expiresInHours),
      });
      setIsModalOpen(false);
      setRole("member");
      setMaxUses("");
      setExpiresInHours("72");
      await fetchLinks();
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const deactivateLink = async (id: number) => {
    setDeactivating(id);
    try {
      await API.delete(`/api/org/invitations/${id}`);
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, is_active: false } : l)));
    } catch {
      // ignore
    } finally {
      setDeactivating(null);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString();
  };

  const getInviteUrl = (token: string) => {
    return `${window.location.origin}/join/${token}`;
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
              <strong>Invitation Links</strong>
              <span style={{ marginLeft: "0.5rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                Share links to invite team members
              </span>
            </FlexItem>
            <FlexItem>
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Create Invite Link
              </Button>
            </FlexItem>
          </Flex>
        </StackItem>

        {links.length === 0 ? (
          <StackItem>
            <EmptyState>
              <EmptyStateBody>
                No invitation links created yet. Create one to invite team members.
              </EmptyStateBody>
            </EmptyState>
          </StackItem>
        ) : (
          links.map((link) => (
            <StackItem key={link.id}>
              <Card isCompact>
                <CardTitle>
                  <Flex justifyContent={{ default: "justifyContentSpaceBetween" }} alignItems={{ default: "alignItemsCenter" }}>
                    <FlexItem>
                      <Label
                        color={!link.is_active ? "grey" : link.is_expired ? "orange" : "green"}
                        isCompact
                        style={{ marginRight: "0.5rem" }}
                      >
                        {!link.is_active ? "Deactivated" : link.is_expired ? "Expired" : "Active"}
                      </Label>
                      <Label color="blue" isCompact style={{ marginRight: "0.5rem" }}>
                        {link.role}
                      </Label>
                      <span style={{ color: "var(--pf-t--global--text--color--subtle)", fontSize: "0.875rem" }}>
                        {link.use_count} uses{link.max_uses ? ` / ${link.max_uses} max` : ""}
                      </span>
                    </FlexItem>
                    {link.is_active && !link.is_expired && (
                      <FlexItem>
                        <Button
                          variant="secondary"
                          isDanger
                          size="sm"
                          onClick={() => deactivateLink(link.id)}
                          isLoading={deactivating === link.id}
                          isDisabled={deactivating === link.id}
                        >
                          Deactivate
                        </Button>
                      </FlexItem>
                    )}
                  </Flex>
                </CardTitle>
                <CardBody>
                  <Stack hasGutter>
                    {link.is_active && !link.is_expired && (
                      <StackItem>
                        <ClipboardCopy isReadOnly>
                          {getInviteUrl(link.token)}
                        </ClipboardCopy>
                      </StackItem>
                    )}
                    <StackItem>
                      <Flex spaceItems={{ default: "spaceItemsMd" }}>
                        <FlexItem>
                          <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Expires:</span>{" "}
                          {formatDate(link.expires_at)}
                        </FlexItem>
                        <FlexItem>
                          <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Created:</span>{" "}
                          {formatDate(link.created_at)}
                        </FlexItem>
                      </Flex>
                    </StackItem>
                  </Stack>
                </CardBody>
              </Card>
            </StackItem>
          ))
        )}
      </Stack>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        variant="medium"
      >
        <ModalHeader title="Create Invitation Link" />
        <ModalBody>
          <Stack hasGutter>
            <StackItem>
              <FormGroup label="Role for invited members" fieldId="invite-role">
                <FormSelect
                  id="invite-role"
                  value={role}
                  onChange={(_e, val) => setRole(val)}
                >
                  <FormSelectOption value="viewer" label="Viewer" />
                  <FormSelectOption value="member" label="Member" />
                  <FormSelectOption value="admin" label="Admin" />
                </FormSelect>
              </FormGroup>
            </StackItem>

            <StackItem>
              <FormGroup label="Maximum uses (leave empty for unlimited)" fieldId="invite-max-uses">
                <TextInput
                  id="invite-max-uses"
                  type="number"
                  value={maxUses}
                  onChange={(_e, val) => setMaxUses(val)}
                  placeholder="Unlimited"
                />
              </FormGroup>
            </StackItem>

            <StackItem>
              <FormGroup label="Expires in (hours)" fieldId="invite-expires">
                <FormSelect
                  id="invite-expires"
                  value={expiresInHours}
                  onChange={(_e, val) => setExpiresInHours(val)}
                >
                  <FormSelectOption value="24" label="24 hours (1 day)" />
                  <FormSelectOption value="72" label="72 hours (3 days)" />
                  <FormSelectOption value="168" label="168 hours (1 week)" />
                  <FormSelectOption value="720" label="720 hours (30 days)" />
                </FormSelect>
              </FormGroup>
            </StackItem>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={createLink}
            isLoading={creating}
            isDisabled={creating}
          >
            Create Link
          </Button>
          <Button variant="link" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
