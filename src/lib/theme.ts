export const THEME_STORAGE_KEY = "wos-theme";
export const SIDEBAR_STORAGE_KEY = "wos-sidebar-collapsed";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

export function applyTheme(preference: ThemePreference, resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.dataset.theme = preference;
  root.dataset.resolved = resolved;
  root.style.colorScheme = resolved;
}

export const THEME_BOOTSTRAP_SCRIPT = `(function(){
  try {
    var key = "${THEME_STORAGE_KEY}";
    var stored = localStorage.getItem(key);
    var pref = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = pref === "system" ? (systemDark ? "dark" : "light") : pref;
    var root = document.documentElement;
    root.dataset.theme = pref;
    root.dataset.resolved = resolved;
    root.style.colorScheme = resolved;
  } catch (e) {}
})();`;
