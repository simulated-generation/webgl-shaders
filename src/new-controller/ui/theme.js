export function createThemeController({ body, button }) {
  function setTheme(isDark) {
    body.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");

    button.classList.toggle("is-active", isDark);
    button.setAttribute("aria-label", isDark ? "Enable light mode" : "Enable dark mode");
    button.setAttribute("title", isDark ? "Light" : "Dark");
  }

  function init() {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;

    setTheme(isDark);

    button.addEventListener("click", () => {
      setTheme(!body.classList.contains("dark"));
    });
  }

  return { init, setTheme };
}
