import { useState } from "react";
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
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  Divider,
  Label,
} from "@patternfly/react-core";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "../NotificationBell/NotificationBell";
import { useAuth } from "../../context/AuthContext";

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
  const { user, isAuthenticated, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const header = (
    <Masthead>
      <MastheadMain>
        <MastheadBrand component="div">
          <span style={{
            fontSize: "var(--pf-t--global--font--size--heading--md)",
            fontWeight: "var(--pf-t--global--font--weight--bold)",
            color: "var(--pf-t--global--text--color--regular)",
            whiteSpace: "nowrap",
          }}>
            DevPulse Pro
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
          <FlexItem>
            <NotificationBell />
          </FlexItem>
          <FlexItem>
            {isAuthenticated && user ? (
              <Dropdown
                isOpen={isUserMenuOpen}
                onSelect={() => setIsUserMenuOpen(false)}
                onOpenChange={setIsUserMenuOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    isExpanded={isUserMenuOpen}
                    variant="plain"
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {user.full_name}
                      {user.subscription && (
                        <Label isCompact color="blue">
                          {user.subscription.plan}
                        </Label>
                      )}
                    </span>
                  </MenuToggle>
                )}
                popperProps={{ position: "right" }}
              >
                <DropdownList>
                  <DropdownItem
                    key="profile"
                    description={user.email}
                    onClick={() => navigate("/settings")}
                  >
                    Profile
                  </DropdownItem>
                  <DropdownItem
                    key="org"
                    description={user.organization?.name}
                    onClick={() => navigate("/settings")}
                  >
                    Organization
                  </DropdownItem>
                  <Divider key="divider" />
                  <DropdownItem
                    key="logout"
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                  >
                    Sign out
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            ) : (
              <Flex spaceItems={{ default: "spaceItemsSm" }}>
                <FlexItem>
                  <a
                    onClick={() => navigate("/login")}
                    style={{ cursor: "pointer", color: "var(--pf-t--global--text--color--link--default)" }}
                  >
                    Sign in
                  </a>
                </FlexItem>
              </Flex>
            )}
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
