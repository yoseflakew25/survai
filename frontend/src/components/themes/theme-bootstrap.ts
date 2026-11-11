/** localStorage key shared by ThemeProvider + the FOUC bootstrap script. */
export const THEME_STORAGE_KEY = 'theme';

/** Inline bootstrap for root layout — keeps first paint in sync with storage. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}')||'light';var t=s==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):s;var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.style.colorScheme=t;}catch(e){}})();`;
