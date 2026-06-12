import { View, Text, ScrollView, Image } from 'react-native';
import { styles } from '../styles';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.aboutContent} showsVerticalScrollIndicator={false}>
      <Image source={require('../../assets/joshuafoto.png')} style={styles.aboutPhoto} />
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
