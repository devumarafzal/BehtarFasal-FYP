import { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../constants/theme";
import Constants from "expo-constants";

// Dynamically get the IP address from Expo bundler if testing on a physical device
const getApiUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0];
    return `http://${ip}:8000`;
  }
  return "http://10.0.2.2:8000";
};

const API_BASE_URL = getApiUrl();

const ChatbotScreen = () => {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const initialWindowHeightRef = useRef(Dimensions.get("window").height);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [chatHistory, setChatHistory] = useState([
    {
      role: "ai",
      content:
        "Assalam o Alaikum! Mein AgriAssist hoon, aapka agricultural advisor. Aap kaise hain, aur mein aapki kheti-baari mein kya madad kar sakta hoon?",
    },
  ]);
  const scrollViewRef = useRef();

  const handleSend = async () => {
    if (!message.trim()) {
      return;
    }

    const userMessage = message.trim();
    setMessage("");
    setError("");

    // Add user message to history
    const updatedHistory = [
      ...chatHistory,
      { role: "user", content: userMessage },
    ];
    setChatHistory(updatedHistory);
    setLoading(true);

    try {
      const requestHistory = updatedHistory
        .slice(1, -1)
        .slice(-8)
        .map(({ role, content }) => ({ role, content }));

      const url = `${API_BASE_URL || "http://10.0.2.2:8000"}/chat/`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          history: requestHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            data.reply ||
            "Maaf kijiye, mujhe is sawal ka jawab nahi mil saka.",
        },
      ]);
    } catch (err) {
      console.error(err);
      setError("Maaf kijiye, abhi response nahi mil saka. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [chatHistory, loading, keyboardOffset]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return undefined;
    }

    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      const keyboardHeight = event.endCoordinates?.height || 0;
      const currentWindowHeight = Dimensions.get("window").height;
      const resizedBy = Math.max(
        0,
        initialWindowHeightRef.current - currentWindowHeight
      );

      setKeyboardOffset(Math.max(0, keyboardHeight - resizedBy));
    });

    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardOffset(0);
      initialWindowHeightRef.current = Dimensions.get("window").height;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
      >
        <View style={styles.screenBody}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text style={styles.title}>Agri Chatbot</Text>
            <Text style={styles.subtitle}>
              Aapka ziraati mahir. Sawaal puchiye.
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {chatHistory.length === 1 && (
              <View style={styles.tipCard}>
                <Text style={styles.tipTitle}>
                  Misaal ke Sawaalat (Starter prompts)
                </Text>
                <Text style={styles.tipText}>
                  Gandum ke liye best khad konsi hai?
                </Text>
                <Text style={styles.tipText}>
                  Chawal ke patton par nishan hain, kya karoon?
                </Text>
                <Text style={styles.tipText}>
                  Is hafte pani dene ka best time?
                </Text>
              </View>
            )}

            <View style={styles.chatList}>
              {chatHistory.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageBubble,
                    msg.role === "user" ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.role === "user"
                        ? styles.userMessageText
                        : styles.aiMessageText,
                    ]}
                  >
                    {msg.content}
                  </Text>
                </View>
              ))}
            </View>

            {loading ? (
              <View style={styles.loaderRow}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.loaderText}>Jawab ban raha hai...</Text>
              </View>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.inputDock,
              keyboardOffset > 0 && { marginBottom: keyboardOffset },
            ]}
          >
            <View
              style={[
                styles.inputRow,
                { paddingBottom: theme.spacing.md + insets.bottom },
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Type your question"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="default"
                value={message}
                multiline
                maxLength={700}
                returnKeyType="send"
                onChangeText={(value) => {
                  setMessage(value);
                  if (error) {
                    setError("");
                  }
                }}
                onSubmitEditing={() => {
                  if (!message.includes("\n")) {
                    handleSend();
                  }
                }}
              />
              <Pressable
                style={[
                  styles.sendButton,
                  (loading || !message.trim()) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={loading || !message.trim()}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.surface} />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  screenBody: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    flexGrow: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: "700",
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  tipCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  tipTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: "700",
    marginBottom: theme.spacing.sm,
  },
  tipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  chatList: {
    marginTop: theme.spacing.md,
  },
  messageBubble: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    maxWidth: "85%",
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    alignSelf: "flex-end",
    borderBottomRightRadius: 0,
  },
  aiBubble: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  userMessageText: {
    color: theme.colors.surface,
  },
  aiMessageText: {
    color: theme.colors.text,
  },
  loaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  loaderText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginLeft: theme.spacing.sm,
  },
  inputDock: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    marginRight: theme.spacing.sm,
    maxHeight: 110,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.sm,
    fontWeight: "700",
  },
});

export default ChatbotScreen;
