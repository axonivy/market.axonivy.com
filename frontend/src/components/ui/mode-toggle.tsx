import * as React from "react";
import { Button } from "@/components/ui/button";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useIsVscode } from "@/data/designer";
import { useTranslation } from "react-i18next";
import "@/translation/ui";
import type { Lang } from "@/translation/ui";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return getSystemTheme();
}

export function ModeToggle({ lang }: { lang: Lang }) {
  const isVscode = useIsVscode();
  const { t } = useTranslation(undefined, { lng: lang });
  const [theme, setTheme] = React.useState<Theme>(getInitialTheme);

  React.useEffect(() => {
    if (isVscode || document.documentElement.dataset.vscode !== undefined) {
      return;
    }
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [isVscode, theme]);

  React.useEffect(() => {
    if (isVscode || document.documentElement.dataset.vscode !== undefined) {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [isVscode]);

  if (isVscode) {
    return null;
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      <IconSun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <IconMoon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">{t("ariaLabels.toggleTheme")}</span>
    </Button>
  );
}
