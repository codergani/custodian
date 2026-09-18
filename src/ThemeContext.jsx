import React, { createContext, useContext, useState, useEffect } from "react";
import { updateNativeStatusBar } from "./native/nativeBridge";

const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("custodian_theme");
    if (saved === "light" || saved === "dark") return saved;
    return "light";
  });

  useEffect(() => {
    localStorage.setItem("custodian_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    updateNativeStatusBar(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
