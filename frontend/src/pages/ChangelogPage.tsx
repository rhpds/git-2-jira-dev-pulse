/**
 * ChangelogPage - Release notes and what's new
 */

import {
  PageSection,
  Stack,
  StackItem,
  Title,
  Label,
} from "@patternfly/react-core";
import { motion } from "framer-motion";

interface Release {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  type: "major" | "minor" | "patch";
}

const releases: Release[] = [
  {
    version: "0.13.0",
    date: "2026-02-15",
    title: "Platform Completion",
    type: "major",
    highlights: [
      "Real-time WebSocket notifications with live connection indicator",
      "Sortable list view with virtualized scrolling for large repo sets",
      "AI-powered recommendations engine with confidence scoring",
      "Team collaboration hub - shared annotations, bookmarks, and member management",
      "Mobile responsive layouts for tablet and phone (768px / 480px breakpoints)",
      "Docker multi-stage build and GitHub Actions CI/CD pipeline",
      "Comprehensive deployment configuration with health checks",
    ],
  },
  {
    version: "0.12.0",
    date: "2026-02-15",
    title: "Intelligence Suite",
    type: "major",
    highlights: [
      "AI Standup Generator - auto-generate daily standups and sprint reports from git + Jira activity",
      "Developer Flow State Analytics - detect deep work patterns, peak productivity hours, and interruption tracking",
      "Cross-Repo Impact Intelligence - dependency graph, shared package clusters, and risk hotspot detection",
      "Repo Health Scoring Engine - automated 0-100 health scores with 5-factor analysis and recommendations",
    ],
  },
  {
    version: "0.11.0",
    date: "2026-02-14",
    title: "Productivity Features",
    type: "minor",
    highlights: [
      "Saved filter presets - save and recall your favorite filter configurations",
      "Bulk actions dropdown - export, favorite, or unfavorite multiple repos at once",
      "Keyboard shortcuts reference page with all available shortcuts",
      "Changelog page (you're looking at it!)",
    ],
  },
  {
    version: "0.10.0",
    date: "2026-02-14",
    title: "Favorites, Invitations & Integration Health",
    type: "minor",
    highlights: [
      "Star/favorite repositories for quick access",
      "Shareable team invitation links with expiration and usage limits",
      "Integration health dashboard showing status of Jira, GitHub, Linear, CodeClimate",
      "Webhook delivery retry with exponential backoff tracking",
    ],
  },
  {
    version: "0.9.0",
    date: "2026-02-14",
    title: "Session Management, Command Palette & Reports",
    type: "minor",
    highlights: [
      "Active session management with device tracking and revocation",
      "Command palette (Cmd+K) for fast navigation and actions",
      "Organization report generation (text and JSON formats)",
      "Scheduled scan automation (daily, weekly, monthly)",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-02-14",
    title: "OAuth, Activity Feed, Rate Limiting & 2FA",
    type: "minor",
    highlights: [
      "GitHub OAuth sign-in integration",
      "Activity feed with timeline and filtering",
      "Token bucket rate limiting with per-endpoint limits",
      "TOTP two-factor authentication with QR codes and backup codes",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-02-13",
    title: "Onboarding, Notifications & Account Management",
    type: "minor",
    highlights: [
      "4-step onboarding wizard for new users",
      "Per-type notification preferences",
      "Account danger zone with delete confirmation",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-02-13",
    title: "Admin Dashboard, Analytics & Global Search",
    type: "minor",
    highlights: [
      "Admin dashboard with system stats and user management",
      "Usage analytics with charts and trends",
      "Global search across repos, tickets, users, and integrations",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-02-13",
    title: "Audit Logging, Webhooks & Notification Center",
    type: "minor",
    highlights: [
      "Comprehensive audit logging for all user actions",
      "Webhook management with test delivery and HMAC signing",
      "In-app notification center with bell icon and badge count",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-02-12",
    title: "Dashboard & Data Visualizations",
    type: "minor",
    highlights: [
      "Enhanced work dashboard with analysis insights",
      "Activity heatmap and repo status pie charts (Recharts)",
      "Glassmorphic design system with custom SVG icons",
      "Framer Motion animated transitions throughout the app",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-02-12",
    title: "Team Management & Organizations",
    type: "minor",
    highlights: [
      "Multi-tenant organization support",
      "Team member management with role-based access",
      "Seat limits tied to subscription plans",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-02-11",
    title: "Authentication & Billing",
    type: "minor",
    highlights: [
      "JWT authentication with registration and login",
      "Subscription plans (Free, Pro, Team, Business, Enterprise)",
      "API key management for programmatic access",
      "Feature flags tied to subscription tiers",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-02-10",
    title: "Core Integrations",
    type: "major",
    highlights: [
      "GitHub integration with PR tracking and sync",
      "Linear integration with issue synchronization",
      "CodeClimate integration with quality metrics",
      "Multi-directory repository scanning",
      "Auto-discovery with file system watcher",
    ],
  },
];

const typeColor = (type: string): "blue" | "green" | "orange" => {
  switch (type) {
    case "major": return "blue";
    case "minor": return "green";
    default: return "orange";
  }
};

export default function ChangelogPage() {
  return (
    <PageSection>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h1" size="2xl">
              Changelog
            </Title>
            <p style={{ marginTop: "0.5rem", color: "var(--pf-t--global--text--color--subtle)" }}>
              What's new in DevPulse Pro
            </p>
          </StackItem>

          <StackItem>
            <div style={{ position: "relative", paddingLeft: "2rem" }}>
              {/* Timeline line */}
              <div
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: 0,
                  bottom: 0,
                  width: "2px",
                  background: "var(--pf-t--global--border--color--default)",
                }}
              />

              {releases.map((release, index) => (
                <motion.div
                  key={release.version}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  style={{
                    position: "relative",
                    marginBottom: "2rem",
                    paddingLeft: "1.5rem",
                  }}
                >
                  {/* Timeline dot */}
                  <div
                    style={{
                      position: "absolute",
                      left: "-1.6rem",
                      top: "0.4rem",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: index === 0
                        ? "var(--pf-t--color--blue--40)"
                        : "var(--pf-t--global--border--color--default)",
                      border: "2px solid var(--pf-t--global--background--color--primary--default)",
                    }}
                  />

                  <div
                    style={{
                      padding: "1rem 1.5rem",
                      borderRadius: "8px",
                      border: "1px solid var(--pf-t--global--border--color--default)",
                      background: index === 0
                        ? "var(--pf-t--global--background--color--action--plain--hover)"
                        : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                      <Label color={typeColor(release.type)} isCompact>
                        v{release.version}
                      </Label>
                      <strong>{release.title}</strong>
                      <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                        {release.date}
                      </span>
                    </div>
                    <ul style={{ margin: "0.5rem 0 0 1.25rem", padding: 0, lineHeight: 1.8 }}>
                      {release.highlights.map((h, hi) => (
                        <li
                          key={hi}
                          style={{
                            color: "var(--pf-t--global--text--color--subtle)",
                            fontSize: "0.875rem",
                          }}
                        >
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </StackItem>
        </Stack>
      </motion.div>
    </PageSection>
  );
}
