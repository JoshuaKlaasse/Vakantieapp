const API_BASE = 'https://opendata.rijksoverheid.nl/v1/infotypes/schoolholidays/schoolyear';

const EMOJI_MAP = {
  herfstvakantie: '🍂',
  kerstvakantie: '❄️',
  voorjaarsvakantie: '🌸',
  meivakantie: '🌷',
  zomervakantie: '☀️',
};

// Parses "2025-10-18T00:00:00.000Z" → local midnight Date, avoids timezone drift
export function parseApiDate(iso) {
  const [y, m, d] = iso.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export async function fetchHolidays(schoolYear) {
  const res = await fetch(`${API_BASE}/${schoolYear}?output=json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const vacations = json.content[0].vacations;
  const result = { Noord: [], Midden: [], Zuid: [] };

  for (const vacation of vacations) {
    const name = vacation.type.trim();
    const emoji = EMOJI_MAP[name.toLowerCase()] ?? '📅';

    for (const r of vacation.regions) {
      const region = r.region.trim().toLowerCase();
      const start = parseApiDate(r.startdate);
      const end = parseApiDate(r.enddate);
      const holiday = { name, emoji, start, end };

      if (region === 'heel nederland') {
        result.Noord.push(holiday);
        result.Midden.push({ ...holiday });
        result.Zuid.push({ ...holiday });
      } else if (region === 'noord') {
        result.Noord.push(holiday);
      } else if (region === 'midden') {
        result.Midden.push(holiday);
      } else if (region.startsWith('z')) {
        // API returns 'zuid' (lowercase) — startsWith('z') is case-safe
        result.Zuid.push(holiday);
      }
    }
  }

  return result;
}

// Serialize Date objects → ISO strings for AsyncStorage
export function serializeHolidayData(data) {
  const out = {};
  for (const [region, list] of Object.entries(data)) {
    out[region] = list.map(h => ({ ...h, start: h.start.toISOString(), end: h.end.toISOString() }));
  }
  return out;
}

export function deserializeHolidayData(data) {
  const out = {};
  for (const [region, list] of Object.entries(data)) {
    out[region] = list.map(h => ({ ...h, start: parseApiDate(h.start), end: parseApiDate(h.end) }));
  }
  return out;
}
