/**
 * Onboarding Wizard Page
 * Multi-step onboarding flow for new users
 */

import { useState } from "react";
import {
  PageSection,
  Card,
  CardBody,
  Title,
  Button,
  Progress,
  Stack,
  StackItem,
  Flex,
  FlexItem,
  Alert,
  Switch,
  Label,
} from "@patternfly/react-core";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { completeOnboarding } from "../api/auth";
import { useAuth } from "../context/AuthContext";

const STEPS = [
  { key: "welcome", title: "Welcome" },
  { key: "integrations", title: "Connect Integrations" },
  { key: "preferences", title: "Preferences" },
  { key: "complete", title: "All Set!" },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [notifPrefs, setNotifPrefs] = useState({
    scan_completed: true,
    ticket_created: true,
    member_joined: true,
    integration_status: true,
  });

  const completeMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate("/");
    },
  });

  const progress = ((step + 1) / STEPS.length) * 100;

  const toggleIntegration = (key: string) => {
    setSelectedIntegrations((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    );
  };

  const integrations = [
    {
      key: "jira",
      name: "Jira",
      description: "Push ticket suggestions to Red Hat Jira",
      color: "#0052CC",
    },
    {
      key: "github",
      name: "GitHub",
      description: "Import repos, PRs, and commit activity",
      color: "#24292e",
    },
    {
      key: "linear",
      name: "Linear",
      description: "Sync issues and project tracking",
      color: "#5E6AD2",
    },
    {
      key: "codeclimate",
      name: "CodeClimate",
      description: "Code quality and test coverage metrics",
      color: "#1F8C4E",
    },
  ];

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <Stack hasGutter>
              <StackItem>
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                  <div
                    style={{
                      fontSize: "3rem",
                      marginBottom: "1rem",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      fontWeight: 800,
                    }}
                  >
                    DevPulse Pro
                  </div>
                  <Title headingLevel="h2" size="xl">
                    Welcome{user?.full_name ? `, ${user.full_name}` : ""}!
                  </Title>
                  <p
                    style={{
                      marginTop: "1rem",
                      fontSize: "1.1rem",
                      color: "var(--pf-t--global--text--color--subtle)",
                      maxWidth: "500px",
                      margin: "1rem auto 0",
                    }}
                  >
                    Let's get you set up in just a few steps. We'll connect your
                    development tools, configure your preferences, and have you
                    scanning repos in no time.
                  </p>
                </div>
              </StackItem>
              <StackItem>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "1.5rem",
                    maxWidth: "600px",
                    margin: "1rem auto",
                  }}
                >
                  {[
                    { icon: "1", title: "Connect", desc: "Link your dev tools" },
                    { icon: "2", title: "Configure", desc: "Set your preferences" },
                    { icon: "3", title: "Scan", desc: "Start analyzing repos" },
                  ].map((item) => (
                    <div
                      key={item.icon}
                      style={{
                        textAlign: "center",
                        padding: "1.5rem 1rem",
                        borderRadius: "12px",
                        background: "var(--pf-t--global--background--color--secondary--default)",
                        border: "1px solid var(--pf-t--global--border--color--default)",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #667eea, #764ba2)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 0.75rem",
                          fontWeight: 700,
                          fontSize: "1.1rem",
                        }}
                      >
                        {item.icon}
                      </div>
                      <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--pf-t--global--text--color--subtle)",
                        }}
                      >
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </StackItem>
            </Stack>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            key="integrations"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <Stack hasGutter>
              <StackItem>
                <Title headingLevel="h2" size="lg">
                  Connect Your Integrations
                </Title>
                <p style={{ color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.5rem" }}>
                  Select the tools you want to connect. You can always add more later in Settings.
                </p>
              </StackItem>
              <StackItem>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "1rem",
                    maxWidth: "600px",
                  }}
                >
                  {integrations.map((int) => {
                    const isSelected = selectedIntegrations.includes(int.key);
                    return (
                      <div
                        key={int.key}
                        onClick={() => toggleIntegration(int.key)}
                        style={{
                          padding: "1.25rem",
                          borderRadius: "12px",
                          border: `2px solid ${isSelected ? int.color : "var(--pf-t--global--border--color--default)"}`,
                          background: isSelected
                            ? `${int.color}10`
                            : "var(--pf-t--global--background--color--secondary--default)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Flex alignItems={{ default: "alignItemsCenter" }}>
                          <FlexItem>
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                background: int.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: "0.9rem",
                              }}
                            >
                              {int.name.substring(0, 2).toUpperCase()}
                            </div>
                          </FlexItem>
                          <FlexItem flex={{ default: "flex_1" }}>
                            <div style={{ fontWeight: 600 }}>{int.name}</div>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--pf-t--global--text--color--subtle)",
                              }}
                            >
                              {int.description}
                            </div>
                          </FlexItem>
                          <FlexItem>
                            {isSelected && (
                              <Label color="green" isCompact>
                                Selected
                              </Label>
                            )}
                          </FlexItem>
                        </Flex>
                      </div>
                    );
                  })}
                </div>
              </StackItem>
              <StackItem>
                <Alert
                  variant="info"
                  title="You can configure integration credentials in Settings after onboarding"
                  isInline
                  isPlain
                />
              </StackItem>
            </Stack>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="preferences"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <Stack hasGutter>
              <StackItem>
                <Title headingLevel="h2" size="lg">
                  Notification Preferences
                </Title>
                <p style={{ color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.5rem" }}>
                  Choose what you'd like to be notified about. You can change these anytime in Settings.
                </p>
              </StackItem>
              <StackItem>
                <Card>
                  <CardBody>
                    <Stack hasGutter>
                      {[
                        { key: "scan_completed", label: "Scan Completed", desc: "When a repository scan finishes" },
                        { key: "ticket_created", label: "Ticket Created", desc: "When a Jira ticket is created from a suggestion" },
                        { key: "member_joined", label: "Team Changes", desc: "When team members join or leave" },
                        { key: "integration_status", label: "Integration Alerts", desc: "When integrations connect or disconnect" },
                      ].map((pref) => (
                        <StackItem key={pref.key}>
                          <Flex alignItems={{ default: "alignItemsCenter" }} justifyContent={{ default: "justifyContentSpaceBetween" }}>
                            <FlexItem>
                              <div style={{ fontWeight: 600 }}>{pref.label}</div>
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  color: "var(--pf-t--global--text--color--subtle)",
                                }}
                              >
                                {pref.desc}
                              </div>
                            </FlexItem>
                            <FlexItem>
                              <Switch
                                id={`notif-${pref.key}`}
                                label={pref.label}
                                isChecked={notifPrefs[pref.key as keyof typeof notifPrefs]}
                                onChange={(_e, checked) =>
                                  setNotifPrefs((prev) => ({
                                    ...prev,
                                    [pref.key]: checked,
                                  }))
                                }
                              />
                            </FlexItem>
                          </Flex>
                        </StackItem>
                      ))}
                    </Stack>
                  </CardBody>
                </Card>
              </StackItem>
            </Stack>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="complete"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>
                {""}
              </div>
              <Title headingLevel="h2" size="xl">
                You're All Set!
              </Title>
              <p
                style={{
                  marginTop: "1rem",
                  fontSize: "1.1rem",
                  color: "var(--pf-t--global--text--color--subtle)",
                  maxWidth: "450px",
                  margin: "1rem auto 0",
                }}
              >
                Your workspace is ready. Start by scanning your repositories to
                discover work and generate ticket suggestions.
              </p>
              <div style={{ marginTop: "2rem" }}>
                <Stack hasGutter>
                  {selectedIntegrations.length > 0 && (
                    <StackItem>
                      <Flex
                        justifyContent={{ default: "justifyContentCenter" }}
                        spaceItems={{ default: "spaceItemsSm" }}
                      >
                        {selectedIntegrations.map((key) => {
                          const int = integrations.find((i) => i.key === key);
                          return (
                            <FlexItem key={key}>
                              <Label color="blue" isCompact>
                                {int?.name || key}
                              </Label>
                            </FlexItem>
                          );
                        })}
                        <FlexItem>
                          <span
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--pf-t--global--text--color--subtle)",
                            }}
                          >
                            selected - configure in Settings
                          </span>
                        </FlexItem>
                      </Flex>
                    </StackItem>
                  )}
                </Stack>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <PageSection>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <Stack hasGutter>
          {/* Progress bar */}
          <StackItem>
            <Flex justifyContent={{ default: "justifyContentSpaceBetween" }} alignItems={{ default: "alignItemsCenter" }}>
              <FlexItem>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--pf-t--global--text--color--subtle)",
                  }}
                >
                  Step {step + 1} of {STEPS.length}
                </span>
              </FlexItem>
              <FlexItem>
                <span style={{ fontWeight: 600 }}>{STEPS[step].title}</span>
              </FlexItem>
            </Flex>
            <Progress
              value={progress}
              style={{ marginTop: "0.5rem" }}
              aria-label="Onboarding progress"
            />
          </StackItem>

          {/* Step content */}
          <StackItem>
            <Card>
              <CardBody style={{ padding: "2rem" }}>
                <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
              </CardBody>
            </Card>
          </StackItem>

          {/* Navigation buttons */}
          <StackItem>
            <Flex justifyContent={{ default: "justifyContentSpaceBetween" }}>
              <FlexItem>
                {step > 0 && (
                  <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
                    Back
                  </Button>
                )}
              </FlexItem>
              <FlexItem>
                <Flex spaceItems={{ default: "spaceItemsSm" }}>
                  {step < STEPS.length - 1 && (
                    <FlexItem>
                      <Button
                        variant="link"
                        onClick={() => {
                          completeMutation.mutate();
                        }}
                      >
                        Skip for now
                      </Button>
                    </FlexItem>
                  )}
                  <FlexItem>
                    {step < STEPS.length - 1 ? (
                      <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
                        Continue
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => completeMutation.mutate()}
                        isLoading={completeMutation.isPending}
                      >
                        Go to Dashboard
                      </Button>
                    )}
                  </FlexItem>
                </Flex>
              </FlexItem>
            </Flex>
          </StackItem>
        </Stack>
      </div>
    </PageSection>
  );
}
