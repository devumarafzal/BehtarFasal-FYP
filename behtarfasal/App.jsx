import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from './src/constants/theme';
import { WeatherProvider } from './src/contexts/WeatherContext';
import AppNavigator from './src/navigation/AppNavigator';

const App = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <WeatherProvider>
        <StatusBar style="dark" backgroundColor={theme.colors.background} />
        <AppNavigator />
      </WeatherProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
