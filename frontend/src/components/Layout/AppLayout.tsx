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
import { GlobalSearch } from "../GlobalSearch/GlobalSearch";
import { useAuth } from "../../context/AuthContext";
import { CommandPalette } from "../CommandPalette/CommandPalette";
import { ToastNotifications } from "../ToastNotifications/ToastNotifications";
import { useWebSocket } from "../../hooks/useWebSocket";

const baseNavItems = [
  { path: "/", label: "Repositories" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/results", label: "Results" },
  { path: "/history", label: "History" },
  { path: "/activity", label: "Activity" },
  { path: "/standups", label: "Standups" },
  { path: "/flow", label: "Flow" },
  { path: "/impact", label: "Impact" },
  { path: "/health", label: "Health" },
  { path: "/recommendations", label: "Recommendations" },
  { path: "/team", label: "Team" },
  { path: "/integrations", label: "Integrations" },
  { path: "/settings", label: "Settings" },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { toasts, dismissToast, isConnected } = useWebSocket();

  const navItems = user?.role === "superadmin"
    ? [...baseNavItems, { path: "/admin", label: "Admin" }]
    : baseNavItems;

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
            <GlobalSearch />
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
                  <DropdownItem
                    key="shortcuts"
                    description="Keyboard shortcuts"
                    onClick={() => navigate("/shortcuts")}
                  >
                    Shortcuts
                  </DropdownItem>
                  <DropdownItem
                    key="changelog"
                    description="Release notes"
                    onClick={() => navigate("/changelog")}
                  >
                    What's New
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
      <CommandPalette />
      <ToastNotifications toasts={toasts} onDismiss={dismissToast} />
      {isConnected && (
        <div style={{ position: "fixed", bottom: "8px", right: "8px", zIndex: 9990, width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} title="Real-time connected" />
      )}
      <PageSection hasBodyWrapper={false}>
        <Outlet />
      </PageSection>
    </Page>
  );
}
