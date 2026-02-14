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
  { path: "/settings", label: "Settings" },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const header = (
    <Masthead>
      <MastheadMain>
        <MastheadBrand component="div">
          <span style={{
            fontSize: "var(--pf-t--global--font--size--heading--md)",
            fontWeight: "var(--pf-t--global--font--weight--bold)",
            color: "#ffffff",
            whiteSpace: "nowrap",
          }}>
            Git→Jira
          </span>
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
