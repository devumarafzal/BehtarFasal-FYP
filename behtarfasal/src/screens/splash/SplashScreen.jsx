import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../constants/theme";

const SplashScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <MaterialCommunityIcons
            name="sprout"
            size={76}
            color={theme.colors.surface}
          />
        </View>

        <Text style={styles.brandTitle}>BehtarFasal</Text>
        <Text style={styles.brandUrdu}>بہتر فصل</Text>
        <Text style={styles.subtitle}>AI-Powered Crop Recommendations</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 88,
  },
  logoCircle: {
    width: 142,
    height: 142,
    borderRadius: 71,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 5,
    borderColor: "rgba(255, 255, 255, 0.34)",
    marginBottom: 36,
  },
  brandTitle: {
    color: theme.colors.surface,
    fontSize: 42,
    fontWeight: "700",
    textAlign: "center",
  },
  brandUrdu: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 30,
    marginTop: 16,
    textAlign: "center",
    writingDirection: "rtl",
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 20,
    marginTop: 22,
    textAlign: "center",
  },
});

export default SplashScreen;
