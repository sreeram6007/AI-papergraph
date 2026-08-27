import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("papergraph-theme");
    if (saved === "dark" || saved === "light") return saved;
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("papergraph-theme", theme);
    window.dispatchEvent(new CustomEvent("papergraph-theme-change", { detail: { theme } }));
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="paper-theme-toggle"
      title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
      aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun size={17} className="text-amber-400" />
      ) : (
        <Moon size={17} className="text-[#202522]" />
      )}
      <span className="paper-theme-toggle-label">{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
};

export default ThemeToggle;
