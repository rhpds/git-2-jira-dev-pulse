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

const steps = [
  { path: "/", label: "1. Select Repos" },
  { path: "/dashboard", label: "2. Work Dashboard" },
  { path: "/results", label: "3. Results" },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const header = (
    <Masthead>
      <MastheadMain>
        <MastheadBrand>
          <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>
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
                      location.pathname === step.path ? 700 : 400,
                    cursor: "pointer",
                    padding: "4px 12px",
                    fontSize: "0.875rem",
                  }}
                >
                  {step.label}
                </button>
              </ToolbarItem>
            ))}
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
