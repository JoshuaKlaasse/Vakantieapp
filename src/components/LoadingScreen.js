import { View, Text, ActivityIndicator } from 'react-native';
import { BLUE } from '../constants';
import { styles } from '../styles';

export default function LoadingScreen() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={BLUE} />
      <Text style={styles.loadingText}>Vakanties ophalen...</Text>
    </View>
  );
}
