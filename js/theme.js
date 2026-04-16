(function () {
  const toggle = document.getElementById('darkModeToggle');
  if (!toggle) return;

  toggle.addEventListener('click', function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      toggle.setAttribute('aria-label', 'Switch to dark mode');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      toggle.setAttribute('aria-label', 'Switch to light mode');
    }
  });
}());
