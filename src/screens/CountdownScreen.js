import { View, Text } from 'react-native';
import { formatLong, getCountdownInfo } from '../utils/dateUtils';
import { styles } from '../styles';

export default function CountdownScreen({ holidays, isLandscape }) {
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
