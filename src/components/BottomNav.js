import { View, Text, TouchableOpacity } from 'react-native';
import { NAV_ITEMS } from '../constants';
import { styles } from '../styles';

export default function BottomNav({ active, onSelect }) {
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
