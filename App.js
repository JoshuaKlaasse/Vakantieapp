import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// ─── API ──────────────────────────────────────────────────────────
const API_BASE = 'https://opendata.rijksoverheid.nl/v1/infotypes/schoolholidays/schoolyear';

const EMOJI_MAP = {
  herfstvakantie: '🍂',
  kerstvakantie: '❄️',
  voorjaarsvakantie: '🌸',
  meivakantie: '🌷',
  zomervakantie: '☀️',
};

// Parses "2025-10-18T00:00:00.000Z" → local midnight Date, avoids timezone drift
function parseApiDate(iso) {
  const [y, m, d] = iso.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

async function fetchHolidays(schoolYear) {
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
        result.Zuid.push(holiday);
      }
    }
  }

  return result;
}

// Serialize Date objects → ISO strings for AsyncStorage
function serializeHolidayData(data) {
  const out = {};
  for (const [region, list] of Object.entries(data)) {
    out[region] = list.map(h => ({ ...h, start: h.start.toISOString(), end: h.end.toISOString() }));
  }
  return out;
}

function deserializeHolidayData(data) {
  const out = {};
  for (const [region, list] of Object.entries(data)) {
    out[region] = list.map(h => ({ ...h, start: parseApiDate(h.start), end: parseApiDate(h.end) }));
  }
  return out;
}

// ─── Constants ───────────────────────────────────────────────────
const SCHOOL_YEARS = ['2024-2025', '2025-2026', '2026-2027'];
const MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MONTHS_LONG = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

// ─── Helpers ─────────────────────────────────────────────────────
function formatShort(date) {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

function formatLong(date) {
  return `${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

function defaultSchoolYear() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function getCountdownInfo(holidays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const h of holidays) {
    const start = new Date(h.start); start.setHours(0, 0, 0, 0);
    const end = new Date(h.end); end.setHours(0, 0, 0, 0);
    const dayAfter = new Date(end); dayAfter.setDate(dayAfter.getDate() + 1);

    if (today >= start && today < dayAfter) {
      return { holiday: h, daysUntil: 0, daysLeft: daysBetween(today, dayAfter), isActive: true };
    }
    if (start > today) {
      return { holiday: h, daysUntil: daysBetween(today, start), daysLeft: 0, isActive: false };
    }
  }
  return null;
}

function getHolidayStatus(holiday) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(holiday.start); start.setHours(0, 0, 0, 0);
  const end = new Date(holiday.end); end.setHours(0, 0, 0, 0);
  const dayAfter = new Date(end); dayAfter.setDate(dayAfter.getDate() + 1);

  if (today < start) return 'upcoming';
  if (today < dayAfter) return 'active';
  return 'past';
}

function latToRegion(lat) {
  if (lat >= 52.5) return 'Noord';
  if (lat >= 51.5) return 'Midden';
  return 'Zuid';
}

// ─── Screens ─────────────────────────────────────────────────────
function OverviewScreen({ holidays, isLandscape }) {
  return (
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={[styles.overviewContent, isLandscape && styles.overviewContentLandscape]}
      showsVerticalScrollIndicator={false}
    >
      {holidays.map((h, i) => {
        const status = getHolidayStatus(h);
        return (
          <View
            key={i}
            style={[
              styles.holidayCard,
              status === 'active' && styles.holidayCardActive,
              status === 'past' && styles.holidayCardPast,
              isLandscape && styles.holidayCardLandscape,
            ]}
          >
            <View style={styles.holidayCardLeft}>
              <Text style={styles.holidayEmoji}>{h.emoji}</Text>
              <View>
                <Text style={[styles.holidayName, status === 'past' && styles.textMuted]}>{h.name}</Text>
                <Text style={[styles.holidayDates, status === 'past' && styles.textMuted]}>
                  {formatShort(h.start)} – {formatShort(h.end)}
                </Text>
              </View>
            </View>
            <View style={styles.holidayCardRight}>
              {status === 'active' && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Nu!</Text>
                </View>
              )}
              {status === 'upcoming' && (() => {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const start = new Date(h.start); start.setHours(0, 0, 0, 0);
                return (
                  <View style={styles.daysChip}>
                    <Text style={styles.daysChipNumber}>{daysBetween(today, start)}</Text>
                    <Text style={styles.daysChipLabel}>dagen</Text>
                  </View>
                );
              })()}
              {status === 'past' && <Text style={styles.pastLabel}>Voorbij</Text>}
            </View>
          </View>
        );
      })}
      <View style={styles.scrollPad} />
    </ScrollView>
  );
}

function CountdownScreen({ holidays, isLandscape }) {
  const info = getCountdownInfo(holidays);

  if (!info) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noVacationText}>Geen vakantie meer dit schooljaar 😊</Text>
      </View>
    );
  }

  const { holiday, daysUntil, daysLeft, isActive } = info;
  const circleColor = isActive ? '#16a34a' : '#ea580c';
  const circleBg = isActive ? '#dcfce7' : '#fff7ed';
  const count = isActive ? daysLeft : daysUntil;
  const label = isActive ? 'dagen over' : 'dagen';

  const details = isActive ? (
    <>
      <Text style={styles.countdownTitle}>Je bent op vakantie! 🎉</Text>
      <Text style={styles.countdownSubtitle}>{holiday.name}</Text>
      <Text style={styles.countdownDate}>nog tot {formatLong(holiday.end)}</Text>
    </>
  ) : (
    <>
      <Text style={styles.countdownTitle}>{holiday.name}</Text>
      <Text style={styles.countdownDate}>begint {formatLong(holiday.start)}</Text>
    </>
  );

  if (isLandscape) {
    return (
      <View style={styles.countdownLandscape}>
        <View style={[styles.countdownCircle, { backgroundColor: circleBg, borderColor: circleColor }]}>
          <Text style={[styles.countdownNumber, { color: circleColor }]}>{count}</Text>
          <Text style={[styles.countdownLabel, { color: circleColor }]}>{label}</Text>
        </View>
        <View style={styles.countdownInfo}>
          <Text style={styles.countdownEmoji}>{holiday.emoji}</Text>
          {details}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.countdownPortrait}>
      <View style={[styles.countdownCircle, { backgroundColor: circleBg, borderColor: circleColor }]}>
        <Text style={[styles.countdownNumber, { color: circleColor }]}>{count}</Text>
        <Text style={[styles.countdownLabel, { color: circleColor }]}>{label}</Text>
      </View>
      <Text style={styles.countdownEmoji}>{holiday.emoji}</Text>
      {details}
    </View>
  );
}

function SettingsScreen({ region, schoolYear, onSave, onGps }) {
  const [tempRegion, setTempRegion] = useState(region);
  const [tempYear, setTempYear] = useState(schoolYear);
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleGps = async () => {
    setGpsLoading(true);
    await onGps(setTempRegion);
    setGpsLoading(false);
  };

  return (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.settingsLabel}>Regio</Text>
      <View style={styles.regionRow}>
        {['Noord', 'Midden', 'Zuid'].map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.regionBtn, tempRegion === r && styles.regionBtnActive]}
            onPress={() => setTempRegion(r)}
          >
            <Text style={[styles.regionBtnText, tempRegion === r && styles.regionBtnTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.gpsBtn} onPress={handleGps} disabled={gpsLoading}>
        <Text style={styles.gpsBtnIcon}>📍</Text>
        <Text style={styles.gpsBtnText}>{gpsLoading ? 'Locatie bepalen...' : 'Bepaal regio via GPS'}</Text>
      </TouchableOpacity>

      <Text style={[styles.settingsLabel, { marginTop: 24 }]}>Schooljaar</Text>
      <View style={styles.yearRow}>
        {SCHOOL_YEARS.map((y) => (
          <TouchableOpacity
            key={y}
            style={[styles.yearBtn, tempYear === y && styles.regionBtnActive]}
            onPress={() => setTempYear(y)}
          >
            <Text style={[styles.yearBtnText, tempYear === y && styles.regionBtnTextActive]}>{y}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(tempRegion, tempYear)}>
        <Text style={styles.saveBtnText}>Opslaan</Text>
      </TouchableOpacity>
      <View style={styles.scrollPad} />
    </ScrollView>
  );
}

function AboutScreen() {
  return (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.aboutContent} showsVerticalScrollIndicator={false}>
      <Image source={require('./assets/joshuafoto.png')} style={styles.aboutPhoto} />
      <Text style={styles.aboutTitle}>Schoolvakanties NL</Text>
      <View style={styles.aboutCard}>
        <Text style={styles.aboutCardTitle}>Over deze app</Text>
        <Text style={styles.aboutText}>
          Deze app toont Nederlandse schoolvakanties per regio en schooljaar. De data wordt live opgehaald van de officiële Rijksoverheid API.
        </Text>
      </View>
      <View style={styles.aboutCard}>
        <Text style={styles.aboutCardTitle}>Functies</Text>
        {[
          'Overzicht van alle vakanties per regio',
          'Aftellen tot de volgende vakantie',
          'Live data via Rijksoverheid API',
          'Automatische regio bepaling via GPS',
          'Handmatige regio selectie',
          'Ondersteuning voor meerdere schooljaren',
          'Portrait en landscape weergave',
        ].map((f, i) => (
          <Text key={i} style={styles.aboutFeature}>• {f}</Text>
        ))}
      </View>
      <View style={styles.aboutCard}>
        <Text style={styles.aboutCardTitle}>Regio's</Text>
        <Text style={styles.aboutText}>Noord: Groningen, Friesland, Drenthe</Text>
        <Text style={styles.aboutText}>Midden: Overijssel, Gelderland, Utrecht, Noord-Holland, Zuid-Holland, Zeeland, Flevoland</Text>
        <Text style={styles.aboutText}>Zuid: Noord-Brabant, Limburg</Text>
      </View>
      <Text style={styles.aboutVersion}>Versie 1.0.0 • Data: Rijksoverheid API</Text>
      <View style={styles.scrollPad} />
    </ScrollView>
  );
}

// ─── Loading / Error ──────────────────────────────────────────────
function LoadingScreen() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={BLUE} />
      <Text style={styles.loadingText}>Vakanties ophalen...</Text>
    </View>
  );
}

function ErrorScreen({ onRetry }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorEmoji}>⚠️</Text>
      <Text style={styles.errorText}>Kan vakanties niet ophalen.{'\n'}Controleer je internetverbinding.</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryBtnText}>Opnieuw proberen</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Navigation ───────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'overview', label: 'Overzicht', icon: '📅' },
  { key: 'countdown', label: 'Countdown', icon: '⏱️' },
  { key: 'settings', label: 'Instellingen', icon: '⚙️' },
  { key: 'about', label: 'Over', icon: 'ℹ️' },
];

function BottomNav({ active, onSelect }) {
  return (
    <View style={styles.bottomNav}>
      {NAV_ITEMS.map((item) => (
        <TouchableOpacity key={item.key} style={styles.bottomNavItem} onPress={() => onSelect(item.key)}>
          <Text style={styles.navIcon}>{item.icon}</Text>
          <Text style={[styles.navLabel, active === item.key && styles.navLabelActive]}>{item.label}</Text>
          {active === item.key && <View style={styles.navIndicator} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SideNav({ active, onSelect }) {
  return (
    <View style={styles.sideNav}>
      <View style={styles.sideNavHeader}>
        <Text style={styles.sideNavHeaderIcon}>📅</Text>
      </View>
      {NAV_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[styles.sideNavItem, active === item.key && styles.sideNavItemActive]}
          onPress={() => onSelect(item.key)}
        >
          <Text style={styles.navIcon}>{item.icon}</Text>
          <Text style={[styles.sideNavLabel, active === item.key && styles.navLabelActive]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main App ─────────────────────────────────────────────────────
export default function App() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [activeScreen, setActiveScreen] = useState('overview');
  const [region, setRegion] = useState('Midden');
  const [schoolYear, setSchoolYear] = useState(defaultSchoolYear);
  const [holidayCache, setHolidayCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [appLoaded, setAppLoaded] = useState(false);

  // For the Overview: use the selected school year
  const holidays = holidayCache[schoolYear]?.[region] ?? [];

  // For the Countdown: always the actual next vacation, across current + next school year
  const actualCurrentYear = defaultSchoolYear();
  const nextYearStart = parseInt(actualCurrentYear.split('-')[1]);
  const actualNextYear = `${nextYearStart}-${nextYearStart + 1}`;
  const countdownHolidays = [
    ...(holidayCache[actualCurrentYear]?.[region] ?? []),
    ...(holidayCache[actualNextYear]?.[region] ?? []),
  ];

  const SCREEN_TITLES = {
    overview: 'Schoolvakanties',
    countdown: 'Countdown',
    settings: 'Instellingen',
    about: 'Over deze app',
  };

  const loadHolidays = useCallback(async (year) => {
    if (holidayCache[year]) return; // already in memory

    setLoading(true);
    setError(null);

    // Try AsyncStorage cache first
    try {
      const stored = await AsyncStorage.getItem(`holidays_v3_${year}`);
      if (stored) {
        const parsed = deserializeHolidayData(JSON.parse(stored));
        setHolidayCache(prev => ({ ...prev, [year]: parsed }));
        setLoading(false);
        return;
      }
    } catch {}

    // Fetch from API
    try {
      const data = await fetchHolidays(year);
      setHolidayCache(prev => ({ ...prev, [year]: data }));
      AsyncStorage.setItem(`holidays_v3_${year}`, JSON.stringify(serializeHolidayData(data)));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [holidayCache]);

  // Load saved settings, then fetch selected year + always current & next year for countdown
  useEffect(() => {
    AsyncStorage.multiGet(['region', 'schoolYear']).then(async (pairs) => {
      const savedRegion = pairs[0][1];
      const savedYear = pairs[1][1];
      if (savedRegion) setRegion(savedRegion);
      if (savedYear) setSchoolYear(savedYear);
      setAppLoaded(true);
      const cur = defaultSchoolYear();
      const nextStart = parseInt(cur.split('-')[1]);
      const next = `${nextStart}-${nextStart + 1}`;
      await Promise.all([
        loadHolidays(savedYear || cur),
        loadHolidays(cur),
        loadHolidays(next),
      ]);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch when the selected school year changes
  useEffect(() => {
    if (appLoaded) loadHolidays(schoolYear);
  }, [schoolYear, appLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback((newRegion, newYear) => {
    setRegion(newRegion);
    setSchoolYear(newYear);
    AsyncStorage.multiSet([['region', newRegion], ['schoolYear', newYear]]);
    setActiveScreen('overview');
  }, []);

  const handleGps = useCallback(async (setTempRegion) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Geen toegang', 'Geef de app toestemming om je locatie te gebruiken.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const detected = latToRegion(loc.coords.latitude);
      setTempRegion(detected);
      Alert.alert('Regio gevonden', `Je bent in regio ${detected}.`);
    } catch {
      Alert.alert('Fout', 'Locatie kon niet worden bepaald.');
    }
  }, []);

  if (!appLoaded) return null;

  const renderContent = () => {
    if (loading) return <LoadingScreen />;
    if (error) return <ErrorScreen onRetry={() => loadHolidays(schoolYear)} />;

    switch (activeScreen) {
      case 'overview':
        return <OverviewScreen holidays={holidays} isLandscape={isLandscape} />;
      case 'countdown':
        return <CountdownScreen holidays={countdownHolidays} isLandscape={isLandscape} />;
      case 'settings':
        return <SettingsScreen region={region} schoolYear={schoolYear} onSave={handleSave} onGps={handleGps} />;
      case 'about':
        return <AboutScreen />;
      default:
        return null;
    }
  };

  const header = (
    <View style={isLandscape ? styles.headerLandscape : styles.headerPortrait}>
      <View>
        <Text style={styles.headerTitle}>{SCREEN_TITLES[activeScreen]}</Text>
        {activeScreen !== 'settings' && activeScreen !== 'about' && (
          <Text style={styles.headerSub}>📍 Regio {region}</Text>
        )}
      </View>
      <Text style={styles.headerYear}>{schoolYear}</Text>
    </View>
  );

  return (
    <SafeAreaProvider>
      {isLandscape ? (
        <SafeAreaView style={styles.rootLandscape}>
          <StatusBar style="light" />
          <SideNav active={activeScreen} onSelect={setActiveScreen} />
          <View style={styles.mainLandscape}>
            {header}
            <View style={styles.contentArea}>{renderContent()}</View>
          </View>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={styles.rootPortrait}>
          <StatusBar style="light" />
          {header}
          <View style={styles.contentArea}>{renderContent()}</View>
          <BottomNav active={activeScreen} onSelect={setActiveScreen} />
        </SafeAreaView>
      )}
    </SafeAreaProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const BLUE = '#2563eb';

const styles = StyleSheet.create({
  rootPortrait: { flex: 1, backgroundColor: '#f8fafc' },
  rootLandscape: { flex: 1, flexDirection: 'row', backgroundColor: '#f8fafc' },

  headerPortrait: {
    backgroundColor: BLUE,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLandscape: {
    backgroundColor: BLUE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  headerYear: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },

  sideNav: { width: 76, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  sideNavHeader: { backgroundColor: BLUE, height: 52, alignItems: 'center', justifyContent: 'center' },
  sideNavHeaderIcon: { fontSize: 24 },
  sideNavItem: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sideNavItemActive: { backgroundColor: '#eff6ff' },
  sideNavLabel: { fontSize: 10, color: '#94a3b8', marginTop: 2, textAlign: 'center' },

  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  bottomNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, position: 'relative' },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  navLabelActive: { color: BLUE, fontWeight: '600' },
  navIndicator: { position: 'absolute', top: 0, left: '25%', right: '25%', height: 2, backgroundColor: BLUE, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },

  mainLandscape: { flex: 1, flexDirection: 'column' },
  contentArea: { flex: 1, overflow: 'hidden' },
  screenScroll: { flex: 1 },

  overviewContent: { padding: 16, gap: 10 },
  overviewContentLandscape: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12 },
  holidayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  holidayCardLandscape: { width: '48%' },
  holidayCardActive: { borderColor: '#16a34a', borderWidth: 1.5, backgroundColor: '#f0fdf4' },
  holidayCardPast: { opacity: 0.5 },
  holidayCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  holidayCardRight: { alignItems: 'flex-end', gap: 6 },
  holidayEmoji: { fontSize: 28 },
  holidayName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  holidayDates: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badge: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  daysChip: { alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  daysChipNumber: { fontSize: 18, fontWeight: '700', color: BLUE, lineHeight: 22 },
  daysChipLabel: { fontSize: 10, color: BLUE },
  pastLabel: { fontSize: 11, color: '#94a3b8' },
  textMuted: { color: '#94a3b8' },

  countdownPortrait: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  countdownLandscape: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 48, padding: 24 },
  countdownCircle: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  countdownNumber: { fontSize: 52, fontWeight: '800', lineHeight: 60 },
  countdownLabel: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  countdownEmoji: { fontSize: 48 },
  countdownInfo: { alignItems: 'center' },
  countdownTitle: { fontSize: 22, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  countdownSubtitle: { fontSize: 16, color: '#64748b', marginTop: 4 },
  countdownDate: { fontSize: 15, color: '#64748b', marginTop: 6 },
  noVacationText: { fontSize: 16, color: '#64748b', textAlign: 'center', padding: 24 },

  settingsContent: { padding: 20 },
  settingsLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  regionRow: { flexDirection: 'row', gap: 10 },
  regionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  regionBtnActive: { borderColor: BLUE, backgroundColor: '#eff6ff' },
  regionBtnText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  regionBtnTextActive: { color: BLUE, fontWeight: '700' },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 13, marginTop: 12 },
  gpsBtnIcon: { fontSize: 18 },
  gpsBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  yearRow: { gap: 8 },
  yearBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff', alignItems: 'center' },
  yearBtnText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  saveBtn: { backgroundColor: BLUE, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  aboutContent: { padding: 20, alignItems: 'center' },
  aboutPhoto: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  aboutTitle: { fontSize: 22, fontWeight: '700', color: '#1e293b', marginBottom: 20 },
  aboutCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '100%', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  aboutCardTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  aboutText: { fontSize: 13, color: '#64748b', lineHeight: 20, marginBottom: 4 },
  aboutFeature: { fontSize: 13, color: '#64748b', lineHeight: 22 },
  aboutVersion: { fontSize: 12, color: '#94a3b8', marginTop: 12 },

  loadingText: { color: '#64748b', marginTop: 12, fontSize: 15 },
  errorEmoji: { fontSize: 48, marginBottom: 12 },
  errorText: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  retryBtn: { backgroundColor: BLUE, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollPad: { height: 24 },
});
