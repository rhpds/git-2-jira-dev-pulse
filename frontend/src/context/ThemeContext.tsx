/**
 * Theme Context Provider
 * Manages current theme and dynamically injects theme CSS
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getConfig, getThemeCSS, updateUIPreferences } from "../api/client";

interface ThemeContextType {
  currentTheme: string;
  setTheme: (themeId: string) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [currentTheme, setCurrentTheme] = useState<string>("standard");
  const [themeStyleElement, setThemeStyleElement] = useState<HTMLStyleElement | null>(null);

  // Load config to get current theme
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
  });

  // Load theme CSS when theme changes
  const { data: themeCSS, isLoading } = useQuery({
    queryKey: ["theme-css", currentTheme],
    queryFn: () => getThemeCSS(currentTheme),
    enabled: !!currentTheme,
  });

  // Update current theme from config
  useEffect(() => {
    if (config?.ui.theme && config.ui.theme !== currentTheme) {
      setCurrentTheme(config.ui.theme);
    }
  }, [config, currentTheme]);

  // Inject theme CSS into document
  useEffect(() => {
    if (!themeCSS?.css) return;

    // Remove old style element
    if (themeStyleElement) {
      themeStyleElement.remove();
    }

    // Create new style element
    const style = document.createElement("style");
    style.id = `theme-${currentTheme}`;
    style.textContent = themeCSS.css;
    document.head.appendChild(style);
    setThemeStyleElement(style);

    // Set theme attribute on root element
    document.documentElement.setAttribute("data-theme", currentTheme);

    // Cleanup
    return () => {
      if (style.parentNode) {
        style.remove();
      }
    };
  }, [themeCSS, currentTheme]);

  const setTheme = async (themeId: string) => {
    // Update state first for immediate UI feedback
    setCurrentTheme(themeId);

    // Update config on backend
    if (config) {
      try {
        await updateUIPreferences({
          ...config.ui,
          theme: themeId,
        });
        // Wait a bit for backend to persist
        await new Promise(resolve => setTimeout(resolve, 100));
        // Now invalidate queries to refetch with new values
        queryClient.invalidateQueries({ queryKey: ["config"] });
      } catch (error) {
        console.error("Failed to update theme:", error);
        // Revert state on error
        setCurrentTheme(config.ui.theme);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, loading: isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
