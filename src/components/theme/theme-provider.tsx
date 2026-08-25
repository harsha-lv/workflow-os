"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  isThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : "system";
}

function systemIsDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof document === "undefined") return "system";
    const current = document.documentElement.dataset.theme ?? null;
    return isThemePreference(current) ? current : "system";
  });
  const [resolved, setResolved] = useState<ResolvedTheme>(() => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.dataset.resolved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const pref = readPreference();
      if (pref !== "system") return;
      const next = resolveTheme("system", media.matches);
      setResolved(next);
      applyTheme("system", next);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    const resolvedNext = resolveTheme(next, systemIsDark());
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    setPreferenceState(next);
    setResolved(resolvedNext);
    applyTheme(next, resolvedNext);
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <Toaster
        theme={resolved}
        position="bottom-right"
        visibleToasts={4}
        offset={16}
        toastOptions={{
          className: "wos-toast",
          duration: 3600,
        }}
      />
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      preference: "system",
      resolved: "dark",
      setPreference: () => undefined,
    };
  }
  return ctx;
}
