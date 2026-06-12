import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchHolidays, serializeHolidayData, deserializeHolidayData } from '../api/holidays';

export function useHolidays() {
  const [holidayCache, setHolidayCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // cacheRef mirrors holidayCache for synchronous checks inside the callback
  const cacheRef = useRef({});

  const loadHolidays = useCallback(async (year) => {
    if (cacheRef.current[year]) return;

    setLoading(true);
    setError(null);

    try {
      const stored = await AsyncStorage.getItem(`holidays_v3_${year}`);
      if (stored) {
        const parsed = deserializeHolidayData(JSON.parse(stored));
        cacheRef.current[year] = parsed;
        setHolidayCache(prev => ({ ...prev, [year]: parsed }));
        setLoading(false);
        return;
      }
    } catch {}

    try {
      const data = await fetchHolidays(year);
      cacheRef.current[year] = data;
      setHolidayCache(prev => ({ ...prev, [year]: data }));
      AsyncStorage.setItem(`holidays_v3_${year}`, JSON.stringify(serializeHolidayData(data)));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { holidayCache, loading, error, loadHolidays };
}
