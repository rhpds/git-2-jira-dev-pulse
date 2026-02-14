import {
  Masthead,
  MastheadContent,
  MastheadMain,
  MastheadBrand,
  Page,
  PageSection,
  Nav,
  NavList,
  NavItem,
  Flex,
  FlexItem,
  Brand,
} from "@patternfly/react-core";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { path: "/", label: "Repositories" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/results", label: "Results" },
  { path: "/history", label: "History" },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const header = (
    <Masthead>
      <MastheadMain>
        <MastheadBrand component="div">
          <Flex spaceItems={{ default: 'spaceItemsLg' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <Brand
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='50' font-size='40' fill='white'%3EG→J%3C/text%3E%3C/svg%3E"
                alt="Git to Jira"
                style={{ height: '36px' }}
              >
                <span style={{
                  fontSize: "var(--pf-t--global--font--size--heading--md)",
                  fontWeight: "var(--pf-t--global--font--weight--bold)",
                  marginLeft: "var(--pf-t--global--spacer--sm)"
                }}>
                  Git → Jira Dev Pulse
                </span>
              </Brand>
            </FlexItem>
          </Flex>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Flex spaceItems={{ default: 'spaceItemsNone' }} alignItems={{ default: 'alignItemsCenter' }} style={{ width: '100%' }}>
          <FlexItem flex={{ default: 'flex_1' }}>
            <Nav variant="horizontal">
              <NavList>
                {navItems.map((item) => (
                  <NavItem
                    key={item.path}
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                  >
                    {item.label}
                  </NavItem>
                ))}
              </NavList>
            </Nav>
          </FlexItem>
          <FlexItem>
            <ThemeToggle />
          </FlexItem>
        </Flex>
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
