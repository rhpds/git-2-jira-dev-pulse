/**
 * Billing & Subscription Tab
 * Manage subscription plans, view usage, and access billing portal
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
  Grid,
  GridItem,
  List,
  ListItem,
  Spinner,
  Progress,
  ProgressMeasureLocation,
} from "@patternfly/react-core";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  getBillingOverview,
  createCheckout,
  openCustomerPortal,
  getStripeStatus,
  type PlanInfo,
} from "../../api/auth";
import { useAuth } from "../../context/AuthContext";

export function BillingTab() {
  const { user } = useAuth();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { data: overview, isLoading } = useQuery({
    queryKey: ["billing-overview"],
    queryFn: getBillingOverview,
  });

  const { data: stripeStatus } = useQuery({
    queryKey: ["stripe-status"],
    queryFn: getStripeStatus,
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ plan, period }: { plan: string; period: string }) =>
      createCheckout(plan, period),
    onSuccess: (result) => {
      window.location.href = result.checkout_url;
    },
    onError: (error: any) => {
      setErrorMessage(
        error.response?.data?.detail || "Failed to create checkout session"
      );
    },
  });

  const portalMutation = useMutation({
    mutationFn: openCustomerPortal,
    onSuccess: (result) => {
      window.location.href = result.portal_url;
    },
    onError: (error: any) => {
      setErrorMessage(
        error.response?.data?.detail || "Failed to open billing portal"
      );
    },
  });

  const getPlanColor = (planId: string): string => {
    const colors: Record<string, string> = {
      free: "grey",
      pro: "blue",
      team: "green",
      business: "purple",
      enterprise: "gold",
    };
    return colors[planId] || "grey";
  };

  const formatLimit = (value: number): string => {
    return value === -1 ? "Unlimited" : String(value);
  };

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
          Loading billing information...
        </p>
      </div>
    );
  }

  const currentPlan = overview?.subscription?.plan || "free";
  const usage = overview?.usage;

  return (
    <Stack hasGutter>
      {/* Success/Error Alerts */}
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

      {/* Current Plan Card */}
      <StackItem>
        <Card>
          <CardTitle>Current Subscription</CardTitle>
          <CardBody>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                    {overview?.subscription?.plan_name || "Free"} Plan
                  </span>
                  <Label color={getPlanColor(currentPlan)}>
                    {overview?.subscription?.status || "active"}
                  </Label>
                </div>
                {overview?.subscription?.current_period_end && (
                  <p
                    style={{
                      marginTop: "0.5rem",
                      color: "var(--pf-t--global--text--color--subtle)",
                    }}
                  >
                    Renews on{" "}
                    {new Date(
                      overview.subscription.current_period_end
                    ).toLocaleDateString()}
                  </p>
                )}
                {overview?.subscription?.cancel_at && (
                  <p
                    style={{
                      marginTop: "0.5rem",
                      color: "var(--pf-t--color--red--40)",
                    }}
                  >
                    Cancels on{" "}
                    {new Date(
                      overview.subscription.cancel_at
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>
              {stripeStatus?.configured &&
                currentPlan !== "free" && (
                  <Button
                    variant="secondary"
                    onClick={() => portalMutation.mutate()}
                    isLoading={portalMutation.isPending}
                  >
                    Manage Billing
                  </Button>
                )}
            </div>
          </CardBody>
        </Card>
      </StackItem>

      {/* Usage Card */}
      {usage && (
        <StackItem>
          <Card>
            <CardTitle>Usage</CardTitle>
            <CardBody>
              <Grid hasGutter>
                <GridItem span={4}>
                  <div style={{ marginBottom: "1rem" }}>
                    <strong>Repositories</strong>
                    <Progress
                      value={
                        usage.repos_limit === -1
                          ? 0
                          : (usage.repos_scanned / usage.repos_limit) * 100
                      }
                      title={`${usage.repos_scanned} / ${formatLimit(usage.repos_limit)}`}
                      measureLocation={ProgressMeasureLocation.outside}
                      style={{ marginTop: "0.5rem" }}
                    />
                  </div>
                </GridItem>
                <GridItem span={4}>
                  <div style={{ marginBottom: "1rem" }}>
                    <strong>Integrations</strong>
                    <Progress
                      value={
                        usage.integrations_limit === -1
                          ? 0
                          : (usage.integrations_active /
                              usage.integrations_limit) *
                            100
                      }
                      title={`${usage.integrations_active} / ${formatLimit(usage.integrations_limit)}`}
                      measureLocation={ProgressMeasureLocation.outside}
                      style={{ marginTop: "0.5rem" }}
                    />
                  </div>
                </GridItem>
                <GridItem span={4}>
                  <div style={{ marginBottom: "1rem" }}>
                    <strong>Team Members</strong>
                    <Progress
                      value={
                        usage.seats_limit === -1
                          ? 0
                          : (usage.seats_used / usage.seats_limit) * 100
                      }
                      title={`${usage.seats_used} / ${formatLimit(usage.seats_limit)}`}
                      measureLocation={ProgressMeasureLocation.outside}
                      style={{ marginTop: "0.5rem" }}
                    />
                  </div>
                </GridItem>
              </Grid>
            </CardBody>
          </Card>
        </StackItem>
      )}

      {/* Plans Grid */}
      <StackItem>
        <Card>
          <CardTitle>Available Plans</CardTitle>
          <CardBody>
            <Grid hasGutter>
              {overview?.plans.map((plan: PlanInfo) => (
                <GridItem key={plan.id} span={4}>
                  <Card
                    isCompact
                    style={{
                      border: plan.is_current
                        ? "2px solid var(--pf-t--global--border--color--status--info--default)"
                        : undefined,
                    }}
                  >
                    <CardBody>
                      <div style={{ textAlign: "center", padding: "1rem 0" }}>
                        <Label color={getPlanColor(plan.id)}>
                          {plan.name}
                        </Label>
                        <div
                          style={{
                            fontSize: "2rem",
                            fontWeight: 700,
                            margin: "1rem 0 0.5rem",
                          }}
                        >
                          ${plan.price_monthly}
                          <span
                            style={{
                              fontSize: "0.9rem",
                              fontWeight: 400,
                              color:
                                "var(--pf-t--global--text--color--subtle)",
                            }}
                          >
                            /mo
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            color:
                              "var(--pf-t--global--text--color--subtle)",
                            marginBottom: "1rem",
                          }}
                        >
                          {formatLimit(plan.repos)} repos |{" "}
                          {formatLimit(plan.seats)} seats |{" "}
                          {formatLimit(plan.integrations)} integrations
                        </p>

                        {plan.is_current ? (
                          <Button variant="secondary" isDisabled isBlock>
                            Current Plan
                          </Button>
                        ) : plan.id === "free" ? (
                          <Button variant="tertiary" isDisabled isBlock>
                            Free Forever
                          </Button>
                        ) : stripeStatus?.configured ? (
                          <Button
                            variant="primary"
                            isBlock
                            onClick={() =>
                              checkoutMutation.mutate({
                                plan: plan.id,
                                period: "monthly",
                              })
                            }
                            isLoading={checkoutMutation.isPending}
                          >
                            Upgrade
                          </Button>
                        ) : (
                          <Button variant="secondary" isDisabled isBlock>
                            Contact Sales
                          </Button>
                        )}
                      </div>

                      <List isPlain style={{ fontSize: "0.85rem" }}>
                        {plan.features.slice(0, 6).map((feature) => (
                          <ListItem key={feature}>
                            {feature.replace(/_/g, " ")}
                          </ListItem>
                        ))}
                        {plan.features.length > 6 && (
                          <ListItem>
                            +{plan.features.length - 6} more features
                          </ListItem>
                        )}
                      </List>
                    </CardBody>
                  </Card>
                </GridItem>
              ))}
            </Grid>
          </CardBody>
        </Card>
      </StackItem>
    </Stack>
  );
}
