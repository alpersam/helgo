import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { ChatMessage, WeatherData, DaylightData } from '../types';
import {
  Header,
  InputBar,
  ChatBubble,
  Chip,
  colors,
  spacing,
  typography,
} from '../ui';
import {
  fetchWeather,
  getDaylightData,
  getUserElevation,
  parseIntent,
  generateItineraries,
  generateGreetingItineraries,
} from '../lib';
import { ZURICH_LAT, ZURICH_LON } from '../lib/weather';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HELGO_GREETINGS = [
  "Hey! I'm Helgo, your Zürich micro-guide. What are you in the mood for?",
  "Grüezi! Ready to explore Zürich? Tell me what you're looking for.",
  "Hi there! Where do you want to go RIGHT NOW?",
];

const HELGO_RESPONSES = [
  "Here are my top picks for you:",
  "Perfect! Check these out:",
  "Based on the vibes right now, try these:",
];

const FALLBACK_LOCATION = { lat: ZURICH_LAT, lon: ZURICH_LON };

const SUGGESTIONS = [
  { label: 'Cute café', icon: 'cafe' as const },
  { label: 'Best view', icon: 'eye' as const },
  { label: '2 hours free', icon: 'time' as const },
  { label: 'Something hip', icon: 'sparkles' as const },
  { label: 'Quiet spot', icon: 'leaf' as const },
];

const ChatScreenContent: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [daylight, setDaylight] = useState<DaylightData | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Animated gradient blobs
  const blob1X = useSharedValue(0);
  const blob2X = useSharedValue(SCREEN_WIDTH);

  useEffect(() => {
    blob1X.value = withRepeat(
      withTiming(SCREEN_WIDTH * 0.3, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    blob2X.value = withRepeat(
      withTiming(SCREEN_WIDTH * 0.5, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const blob1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: blob1X.value }],
  }));

  const blob2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: blob2X.value }],
  }));

  useEffect(() => {
    initializeChat();
  }, []);

  const resolveUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserLocation(FALLBACK_LOCATION);
        return { location: FALLBACK_LOCATION, permissionDenied: true };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const resolved = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      };
      setUserLocation(resolved);
      return { location: resolved, permissionDenied: false };
    } catch (error) {
      console.warn('Location fetch failed, using fallback:', error);
      setUserLocation(FALLBACK_LOCATION);
      return { location: FALLBACK_LOCATION, permissionDenied: true };
    }
  };

  const initializeChat = async () => {
    setIsLoading(true);
    const { location, permissionDenied } = await resolveUserLocation();
    const weatherData = await fetchWeather(location.lat, location.lon);
    const sunData = getDaylightData(location.lat, location.lon);

    setWeather(weatherData);
    setDaylight(sunData);

    const greeting: ChatMessage = {
      id: 'greeting',
      type: 'assistant',
      text: HELGO_GREETINGS[Math.floor(Math.random() * HELGO_GREETINGS.length)],
      timestamp: new Date(),
    };

    if (permissionDenied) {
      const fallbackNotice: ChatMessage = {
        id: 'location-fallback',
        type: 'assistant',
        text: "I couldn't access your location, so I'll guide you from Zürich center for now.",
        timestamp: new Date(),
      };
      setMessages([greeting, fallbackNotice]);
    } else {
      setMessages([greeting]);
    }
    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !weather || !daylight) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 600));

    const intent = parseIntent(userMessage.text!);
    const resolvedLocation = userLocation ?? FALLBACK_LOCATION;
    const userElevation = await getUserElevation(resolvedLocation.lat, resolvedLocation.lon);
    const latestDaylight = getDaylightData(resolvedLocation.lat, resolvedLocation.lon);
    setDaylight(latestDaylight);
    const context = {
      userLocation: resolvedLocation,
      now: new Date(),
      weather,
      daylight: latestDaylight,
    };

    let itineraries;
    if (
      intent.cuisine.length === 0 &&
      intent.vibes.length === 0 &&
      intent.categoryPreference.length === 0
    ) {
      itineraries = generateGreetingItineraries(context, userElevation);
    } else {
      itineraries = generateItineraries(intent, context, userElevation);
    }

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      type: 'assistant',
      text: HELGO_RESPONSES[Math.floor(Math.random() * HELGO_RESPONSES.length)],
      itineraries,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
  };

  // Calculate header height for scroll padding
  const headerHeight = insets.top + 70;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Gradient background */}
      <LinearGradient
        colors={[
          colors.background.gradient.start,
          colors.background.gradient.middle,
          colors.background.gradient.end,
          colors.background.primary,
        ]}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.gradient}
      />

      {/* Animated blobs */}
      <Animated.View style={[styles.blob, styles.blob1, blob1Style]} />
      <Animated.View style={[styles.blob, styles.blob2, blob2Style]} />

      {/* Header */}
      <Header weather={weather} />

      {/* Chat content */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingTop: headerHeight + spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message, index) => (
            <ChatBubble key={message.id} message={message} index={index} />
          ))}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingDots}>
                <LoadingDot delay={0} />
                <LoadingDot delay={150} />
                <LoadingDot delay={300} />
              </View>
              <Text style={styles.loadingText}>Finding perfect spots...</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom section */}
        <View style={styles.bottomSection}>
          {/* Suggestions */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsContent}
            style={styles.suggestionsContainer}
          >
            {SUGGESTIONS.map((suggestion, index) => (
              <Chip
                key={index}
                label={suggestion.label}
                icon={suggestion.icon}
                onPress={() => handleSuggestionPress(suggestion.label)}
              />
            ))}
          </ScrollView>

          {/* Input bar */}
          <InputBar
            value={inputText}
            onChangeText={setInputText}
            onSubmit={handleSend}
            placeholder="What are you in the mood for?"
            disabled={isLoading}
          />

          {/* Bottom safe area */}
          <View style={{ height: insets.bottom + spacing.sm }} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const LoadingDot: React.FC<{ delay: number }> = ({ delay }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    setTimeout(() => {
      opacity.value = withRepeat(
        withTiming(1, { duration: 600 }),
        -1,
        true
      );
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

export const ChatScreen: React.FC = () => {
  return (
    <SafeAreaProvider>
      <ChatScreenContent />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.6,
  },
  blob: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    opacity: 0.4,
  },
  blob1: {
    top: -SCREEN_WIDTH * 0.2,
    left: -SCREEN_WIDTH * 0.3,
    backgroundColor: colors.background.gradient.start,
  },
  blob2: {
    top: SCREEN_HEIGHT * 0.15,
    right: -SCREEN_WIDTH * 0.4,
    backgroundColor: colors.background.gradient.end,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginLeft: spacing.xxxl + spacing.lg,
  },
  loadingDots: {
    flexDirection: 'row',
    marginRight: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginHorizontal: 2,
  },
  loadingText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  bottomSection: {
    backgroundColor: 'transparent',
  },
  suggestionsContainer: {
    marginBottom: spacing.sm,
  },
  suggestionsContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
});
