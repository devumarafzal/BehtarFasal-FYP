import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

const WeatherCard = ({ weather }) => {
  if (!weather) {
    return null;
  }

  const city = weather.name || 'Unknown City';
  const temp = Math.round(weather.main?.temp || 0);
  const condition = weather.weather?.[0]?.main || 'Clear';
  const humidity = weather.main?.humidity ?? 0;
  const wind = weather.wind?.speed ?? 0;
  const feelsLike = Math.round(weather.main?.feels_like || 0);

  return (
    <View style={styles.card}>
      <Text style={styles.city}>{city}</Text>
      <Text style={styles.temp}>{temp}°C</Text>
      <Text style={styles.condition}>{condition}</Text>

      <View style={styles.metricsRow}>
        <Text style={styles.metric}>Humidity: {humidity}%</Text>
        <Text style={styles.metric}>Wind: {wind} m/s</Text>
      </View>
      <Text style={styles.metric}>Feels like: {feelsLike}°C</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 3,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderTopWidth: 4,
    borderTopColor: theme.colors.accentGreen,
  },
  city: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.headerGreen,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  temp: {
    fontSize: theme.fontSize.xxl,
    color: theme.colors.accentGreen,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  condition: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  metric: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
});

export default WeatherCard;
