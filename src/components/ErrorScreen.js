import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles';

export default function ErrorScreen({ onRetry }) {
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
