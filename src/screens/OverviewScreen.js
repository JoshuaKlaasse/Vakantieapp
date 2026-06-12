import { View, Text, ScrollView } from 'react-native';
import { formatShort, daysBetween, getHolidayStatus } from '../utils/dateUtils';
import { styles } from '../styles';

export default function OverviewScreen({ holidays, isLandscape }) {
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
