import { useState, useEffect, useCallback } from 'react';
import { View, Text, useWindowDimensions, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { useHolidays } from './src/hooks/useHolidays';
import { defaultSchoolYear } from './src/utils/dateUtils';
import { latToRegion } from './src/utils/locationUtils';
import { styles } from './src/styles';

import OverviewScreen from './src/screens/OverviewScreen';
import CountdownScreen from './src/screens/CountdownScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AboutScreen from './src/screens/AboutScreen';
import BottomNav from './src/components/BottomNav';
import SideNav from './src/components/SideNav';
import LoadingScreen from './src/components/LoadingScreen';
import ErrorScreen from './src/components/ErrorScreen';

const SCREEN_TITLES = {
  overview: 'Schoolvakanties',
  countdown: 'Countdown',
  settings: 'Instellingen',
  about: 'Over deze app',
};

export default function App() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [activeScreen, setActiveScreen] = useState('overview');
  const [region, setRegion] = useState('Midden');
  const [schoolYear, setSchoolYear] = useState(defaultSchoolYear);
  const [appLoaded, setAppLoaded] = useState(false);

  const { holidayCache, loading, error, loadHolidays } = useHolidays();

  // Overview uses selected school year; countdown always uses actual current + next year
  const holidays = holidayCache[schoolYear]?.[region] ?? [];
  const actualCurrentYear = defaultSchoolYear();
  const nextYearStart = parseInt(actualCurrentYear.split('-')[1]);
  const actualNextYear = `${nextYearStart}-${nextYearStart + 1}`;
  const countdownHolidays = [
    ...(holidayCache[actualCurrentYear]?.[region] ?? []),
    ...(holidayCache[actualNextYear]?.[region] ?? []),
  ];

  // Load saved settings, then fetch selected year + current & next year for countdown
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
