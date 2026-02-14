import { Switch } from "@patternfly/react-core";
import { MoonIcon, SunIcon } from "@patternfly/react-icons";
import { useTheme } from "../../hooks/useTheme";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Switch
      id="theme-toggle"
      label={
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isDark ? <MoonIcon /> : <SunIcon />}
          <span>{isDark ? "Dark" : "Light"}</span>
        </span>
      }
      isChecked={isDark}
      onChange={toggleTheme}
      aria-label="Toggle dark mode"
    />
  );
}
