import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { theme } from "./src/constants/theme";
import { WeatherProvider } from "./src/contexts/WeatherContext";
import AppNavigator from "./src/navigation/AppNavigator";

const App = () => {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <WeatherProvider>
          <StatusBar style="dark" backgroundColor={theme.colors.background} />
          <AppNavigator />
        </WeatherProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
