/**
 * Design System Test Page
 * Showcases glassmorphic components and custom icons
 */

import { Stack, StackItem, Title, Grid, GridItem } from "@patternfly/react-core";
import { GlassCard } from "../components/GlassCard/GlassCard";
import {
  PulseIcon,
  CodeFlowIcon,
  ActivityBurstIcon,
  RepoIdentityIcon,
  DataFlowIcon,
  NetworkIcon,
  StatusIcon,
} from "../components/CustomIcons";
import { ActivityHeatmap, RepoStatusPie } from "../components/Visualizations";
import { RepoInfo } from "../api/types";

// Mock data for visualizations
const mockRepos: RepoInfo[] = [
  { name: "agnosticd", path: "/repos/agnosticd", current_branch: "main", status: "dirty", uncommitted_count: 5, recent_commit_count: 30, has_remote: true },
  { name: "jira-mcp", path: "/repos/jira-mcp", current_branch: "main", status: "clean", uncommitted_count: 0, recent_commit_count: 25, has_remote: true },
  { name: "git-2-jira", path: "/repos/git-2-jira", current_branch: "main", status: "dirty", uncommitted_count: 12, recent_commit_count: 20, has_remote: true },
  { name: "aiops-skills", path: "/repos/aiops-skills", current_branch: "webapp-ui", status: "dirty", uncommitted_count: 8, recent_commit_count: 18, has_remote: true },
  { name: "rhpds-utils", path: "/repos/rhpds-utils", current_branch: "main", status: "clean", uncommitted_count: 0, recent_commit_count: 15, has_remote: true },
  { name: "automation", path: "/repos/automation", current_branch: "dev", status: "dirty", uncommitted_count: 3, recent_commit_count: 12, has_remote: true },
  { name: "infra", path: "/repos/infra", current_branch: "main", status: "clean", uncommitted_count: 0, recent_commit_count: 10, has_remote: true },
  { name: "workshops", path: "/repos/workshops", current_branch: "main", status: "clean", uncommitted_count: 0, recent_commit_count: 8, has_remote: true },
  { name: "temp-project", path: "/repos/temp", current_branch: "main", status: "dirty", uncommitted_count: 1, recent_commit_count: 5, has_remote: false },
  { name: "test-repo", path: "/repos/test", current_branch: "main", status: "clean", uncommitted_count: 0, recent_commit_count: 3, has_remote: false },
];

export default function DesignTestPage() {
  return (
    <div className="glass-page" style={{ padding: '2rem', minHeight: '100vh' }}>
      <Stack hasGutter>
        {/* Header */}
        <StackItem>
          <Title headingLevel="h1" size="2xl" className="text-gradient">
            Glassmorphic Design System
          </Title>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: '0.5rem' }}>
            Modern, frosted-glass aesthetic with vibrant gradients
          </p>
        </StackItem>

        {/* Data Visualizations Section */}
        <StackItem>
          <Title headingLevel="h2" size="xl" style={{ color: 'white', marginBottom: '1rem' }}>
            Data Visualizations
          </Title>
          <Grid hasGutter>
            <GridItem span={8}>
              <ActivityHeatmap repos={mockRepos} height={350} />
            </GridItem>
            <GridItem span={4}>
              <RepoStatusPie repos={mockRepos} height={350} />
            </GridItem>
          </Grid>
        </StackItem>

        {/* Glass Cards Section */}
        <StackItem>
          <Title headingLevel="h2" size="xl" style={{ color: 'white', marginBottom: '1rem' }}>
            Glass Cards
          </Title>
          <Grid hasGutter>
            <GridItem span={4}>
              <GlassCard variant="default">
                <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Default Card</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Basic glassmorphic card with hover effect
                </p>
              </GlassCard>
            </GridItem>

            <GridItem span={4}>
              <GlassCard variant="gradient" gradient="primary">
                <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Gradient Card</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Card with gradient overlay
                </p>
              </GlassCard>
            </GridItem>

            <GridItem span={4}>
              <GlassCard variant="border-gradient" gradient="success">
                <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Border Gradient</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Card with gradient border
                </p>
              </GlassCard>
            </GridItem>

            <GridItem span={4}>
              <GlassCard variant="strong" pulse>
                <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Strong + Pulse</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Stronger glass with pulsing glow
                </p>
              </GlassCard>
            </GridItem>

            <GridItem span={4}>
              <GlassCard variant="gradient" gradient="warning" float>
                <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Floating Card</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Card with floating animation
                </p>
              </GlassCard>
            </GridItem>

            <GridItem span={4}>
              <GlassCard variant="border-gradient" gradient="info">
                <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Info Gradient</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Info color variant
                </p>
              </GlassCard>
            </GridItem>
          </Grid>
        </StackItem>

        {/* Custom Icons Section */}
        <StackItem>
          <Title headingLevel="h2" size="xl" style={{ color: 'white', marginBottom: '1rem' }}>
            Custom Icons
          </Title>
          <GlassCard variant="gradient" gradient="primary">
            <Grid hasGutter>
              <GridItem span={3}>
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <PulseIcon size={48} color="white" />
                  <p style={{ color: 'white', marginTop: '0.5rem' }}>Pulse Icon</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Activity heartbeat</p>
                </div>
              </GridItem>

              <GridItem span={3}>
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <CodeFlowIcon size={48} color="white" />
                  <p style={{ color: 'white', marginTop: '0.5rem' }}>Code Flow</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Branching flow</p>
                </div>
              </GridItem>

              <GridItem span={3}>
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <ActivityBurstIcon size={48} color="white" />
                  <p style={{ color: 'white', marginTop: '0.5rem' }}>Activity Burst</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Bursts of activity</p>
                </div>
              </GridItem>

              <GridItem span={3}>
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <RepoIdentityIcon size={48} color="white" />
                  <p style={{ color: 'white', marginTop: '0.5rem' }}>Repo Identity</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Unique marker</p>
                </div>
              </GridItem>

              <GridItem span={3}>
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <DataFlowIcon size={48} color="white" />
                  <p style={{ color: 'white', marginTop: '0.5rem' }}>Data Flow</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Commit flow</p>
                </div>
              </GridItem>

              <GridItem span={3}>
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <NetworkIcon size={48} color="white" />
                  <p style={{ color: 'white', marginTop: '0.5rem' }}>Network</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Connected repos</p>
                </div>
              </GridItem>

              <GridItem span={3}>
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <StatusIcon status="clean" size={48} />
                  <p style={{ color: 'white', marginTop: '0.5rem' }}>Status: Clean</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>No changes</p>
                </div>
              </GridItem>

              <GridItem span={3}>
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <StatusIcon status="dirty" size={48} />
                  <p style={{ color: 'white', marginTop: '0.5rem' }}>Status: Dirty</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Has changes</p>
                </div>
              </GridItem>
            </Grid>
          </GlassCard>
        </StackItem>

        {/* Gradient Text Section */}
        <StackItem>
          <Title headingLevel="h2" size="xl" style={{ color: 'white', marginBottom: '1rem' }}>
            Gradient Text
          </Title>
          <GlassCard>
            <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '1rem' }}>
              Primary Gradient Text
            </h2>
            <h2 className="text-gradient-success" style={{ fontSize: '2rem', marginBottom: '1rem' }}>
              Success Gradient Text
            </h2>
            <h2 className="text-gradient-warning" style={{ fontSize: '2rem' }}>
              Warning Gradient Text
            </h2>
          </GlassCard>
        </StackItem>

        {/* Interactive Elements */}
        <StackItem>
          <Title headingLevel="h2" size="xl" style={{ color: 'white', marginBottom: '1rem' }}>
            Interactive Elements
          </Title>
          <GlassCard>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="glass-button">Default Button</button>
              <button className="glass-button glass-button-gradient">Gradient Button</button>
              <input className="glass-input" placeholder="Glass input..." />
              <span className="glass-badge">Badge</span>
            </div>
          </GlassCard>
        </StackItem>
      </Stack>
    </div>
  );
}
