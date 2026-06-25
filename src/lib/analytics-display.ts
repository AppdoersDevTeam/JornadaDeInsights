const LOCALHOST_PATTERN = /localhost|127\.0\.0\.1/i;

let countryDisplayNames: Intl.DisplayNames | null = null;

function getCountryDisplayNames(): Intl.DisplayNames | null {
  if (countryDisplayNames) return countryDisplayNames;
  try {
    countryDisplayNames = new Intl.DisplayNames(['pt'], { type: 'region' });
    return countryDisplayNames;
  } catch {
    return null;
  }
}

export function isLocalhostTraffic(value: string | null | undefined): boolean {
  if (!value) return false;
  return LOCALHOST_PATTERN.test(value);
}

export function formatCountryName(code: string): string {
  if (!code || code === 'Unknown') return 'Desconhecido';
  const displayNames = getCountryDisplayNames();
  return displayNames?.of(code) ?? code;
}
