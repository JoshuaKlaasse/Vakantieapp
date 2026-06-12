import { View, Text, TouchableOpacity } from 'react-native';
import { NAV_ITEMS } from '../constants';
import { styles } from '../styles';

export default function SideNav({ active, onSelect }) {
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
