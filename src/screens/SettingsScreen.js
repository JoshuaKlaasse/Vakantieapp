import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SCHOOL_YEARS } from '../constants';
import { styles } from '../styles';

export default function SettingsScreen({ region, schoolYear, onSave, onGps }) {
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
