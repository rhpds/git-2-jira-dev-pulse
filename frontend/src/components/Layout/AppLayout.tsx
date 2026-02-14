import {
  Masthead,
  MastheadContent,
  MastheadMain,
  MastheadBrand,
  Page,
  PageSection,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

const steps = [
  { path: "/", label: "1. Select Repos" },
  { path: "/dashboard", label: "2. Work Dashboard" },
  { path: "/results", label: "3. Results" },
  { path: "/history", label: "History" },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const header = (
    <Masthead>
      <MastheadMain>
        <MastheadBrand>
          <span style={{ fontSize: "var(--pf-t--global--font--size--xl)", fontWeight: "var(--pf-t--global--font--weight--bold)" }}>
            Git &rarr; Jira
          </span>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar>
          <ToolbarContent>
            {steps.map((step) => (
              <ToolbarItem key={step.path}>
                <button
                  onClick={() => navigate(step.path)}
                  style={{
                    background: "none",
                    border: "none",
                    color:
                      location.pathname === step.path
                        ? "var(--pf-t--global--color--brand--default)"
                        : "var(--pf-t--global--text--color--regular)",
                    fontWeight:
                      location.pathname === step.path
                        ? "var(--pf-t--global--font--weight--bold)"
                        : "var(--pf-t--global--font--weight--body--default)",
                    cursor: "pointer",
                    padding: "var(--pf-t--global--spacer--xs) var(--pf-t--global--spacer--sm)",
                    fontSize: "var(--pf-t--global--font--size--body--default)",
                  }}
                >
                  {step.label}
                </button>
              </ToolbarItem>
            ))}
            <ToolbarItem align={{ default: "alignEnd" }}>
              <ThemeToggle />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );

  return (
    <Page masthead={header}>
      <PageSection hasBodyWrapper={false}>
        <Outlet />
      </PageSection>
    </Page>
  );
}
