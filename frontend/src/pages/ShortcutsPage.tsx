/**
 * ShortcutsPage - Keyboard shortcuts reference
 */

import {
  PageSection,
  Stack,
  StackItem,
  Title,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
} from "@patternfly/react-core";
import { motion } from "framer-motion";

interface ShortcutItem {
  keys: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: "\u2318/Ctrl + K", description: "Open command palette" },
      { keys: "?", description: "Open keyboard shortcuts" },
      { keys: "Escape", description: "Close modals / command palette" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: "G then R", description: "Go to Repositories" },
      { keys: "G then D", description: "Go to Dashboard" },
      { keys: "G then A", description: "Go to Activity Feed" },
      { keys: "G then S", description: "Go to Settings" },
      { keys: "G then I", description: "Go to Integrations" },
    ],
  },
  {
    title: "Repositories",
    shortcuts: [
      { keys: "\u2318/Ctrl + A", description: "Select all visible repos" },
      { keys: "\u2318/Ctrl + Shift + A", description: "Deselect all repos" },
      { keys: "\u2318/Ctrl + E", description: "Export selected repos (CSV)" },
      { keys: "\u2318/Ctrl + Enter", description: "Analyze selected repos" },
    ],
  },
  {
    title: "Command Palette",
    shortcuts: [
      { keys: "\u2191 / \u2193", description: "Navigate commands" },
      { keys: "Enter", description: "Execute selected command" },
      { keys: "Escape", description: "Close palette" },
    ],
  },
];

const Kbd = ({ children }: { children: string }) => (
  <kbd
    style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "4px",
      background: "var(--pf-t--global--background--color--secondary--default)",
      border: "1px solid var(--pf-t--global--border--color--default)",
      fontFamily: "monospace",
      fontSize: "0.8rem",
      lineHeight: "1.6",
      minWidth: "1.5em",
      textAlign: "center",
    }}
  >
    {children}
  </kbd>
);

export default function ShortcutsPage() {
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
              Keyboard Shortcuts
            </Title>
            <p style={{ marginTop: "0.5rem", color: "var(--pf-t--global--text--color--subtle)" }}>
              Keyboard shortcuts to navigate and take actions quickly
            </p>
          </StackItem>

          <StackItem>
            <Grid hasGutter>
              {shortcutGroups.map((group, gi) => (
                <GridItem span={6} key={group.title}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: gi * 0.1 }}
                  >
                    <Card>
                      <CardTitle>{group.title}</CardTitle>
                      <CardBody>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <tbody>
                            {group.shortcuts.map((s, si) => (
                              <tr
                                key={si}
                                style={{
                                  borderBottom:
                                    si < group.shortcuts.length - 1
                                      ? "1px solid var(--pf-t--global--border--color--default)"
                                      : "none",
                                }}
                              >
                                <td style={{ padding: "8px 0", width: "45%" }}>
                                  {s.keys.split(" + ").map((k, ki) => (
                                    <span key={ki}>
                                      {ki > 0 && <span style={{ margin: "0 4px", opacity: 0.5 }}>+</span>}
                                      <Kbd>{k.trim()}</Kbd>
                                    </span>
                                  ))}
                                </td>
                                <td
                                  style={{
                                    padding: "8px 0",
                                    color: "var(--pf-t--global--text--color--subtle)",
                                  }}
                                >
                                  {s.description}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardBody>
                    </Card>
                  </motion.div>
                </GridItem>
              ))}
            </Grid>
          </StackItem>
        </Stack>
      </motion.div>
    </PageSection>
  );
}
