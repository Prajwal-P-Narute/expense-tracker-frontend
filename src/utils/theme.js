export const THEME_STORAGE_KEY = "et_theme";

export const THEME_OPTIONS = [
  {
    id: "ocean",
    label: "Ocean",
    description: "Cool blue workspace",
    preview: ["#2563eb", "#0ea5e9", "#1e293b"],
  },
  {
    id: "forest",
    label: "Forest",
    description: "Fresh green workspace",
    preview: ["#15803d", "#0f766e", "#14532d"],
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm coral workspace",
    preview: ["#ea580c", "#dc2626", "#7c2d12"],
  },
];

export const DEFAULT_THEME = THEME_OPTIONS[0].id;

export function isValidTheme(theme) {
  return THEME_OPTIONS.some((option) => option.id === theme);
}

export function getInitialTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return isValidTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
}
