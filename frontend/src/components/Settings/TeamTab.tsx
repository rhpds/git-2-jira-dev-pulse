/**
 * Team Management Tab
 * Manage organization members, invite users, update roles
 */

import { useState } from "react";
import {
  Stack,
  StackItem,
  Card,
  CardBody,
  CardTitle,
  Button,
  Alert,
  AlertActionCloseButton,
  Label,
  Form,
  FormGroup,
  TextInput,
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
  Spinner,
  Modal,
  ModalVariant,
  Progress,
  ProgressMeasureLocation,
} from "@patternfly/react-core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  getOrgMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  type OrgMember,
} from "../../api/auth";
import { useAuth } from "../../context/AuthContext";

export function TeamTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isRoleSelectOpen, setIsRoleSelectOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["org-members"],
    queryFn: getOrgMembers,
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      inviteMember(email, role),
    onSuccess: (newMember) => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] });
      setSuccessMessage(`Invited ${newMember.full_name} as ${newMember.role}`);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("member");
    },
    onError: (error: any) => {
      setErrorMessage(
        error.response?.data?.detail || "Failed to invite member"
      );
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      updateMemberRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] });
      setSuccessMessage("Role updated");
    },
    onError: (error: any) => {
      setErrorMessage(
        error.response?.data?.detail || "Failed to update role"
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => removeMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] });
      setSuccessMessage("Member removed");
    },
    onError: (error: any) => {
      setErrorMessage(
        error.response?.data?.detail || "Failed to remove member"
      );
    },
  });

  const getRoleColor = (role: string): string => {
    const colors: Record<string, string> = {
      owner: "gold",
      admin: "purple",
      member: "blue",
      viewer: "grey",
    };
    return colors[role] || "grey";
  };

  const seatsLimit = user?.subscription?.seats_limit ?? 1;
  const seatsUsed = members.length;
  const isAdmin =
    user?.organization?.role === "owner" ||
    user?.organization?.role === "admin";

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Spinner size="lg" />
        <p
          style={{
            marginTop: "1rem",
            color: "var(--pf-t--global--text--color--subtle)",
          }}
        >
          Loading team members...
        </p>
      </div>
    );
  }

  return (
    <Stack hasGutter>
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert
              variant="success"
              title={successMessage}
              actionClose={
                <AlertActionCloseButton
                  onClose={() => setSuccessMessage("")}
                />
              }
            />
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert
              variant="danger"
              title={errorMessage}
              actionClose={
                <AlertActionCloseButton
                  onClose={() => setErrorMessage("")}
                />
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seat Usage */}
      <StackItem>
        <Card>
          <CardTitle>
            Team ({user?.organization?.name})
            {isAdmin && (
              <Button
                variant="primary"
                style={{ float: "right" }}
                onClick={() => setShowInviteModal(true)}
                isDisabled={seatsLimit > 0 && seatsUsed >= seatsLimit}
              >
                + Invite Member
              </Button>
            )}
          </CardTitle>
          <CardBody>
            <div style={{ maxWidth: "400px" }}>
              <strong>Seats</strong>
              <Progress
                value={
                  seatsLimit <= 0
                    ? 0
                    : (seatsUsed / seatsLimit) * 100
                }
                title={`${seatsUsed} / ${seatsLimit <= 0 ? "Unlimited" : seatsLimit}`}
                measureLocation={ProgressMeasureLocation.outside}
                style={{ marginTop: "0.5rem" }}
              />
            </div>
          </CardBody>
        </Card>
      </StackItem>

      {/* Members List */}
      <StackItem>
        <Card>
          <CardTitle>Members</CardTitle>
          <CardBody>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom:
                      "1px solid var(--pf-t--global--border--color--default)",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "0.75rem" }}>Name</th>
                  <th style={{ padding: "0.75rem" }}>Email</th>
                  <th style={{ padding: "0.75rem" }}>Role</th>
                  <th style={{ padding: "0.75rem" }}>Joined</th>
                  {isAdmin && (
                    <th style={{ padding: "0.75rem" }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((member: OrgMember) => (
                  <tr
                    key={member.user_id}
                    style={{
                      borderBottom:
                        "1px solid var(--pf-t--global--border--color--default)",
                    }}
                  >
                    <td style={{ padding: "0.75rem" }}>
                      <strong>{member.full_name}</strong>
                      {member.user_id === user?.id && (
                        <Label
                          isCompact
                          color="blue"
                          style={{ marginLeft: "0.5rem" }}
                        >
                          You
                        </Label>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        color:
                          "var(--pf-t--global--text--color--subtle)",
                      }}
                    >
                      {member.email}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <Label color={getRoleColor(member.role)}>
                        {member.role}
                      </Label>
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        color:
                          "var(--pf-t--global--text--color--subtle)",
                      }}
                    >
                      {new Date(member.joined_at).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: "0.75rem" }}>
                        {member.role !== "owner" &&
                          member.user_id !== user?.id && (
                            <div
                              style={{
                                display: "flex",
                                gap: "0.5rem",
                              }}
                            >
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  roleMutation.mutate({
                                    userId: member.user_id,
                                    role:
                                      member.role === "admin"
                                        ? "member"
                                        : "admin",
                                  })
                                }
                                isLoading={roleMutation.isPending}
                              >
                                {member.role === "admin"
                                  ? "Demote"
                                  : "Promote"}
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Remove ${member.full_name} from the team?`
                                    )
                                  ) {
                                    removeMutation.mutate(
                                      member.user_id
                                    );
                                  }
                                }}
                                isLoading={removeMutation.isPending}
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </StackItem>

      {/* Invite Modal */}
      <Modal
        variant={ModalVariant.small}
        title="Invite Team Member"
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setInviteEmail("");
          setInviteRole("member");
        }}
        actions={[
          <Button
            key="invite"
            variant="primary"
            onClick={() =>
              inviteMutation.mutate({
                email: inviteEmail,
                role: inviteRole,
              })
            }
            isLoading={inviteMutation.isPending}
            isDisabled={!inviteEmail}
          >
            Send Invite
          </Button>,
          <Button
            key="cancel"
            variant="link"
            onClick={() => {
              setShowInviteModal(false);
              setInviteEmail("");
              setInviteRole("member");
            }}
          >
            Cancel
          </Button>,
        ]}
      >
        <Form>
          <FormGroup label="Email Address" isRequired fieldId="invite-email">
            <TextInput
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(_e, val) => setInviteEmail(val)}
              placeholder="colleague@example.com"
            />
          </FormGroup>
          <FormGroup label="Role" fieldId="invite-role">
            <Select
              isOpen={isRoleSelectOpen}
              onOpenChange={(isOpen) => setIsRoleSelectOpen(isOpen)}
              onSelect={(_event, selection) => {
                setInviteRole(selection as string);
                setIsRoleSelectOpen(false);
              }}
              selected={inviteRole}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsRoleSelectOpen(!isRoleSelectOpen)}
                  isExpanded={isRoleSelectOpen}
                  style={{ width: "100%" }}
                >
                  {inviteRole.charAt(0).toUpperCase() + inviteRole.slice(1)}
                </MenuToggle>
              )}
            >
              <SelectList>
                <SelectOption value="viewer" description="View-only access">
                  Viewer
                </SelectOption>
                <SelectOption
                  value="member"
                  description="Can scan repos and create tickets"
                >
                  Member
                </SelectOption>
                <SelectOption
                  value="admin"
                  description="Can manage team and settings"
                >
                  Admin
                </SelectOption>
              </SelectList>
            </Select>
          </FormGroup>
        </Form>
      </Modal>
    </Stack>
  );
}
