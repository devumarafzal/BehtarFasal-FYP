import { useState, useRef, useEffect, useCallback, useContext } from "react";
import {
  ActivityIndicator,
  Alert,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useHeaderHeight } from "@react-navigation/elements";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../constants/theme";
import { WeatherContext } from "../../contexts/WeatherContext";
import { auth } from "../../firebase/config";
import {
  deleteChatSession,
  getChatSession,
  getChatSessions,
  saveChatSession,
} from "../../firebase/firestore";
import { getApiBaseUrl, getNetworkErrorMessage } from "../../services/apiConfig";
import { transcribeVoiceMessage } from "../../services/chatVoiceService";

const API_BASE_URL = getApiBaseUrl(process.env.EXPO_PUBLIC_API_URL, 8000);
const CHAT_SESSION_STORAGE_PREFIX = "@behtarfasal/chatSessions/";
const MIN_VOICE_RECORDING_MS = 900;
const MAX_VOICE_RECORDING_MS = 30000;
const SILENCE_STOP_MS = 1400;
const SILENCE_METERING_THRESHOLD = -45;

const VOICE_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    audioSource: "voice_recognition",
  },
};

const WELCOME_MESSAGE = {
  role: "ai",
  content:
    "Assalam o Alaikum! Mein AgriAssist hoon, aapka agricultural advisor. Aap kaise hain, aur mein aapki kheti-baari mein kya madad kar sakta hoon?",
};

const createInitialHistory = () => [{ ...WELCOME_MESSAGE }];

const normalizeChatMessages = (messages) => {
  const sanitizedMessages = Array.isArray(messages)
    ? messages
        .map((item) => ({
          role: item?.role === "user" ? "user" : "ai",
          content: String(item?.content || "").trim(),
        }))
        .filter((item) => item.content)
    : [];

  if (!sanitizedMessages.length) {
    return createInitialHistory();
  }

  const hasWelcomeMessage =
    sanitizedMessages[0]?.role === WELCOME_MESSAGE.role &&
    sanitizedMessages[0]?.content === WELCOME_MESSAGE.content;

  return hasWelcomeMessage
    ? sanitizedMessages
    : [...createInitialHistory(), ...sanitizedMessages];
};

const buildSessionTitle = (messages) => {
  const firstUserMessage = messages.find((item) => item.role === "user");
  const title = String(firstUserMessage?.content || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!title) {
    return "New chat";
  }

  return title.length > 42 ? `${title.slice(0, 42)}...` : title;
};

const formatSessionDate = (timestamp) => {
  const date =
    typeof timestamp?.toDate === "function"
      ? timestamp.toDate()
      : timestamp instanceof Date
        ? timestamp
        : typeof timestamp === "string" || typeof timestamp === "number"
          ? new Date(timestamp)
        : null;

  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const getLocalChatSessionKey = (userId) =>
  `${CHAT_SESSION_STORAGE_PREFIX}${userId}`;

const normalizeLocalSession = (session) => ({
  id: String(session?.id || `local_${Date.now()}`),
  title: String(session?.title || "Saved chat"),
  preview: String(session?.preview || ""),
  messages: normalizeChatMessages(session?.messages),
  messageCount: Number(session?.messageCount || session?.messages?.length || 0),
  createdAt: session?.createdAt || new Date().toISOString(),
  updatedAt: session?.updatedAt || new Date().toISOString(),
  storage: "local",
});

const loadLocalChatSessions = async (userId) => {
  const rawSessions = await AsyncStorage.getItem(getLocalChatSessionKey(userId));
  let parsedSessions = [];

  try {
    parsedSessions = rawSessions ? JSON.parse(rawSessions) : [];
  } catch (_error) {
    parsedSessions = [];
  }

  if (!Array.isArray(parsedSessions)) {
    return [];
  }

  return parsedSessions
    .map(normalizeLocalSession)
    .sort(
      (first, second) => new Date(second.updatedAt) - new Date(first.updatedAt)
    );
};

const removeLocalChatSessions = async (userId) => {
  await AsyncStorage.removeItem(getLocalChatSessionKey(userId));
};

const toLocalDateKey = (date) => {
  const value = date instanceof Date ? date : new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildWeatherPayload = ({ weather, forecast, rawForecast, currentCity }) => {
  if (!weather && (!Array.isArray(rawForecast) || rawForecast.length === 0)) {
    return null;
  }

  const currentWeather = weather?.weather?.[0] || {};
  const currentDate = weather?.dt ? new Date(weather.dt * 1000) : new Date();

  return {
    source: "OpenWeather",
    city: currentCity || weather?.name || "",
    todayKey: toLocalDateKey(new Date()),
    current: weather
      ? {
          observedAt: currentDate.toISOString(),
          dateKey: toLocalDateKey(currentDate),
          tempC: weather?.main?.temp,
          feelsLikeC: weather?.main?.feels_like,
          humidity: weather?.main?.humidity,
          condition: currentWeather.main || "",
          description: currentWeather.description || "",
          windSpeed: weather?.wind?.speed,
          rainMm:
            Number(weather?.rain?.["1h"] || 0) ||
            Number(weather?.rain?.["3h"] || 0),
        }
      : null,
    daily: Array.isArray(forecast) ? forecast.slice(0, 5) : [],
    hourly: Array.isArray(rawForecast)
      ? rawForecast.slice(0, 16).map((entry) => {
          const entryDate = new Date(entry.dt * 1000);
          const entryWeather = entry.weather?.[0] || {};

          return {
            time: entryDate.toISOString(),
            dateKey: toLocalDateKey(entryDate),
            timeLabel: entryDate.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            }),
            tempC: entry.main?.temp,
            humidity: entry.main?.humidity,
            condition: entryWeather.main || "",
            description: entryWeather.description || "",
            pop: Number(entry.pop || 0),
            rainMm:
              Number(entry.rain?.["3h"] || 0) ||
              Number(entry.rain?.["1h"] || 0),
          };
        })
      : [],
  };
};

const ChatbotScreen = () => {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { weather, forecast, rawForecast, currentCity } =
    useContext(WeatherContext);
  const audioRecorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(audioRecorder, 250);
  const initialWindowHeightRef = useRef(Dimensions.get("window").height);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState(() => createInitialHistory());
  const scrollViewRef = useRef();
  const initializedSessionsRef = useRef(false);
  const silenceStartedAtRef = useRef(null);
  const stopVoiceInputRef = useRef(null);

  const getRecordingDurationMs = useCallback(() => {
    const status = audioRecorder.getStatus?.();
    const durationFromStatus =
      status?.durationMillis || status?.duration || status?.currentTime;

    if (typeof durationFromStatus === "number") {
      return durationFromStatus > 1000
        ? durationFromStatus
        : durationFromStatus * 1000;
    }

    if (typeof audioRecorder.currentTime === "number") {
      return audioRecorder.currentTime * 1000;
    }

    return 0;
  }, [audioRecorder]);

  const startVoiceInput = useCallback(async () => {
    if (loading || voiceStatus !== "idle") {
      return;
    }

    setError("");

    try {
      const permission = await requestRecordingPermissionsAsync();

      if (!permission.granted) {
        setError("Microphone permission required hai voice message ke liye.");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      silenceStartedAtRef.current = null;
      setVoiceStatus("recording");
    } catch (err) {
      setVoiceStatus("idle");
      setError(err.message || "Voice recording start nahi ho saki.");
    }
  }, [audioRecorder, loading, voiceStatus]);

  const stopVoiceInput = useCallback(
    async ({ shouldTranscribe = true } = {}) => {
      if (voiceStatus !== "recording") {
        return;
      }

      const durationMs = getRecordingDurationMs();
      setVoiceStatus(shouldTranscribe ? "transcribing" : "idle");
      silenceStartedAtRef.current = null;

      try {
        await audioRecorder.stop();
        await setAudioModeAsync({ allowsRecording: false });

        const recordingUri =
          audioRecorder.uri ||
          audioRecorder.getStatus?.()?.url ||
          recorderState.url;

        if (!shouldTranscribe) {
          return;
        }

        if (durationMs < MIN_VOICE_RECORDING_MS) {
          setError("Thora lamba bol kar try karein.");
          return;
        }

        const transcript = await transcribeVoiceMessage(recordingUri);
        setMessage((currentMessage) => {
          const currentText = currentMessage.trim();
          return currentText ? `${currentText} ${transcript}` : transcript;
        });
        setError("");
      } catch (err) {
        setError(err.message || "Voice text mein convert nahi ho saki.");
      } finally {
        setVoiceStatus("idle");
      }
    },
    [audioRecorder, getRecordingDurationMs, recorderState.url, voiceStatus]
  );

  stopVoiceInputRef.current = stopVoiceInput;

  const migrateLocalChatSessionsToCloud = useCallback(async (userId) => {
    const localSessions = await loadLocalChatSessions(userId);
    const sessionsToMigrate = localSessions.filter((session) =>
      session.messages.some((item) => item.role === "user")
    );

    if (sessionsToMigrate.length === 0) {
      if (localSessions.length > 0) {
        await removeLocalChatSessions(userId);
      }
      return false;
    }

    await Promise.all(
      sessionsToMigrate.map((session) =>
        saveChatSession(
          userId,
          {
            title: session.title,
            messages: session.messages,
            createdAt: session.createdAt,
          },
          session.id
        )
      )
    );
    await removeLocalChatSessions(userId);
    return true;
  }, []);

  const refreshSessions = useCallback(
    async ({ openLatest = false } = {}) => {
      const userId = auth.currentUser?.uid;

      if (!userId) {
        setSessions([]);
        return;
      }

      setSessionsLoading(true);

      try {
        await migrateLocalChatSessionsToCloud(userId);
        const savedSessions = await getChatSessions(userId);
        setSessions(savedSessions);

        if (openLatest && savedSessions.length > 0) {
          setActiveSessionId(savedSessions[0].id);
          setChatHistory(normalizeChatMessages(savedSessions[0].messages));
        }
      } catch (err) {
        setSessions([]);
        setError(
          err.message ||
            "Chat sessions database se load nahi ho sakin. Please try again."
        );
      } finally {
        setSessionsLoading(false);
      }
    },
    [migrateLocalChatSessionsToCloud]
  );

  const persistChatSession = useCallback(
    async (messagesToSave, sessionId = activeSessionId) => {
      const userId = auth.currentUser?.uid;

      if (!userId || !messagesToSave.some((item) => item.role === "user")) {
        return sessionId;
      }

      const sessionPayload = {
        title: buildSessionTitle(messagesToSave),
        messages: messagesToSave,
      };
      const savedSessionId = await saveChatSession(
        userId,
        sessionPayload,
        sessionId
      );
      const savedSessions = await getChatSessions(userId);

      setActiveSessionId(savedSessionId);
      setSessions(savedSessions);

      return savedSessionId;
    },
    [activeSessionId]
  );

  const handleNewChat = () => {
    if (loading) {
      return;
    }

    setActiveSessionId(null);
    setChatHistory(createInitialHistory());
    setMessage("");
    setError("");
  };

  const handleSelectSession = async (session) => {
    if (loading || session.id === activeSessionId) {
      return;
    }

    const userId = auth.currentUser?.uid;
    setError("");

    try {
      if (!userId) {
        setError("Please login to open saved chat sessions.");
        return;
      }

      const selectedSession = await getChatSession(userId, session.id);

      setActiveSessionId(session.id);
      setChatHistory(
        normalizeChatMessages(selectedSession?.messages || session.messages)
      );
    } catch (_err) {
      setError("Chat session open nahi ho saki. Please try again.");
    }
  };

  const deleteActiveSession = async () => {
    const userId = auth.currentUser?.uid;

    if (!userId || !activeSessionId) {
      return;
    }

    try {
      await deleteChatSession(userId, activeSessionId);

      setActiveSessionId(null);
      setChatHistory(createInitialHistory());
      setMessage("");
      setError("");
      await refreshSessions();
    } catch (_err) {
      setError("Chat session delete nahi ho saki. Please try again.");
    }
  };

  const handleDeleteSession = () => {
    if (loading || !activeSessionId) {
      return;
    }

    Alert.alert("Delete chat", "Remove this saved chat session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: deleteActiveSession,
      },
    ]);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      return;
    }

    const userMessage = message.trim();
    setMessage("");
    setError("");

    const updatedHistory = [
      ...chatHistory,
      { role: "user", content: userMessage },
    ];
    setChatHistory(updatedHistory);
    setLoading(true);

    let historyToStore = updatedHistory;
    const weatherPayload = buildWeatherPayload({
      weather,
      forecast,
      rawForecast,
      currentCity,
    });

    try {
      const requestHistory = updatedHistory
        .slice(0, -1)
        .filter(
          (item, index) =>
            !(
              index === 0 &&
              item.role === WELCOME_MESSAGE.role &&
              item.content === WELCOME_MESSAGE.content
            )
        )
        .slice(-8)
        .map(({ role, content }) => ({ role, content }));

      const url = `${API_BASE_URL}/chat/`;
      let response;

      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: auth.currentUser?.uid,
            message: userMessage,
            history: requestHistory,
            weather: weatherPayload,
          }),
        });
      } catch (_networkError) {
        throw new Error(getNetworkErrorMessage("Chatbot", API_BASE_URL));
      }

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      historyToStore = [
        ...updatedHistory,
        {
          role: "ai",
          content:
            data.reply ||
            "Maaf kijiye, mujhe is sawal ka jawab nahi mil saka.",
        },
      ];

      setChatHistory(historyToStore);
    } catch (err) {
      setError(
        err.message ||
          "Maaf kijiye, abhi response nahi mil saka. Please try again."
      );
    } finally {
      try {
        await persistChatSession(historyToStore);
      } catch (saveError) {
        setError(
          (prev) =>
            prev ||
            saveError.message ||
            "Chat session save nahi ho saki. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (voiceStatus !== "recording" || !recorderState.isRecording) {
      silenceStartedAtRef.current = null;
      return;
    }

    const durationMs = getRecordingDurationMs();

    if (durationMs >= MAX_VOICE_RECORDING_MS) {
      stopVoiceInputRef.current?.();
      return;
    }

    if (durationMs < MIN_VOICE_RECORDING_MS) {
      return;
    }

    const metering = recorderState.metering;

    if (typeof metering !== "number") {
      return;
    }

    const isSilent = metering < SILENCE_METERING_THRESHOLD;
    const now = Date.now();

    if (!isSilent) {
      silenceStartedAtRef.current = null;
      return;
    }

    if (!silenceStartedAtRef.current) {
      silenceStartedAtRef.current = now;
      return;
    }

    if (now - silenceStartedAtRef.current >= SILENCE_STOP_MS) {
      stopVoiceInputRef.current?.();
    }
  }, [
    getRecordingDurationMs,
    recorderState.isRecording,
    recorderState.metering,
    voiceStatus,
  ]);

  useEffect(() => {
    return () => {
      if (audioRecorder.isRecording) {
        audioRecorder.stop().catch(() => {});
      }
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    };
  }, [audioRecorder]);

  useEffect(() => {
    if (initializedSessionsRef.current) {
      return;
    }

    initializedSessionsRef.current = true;
    refreshSessions({ openLatest: true });
  }, [refreshSessions]);

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

  const isRecordingVoice = voiceStatus === "recording";
  const isTranscribingVoice = voiceStatus === "transcribing";
  const voiceButtonDisabled = loading || isTranscribingVoice;
  const voiceHint = isRecordingVoice
    ? "Listening... rukne par auto-stop ho jayega."
    : isTranscribingVoice
      ? "Voice ko text mein convert kar raha hai..."
      : "";

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
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Agri Chatbot</Text>
                <Text style={styles.subtitle}>
                  Aapka ziraati mahir. Sawaal puchiye.
                </Text>
              </View>

              <View style={styles.headerActions}>
                <Pressable
                  style={[
                    styles.newChatButton,
                    loading && styles.actionButtonDisabled,
                  ]}
                  onPress={handleNewChat}
                  disabled={loading}
                  accessibilityLabel="Start new chat"
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={theme.colors.surface}
                  />
                  <Text style={styles.newChatButtonText}>New</Text>
                </Pressable>

                {activeSessionId ? (
                  <Pressable
                    style={[
                      styles.deleteSessionButton,
                      loading && styles.actionButtonDisabled,
                    ]}
                    onPress={handleDeleteSession}
                    disabled={loading}
                    accessibilityLabel="Delete current chat"
                  >
                    <Ionicons
                      name="trash-outline"
                      size={19}
                      color={theme.colors.error}
                    />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {sessions.length > 0 || sessionsLoading ? (
              <View style={styles.sessionsBlock}>
                <View style={styles.sessionsHeader}>
                  <Text style={styles.sessionsLabel}>Sessions</Text>
                  {sessionsLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                  ) : null}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.sessionListContent}
                >
                  {sessions.map((item) => {
                    const isActive = item.id === activeSessionId;
                    const messageCount = Number(item.messageCount || 0);
                    const sessionMeta =
                      formatSessionDate(item.updatedAt) ||
                      `${messageCount} ${
                        messageCount === 1 ? "message" : "messages"
                      }`;

                    return (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.sessionChip,
                          isActive && styles.sessionChipActive,
                          loading && styles.sessionChipDisabled,
                        ]}
                        onPress={() => handleSelectSession(item)}
                        disabled={loading}
                      >
                        <Text
                          style={[
                            styles.sessionTitle,
                            isActive && styles.sessionTitleActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title || "Saved chat"}
                        </Text>
                        <Text
                          style={[
                            styles.sessionMeta,
                            isActive && styles.sessionMetaActive,
                          ]}
                          numberOfLines={1}
                        >
                          {sessionMeta}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {voiceHint ? <Text style={styles.voiceHintText}>{voiceHint}</Text> : null}

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
                placeholder={isRecordingVoice ? "Listening..." : "Type your question"}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="default"
                value={message}
                multiline
                maxLength={700}
                returnKeyType="send"
                editable={!isTranscribingVoice}
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
                  styles.voiceButton,
                  isRecordingVoice && styles.voiceButtonRecording,
                  voiceButtonDisabled && styles.sendButtonDisabled,
                ]}
                onPress={
                  isRecordingVoice
                    ? () => stopVoiceInputRef.current?.()
                    : startVoiceInput
                }
                disabled={voiceButtonDisabled}
                accessibilityLabel={
                  isRecordingVoice ? "Stop voice input" : "Start voice input"
                }
              >
                {isTranscribingVoice ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <Ionicons
                    name={isRecordingVoice ? "stop" : "mic"}
                    size={20}
                    color={
                      isRecordingVoice
                        ? theme.colors.surface
                        : theme.colors.primary
                    }
                  />
                )}
              </Pressable>
              <Pressable
                style={[
                  styles.sendButton,
                  (loading || isRecordingVoice || !message.trim()) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={loading || isRecordingVoice || !message.trim()}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
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
  },
  newChatButton: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  newChatButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.sm,
    fontWeight: "700",
  },
  deleteSessionButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  sessionsBlock: {
    marginBottom: theme.spacing.md,
  },
  sessionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  sessionsLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: "700",
  },
  sessionListContent: {
    paddingRight: theme.spacing.md,
  },
  sessionChip: {
    width: 160,
    minHeight: 58,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    marginRight: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  sessionChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sessionChipDisabled: {
    opacity: 0.7,
  },
  sessionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: "700",
    marginBottom: theme.spacing.xs,
  },
  sessionTitleActive: {
    color: theme.colors.surface,
  },
  sessionMeta: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
  },
  sessionMetaActive: {
    color: "#E8F5E9",
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  voiceHintText: {
    color: theme.colors.textSecondary,
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
    padding: theme.spacing.sm,
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
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.sm,
  },
  voiceButtonRecording: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
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
