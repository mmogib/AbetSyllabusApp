export function readSessionString(key: string): string {
  try {
    return window.sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

export function writeSessionString(key: string, value: string): void {
  try {
    const trimmed = value.trim();

    if (trimmed === '') {
      window.sessionStorage.removeItem(key);
      return;
    }

    window.sessionStorage.setItem(key, trimmed);
  } catch {
    // Fail closed in static/browser-restricted environments.
  }
}
