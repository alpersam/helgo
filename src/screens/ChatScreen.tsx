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
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { ChatMessage, WeatherData, DaylightData, Itinerary, Intent, PlaceCategory } from '../types';
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

const HELGO_CLARIFIERS = [
  "I can help with food, views, walks, parks, and museums. What are you in the mood for?",
  "Quick check: are you looking for a restaurant, a stroll, a viewpoint, or something indoors?",
  "Give me a vibe or category to work with — e.g., \"mexican restaurant\" or \"sunset walk\".",
];

const FALLBACK_LOCATION = { lat: ZURICH_LAT, lon: ZURICH_LON };

type SuggestionChip = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  autoSend?: boolean;
};

const SUGGESTIONS = [
  { label: 'Cute café', icon: 'cafe' as const },
  { label: 'Best view', icon: 'eye' as const },
  { label: '2 hours free', icon: 'time' as const },
  { label: 'Something hip', icon: 'sparkles' as const },
  { label: 'Quiet spot', icon: 'leaf' as const },
];

const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  cafe: 'caf?s',
  restaurant: 'restaurants',
  viewpoint: 'viewpoints',
  walk: 'walks',
  bar: 'bars',
  museum: 'museums',
  market: 'markets',
  park: 'parks',
};

const CATEGORY_ICONS: Record<PlaceCategory, keyof typeof Ionicons.glyphMap> = {
  cafe: 'cafe',
  restaurant: 'restaurant',
  viewpoint: 'eye',
  walk: 'walk',
  bar: 'wine',
  museum: 'color-palette',
  market: 'storefront',
  park: 'leaf',
};


const ChatScreenContent: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [daylight, setDaylight] = useState<DaylightData | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [followUps, setFollowUps] = useState<SuggestionChip[]>([]);
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

  const buildFollowUps = (intent: Intent, itineraries: Itinerary[]): SuggestionChip[] => {
    const suggestions: SuggestionChip[] = [];
    const anchor = itineraries[0]?.anchor;

    if (intent.cuisine.length > 0) {
      const cuisine = intent.cuisine[0];
      suggestions.push({
        label: `More ${cuisine} spots`,
        icon: 'restaurant',
        autoSend: true,
      });
    }

    const preferredCategory = intent.categoryPreference[0] ?? anchor?.category;
    if (preferredCategory) {
      suggestions.push({
        label: `More ${CATEGORY_LABELS[preferredCategory]}`,
        icon: CATEGORY_ICONS[preferredCategory],
        autoSend: true,
      });
    }

    if (intent.indoorPreference !== 'indoor') {
      suggestions.push({ label: 'Indoor instead', icon: 'home', autoSend: true });
    }
    if (intent.indoorPreference !== 'outdoor') {
      suggestions.push({ label: 'Outdoor instead', icon: 'sunny', autoSend: true });
    }

    if (!intent.constraints.includes('budget')) {
      suggestions.push({ label: 'Budget-friendly', icon: 'cash', autoSend: true });
    }

    if (intent.photoMode === 'none') {
      suggestions.push({ label: 'Something photogenic', icon: 'camera', autoSend: true });
    }

    if (intent.vibes.length === 0) {
      suggestions.push({ label: 'Cozy vibes', icon: 'heart', autoSend: true });
    }

    suggestions.push({ label: 'Surprise me', icon: 'sparkles', autoSend: true });

    const seen = new Set<string>();
    return suggestions
      .filter(item => {
        if (seen.has(item.label)) return false;
        seen.add(item.label);
        return true;
      })
      .slice(0, 6);
  };

  const isAmbiguousIntent = (intent: Intent) => {
    return (
      intent.cuisine.length === 0 &&
      intent.categoryPreference.length === 0 &&
      intent.vibes.length === 0 &&
      intent.constraints.length === 0 &&
      !intent.timeBudgetMins &&
      !intent.groupContext &&
      intent.photoMode === 'none' &&
      intent.indoorPreference === 'no-preference'
    );
  };

  const submitText = async (text: string) => {
    if (!text.trim() || !weather || !daylight || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 600));

    const intent = parseIntent(userMessage.text!);
    if (isAmbiguousIntent(intent)) {
      const clarifier: ChatMessage = {
        id: `assistant-clarify-${Date.now()}`,
        type: 'assistant',
        text: HELGO_CLARIFIERS[Math.floor(Math.random() * HELGO_CLARIFIERS.length)],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, clarifier]);
      setFollowUps([]);
      setIsLoading(false);
      return;
    }
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

    let itineraries: Itinerary[] = [];
    let dataError: string | undefined;
    if (
      intent.cuisine.length === 0 &&
      intent.vibes.length === 0 &&
      intent.categoryPreference.length === 0
    ) {
      const result = await generateGreetingItineraries(context, userElevation);
      if (result.status === 'error') {
        dataError = result.error;
      } else {
        itineraries = result.itineraries;
      }
    } else {
      const result = await generateItineraries(intent, context, userElevation);
      if (result.status === 'error') {
        dataError = result.error;
      } else {
        itineraries = result.itineraries;
      }
    }

    if (dataError) {
      const errorMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        type: 'assistant',
        text: dataError,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setFollowUps([]);
      setIsLoading(false);
      return;
    }

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      type: 'assistant',
      text: HELGO_RESPONSES[Math.floor(Math.random() * HELGO_RESPONSES.length)],
      itineraries,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setFollowUps(buildFollowUps(intent, itineraries));
    setIsLoading(false);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    await submitText(inputText);
  };

  const handleSuggestionPress = (suggestion: string, autoSend = false) => {
    if (autoSend) {
      submitText(suggestion);
      return;
    }
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

          {followUps.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.followUpContent}
              style={styles.followUpContainer}
            >
              {followUps.map((suggestion, index) => (
                <Chip
                  key={`followup-${index}`}
                  label={suggestion.label}
                  icon={suggestion.icon}
                  variant="accent"
                  onPress={() => handleSuggestionPress(suggestion.label, suggestion.autoSend)}
                />
              ))}
            </ScrollView>
          )}

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
  followUpContainer: {
    marginBottom: spacing.sm,
  },
  followUpContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
});
