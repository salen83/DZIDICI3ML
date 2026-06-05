const COUNTRY_MAP = {
  "CO": { iso: "CO", label: "Colombia", flag: "co" },
  "UZ": { iso: "UZ", label: "Uzbekistan", flag: "uz" },
  "TZ": { iso: "TZ", label: "Zanzibar", flag: "tz" },
  "SA": { iso: "SA", label: "South America", flag: "sa" },
  "ET": { iso: "ET", label: "Ethiopia", flag: "et" },
  "IS": { iso: "IS", label: "Iceland", flag: "is" },
  "LV": { iso: "LV", label: "Latvia", flag: "lv" },
  "RW": { iso: "RW", label: "Rwanda", flag: "rw" },
  "SL": { iso: "SL", label: "Sierra Leone", flag: "sl" },
  "BA": { iso: "BA", label: "Bosnia & Herzegovina", flag: "ba" },
  "AM": { iso: "AM", label: "Armenia", flag: "am" },
  "IL": { iso: "IL", label: "Israel", flag: "il" },
  "IE": { iso: "IE", label: "Ireland", flag: "ie" },
  "BR": { iso: "BR", label: "Brazil", flag: "br" },
  "AR": { iso: "AR", label: "Argentina", flag: "ar" },
  "AU": { iso: "AU", label: "Australia", flag: "au" },
  "AT": { iso: "AT", label: "Austria", flag: "at" },
  "BE": { iso: "BE", label: "Belgium", flag: "be" },
  "CN": { iso: "CN", label: "China", flag: "cn" },
  "HR": { iso: "HR", label: "Croatia", flag: "hr" },
  "DK": { iso: "DK", label: "Denmark", flag: "dk" },
  "EC": { iso: "EC", label: "Ecuador", flag: "ec" },
  "FI": { iso: "FI", label: "Finland", flag: "fi" },
  "FR": { iso: "FR", label: "France", flag: "fr" },
  "DE": { iso: "DE", label: "Germany", flag: "de" },
  "IT": { iso: "IT", label: "Italy", flag: "it" },
  "JP": { iso: "JP", label: "Japan", flag: "jp" },
  "LT": { iso: "LT", label: "Lithuania", flag: "lt" },
  "NL": { iso: "NL", label: "Netherlands", flag: "nl" },
  "NO": { iso: "NO", label: "Norway", flag: "no" },
  "PL": { iso: "PL", label: "Poland", flag: "pl" },
  "PT": { iso: "PT", label: "Portugal", flag: "pt" },
  "PY": { iso: "PY", label: "Paraguay", flag: "py" },
  "RS": { iso: "RS", label: "Serbia", flag: "rs" },
  "ES": { iso: "ES", label: "Spain", flag: "es" },
  "SE": { iso: "SE", label: "Sweden", flag: "se" },
  "TR": { iso: "TR", label: "Turkey", flag: "tr" },
  "UA": { iso: "UA", label: "Ukraine", flag: "ua" },
  "US": { iso: "US", label: "United States", flag: "us" },

  "GB-ENG": {
    iso: "GB-ENG",
    label: "England",
    flag: "gb-eng"
  },

  "GB-SCT": {
    iso: "GB-SCT",
    label: "Scotland",
    flag: "gb-sct"
  },

  "GB-WLS": {
    iso: "GB-WLS",
    label: "Wales",
    flag: "gb-wls"
  },

  "GB-NIR": {
    iso: "GB-NIR",
    label: "Northern Ireland",
    flag: "gb-nir"
  }
};
export function getCountryMeta(country) {
  if (!country) return null;

const meta = COUNTRY_MAP[country];

if (meta) return meta;

return {
  iso: country,
  label: country,
  flag: "" // nema zastavice ali ne puca UI
};
}
export function getCountryIso(country) {
  return getCountryMeta(country)?.iso || "";
}

export function getCountryFlag(country) {
  return getCountryMeta(country)?.flag || "";
}

export function getCountryLabel(country) {
  return getCountryMeta(country)?.label || country;
}

export function getFlagUrl(country, size = 24) {
  const flag = getCountryFlag(country);
  if (!flag) return "";
  return `https://flagcdn.com/${size}x${Math.round(size * 0.75)}/${flag}.png`;
}
