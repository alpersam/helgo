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

import { ChatMessage, WeatherData, DaylightData, Itinerary, Intent, PlaceCategory, Place } from '../types';
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
  parseIntent,
  generateItineraries,
  generateGreetingItineraries,
  initializeRecommendationEngine,
  recordSessionPositiveInteraction,
  getQueryEmbedding,
} from '../lib';
import {
  generateResponse,
  detectQueryType,
  ResponseContext,
} from '../lib/responseGenerator';
import { ZURICH_LAT, ZURICH_LON } from '../lib/weather';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HELGO_GREETINGS = [
  "Hey, I'm Helgo - your Zurich micro-guide. What sounds nice right now?",
  "Gruezi! Want a gentle suggestion for Zurich? Tell me your mood.",
  "Hi there. Anything in particular you feel like doing today?",
  "Welcome! I know Zurich well. What are you feeling?",
  "Hey! Looking for something specific or just exploring?",
  "Hoi! Ready to find your next spot in Zurich?",
];

const HELGO_CLARIFIERS = [
  "I can help with food, views, walks, parks, and museums. What are you in the mood for?",
  "Quick check: are you looking for a restaurant, a stroll, a viewpoint, or something indoors?",
  "Give me a vibe or category to work with - e.g., \"mexican restaurant\" or \"sunset walk\".",
  "What kind of experience? Food, nature, culture, or just wandering?",
  "Help me narrow it down - eating, drinking, walking, or exploring?",
  "Any preferences? Cafes, views, parks, museums - I can work with anything.",
];

const HELGO_PRELUDES = [
  "Give me a second - I'll shape a quick two-stop plan.",
  "Alright, let me curate something that fits the moment.",
  "On it. I'll pull a short, easy-to-do plan for you.",
  "Let me find the right spots...",
  "Searching for the best matches...",
  "One moment while I check what's good right now...",
];

const HELGO_AFTERGLOWS = [
  "Want me to refine it - calmer, or more scenic?",
  "If you want a different mood, say the word.",
  "Want a shorter route or something more atmospheric?",
  "Let me know if you'd like alternatives.",
  "I can adjust if these don't feel right.",
  "Happy to tweak the vibe if needed.",
  "Need something different? Just say so.",
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
  cafe: 'cafes',
  restaurant: 'restaurants',
  viewpoint: 'viewpoints',
  walk: 'walks',
  bar: 'bars',
  museum: 'museums',
  market: 'markets',
  park: 'parks',
  activity: 'activities',
  shopping: 'shopping',
  sport: 'sports',
  wellness: 'wellness',
  accommodation: 'stays',
  event: 'events',
  sightseeing: 'sights',
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
  activity: 'sparkles',
  shopping: 'bag',
  sport: 'football',
  wellness: 'leaf',
  accommodation: 'bed',
  event: 'calendar',
  sightseeing: 'map',
};


const ChatScreenContent: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [daylight, setDaylight] = useState<DaylightData | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<SuggestionChip[]>([]);
  const lastAnchorRef = useRef<Place | null>(null);
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
        setLocationLabel('Zurich');
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
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: resolved.lat,
          longitude: resolved.lon,
        });
        const city = place?.city || place?.subregion || 'Zurich';
        const district = place?.district ? `, ${place.district}` : '';
        setLocationLabel(`${city}${district}`);
      } catch {
        setLocationLabel('Zurich');
      }
      return { location: resolved, permissionDenied: false };
    } catch (error) {
      console.warn('Location fetch failed, using fallback:', error);
      setUserLocation(FALLBACK_LOCATION);
      setLocationLabel('Zurich');
      return { location: FALLBACK_LOCATION, permissionDenied: true };
    }
  };

  const initializeChat = async () => {
    setIsLoading(true);
    await initializeRecommendationEngine();
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
    // Count how many meaningful signals we have
    const signals = [
      intent.cuisine.length > 0,
      intent.categoryPreference.length > 0,
      intent.vibes.length > 0,
      intent.constraints.length > 0,
      !!intent.timeBudgetMins,
      !!intent.groupContext,
      intent.photoMode !== 'none',
      intent.indoorPreference !== 'no-preference',
      !!intent.areaFilter, // Area filter is also a meaningful signal
    ].filter(Boolean).length;

    // Only ambiguous if we have zero signals - allow generic recs with minimal input
    return signals === 0;
  };

  const buildQueryFromPlace = (place: Place) => {
    const cuisineTags = [
      'mexican',
      'italian',
      'sushi',
      'burger',
      'asian',
      'swiss',
      'vegan',
      'brunch',
      'coffee',
    ];
    const cuisine = place.tags.find(tag => cuisineTags.includes(tag));

    let core = '';
    switch (place.category) {
      case 'restaurant':
        core = cuisine ? `${cuisine} restaurant` : 'restaurant';
        break;
      case 'cafe':
        core = 'cafe';
        break;
      case 'bar':
        core = 'bar';
        break;
      case 'museum':
        core = 'museum';
        break;
      case 'park':
        core = 'park';
        break;
      case 'viewpoint':
        core = 'viewpoint';
        break;
      case 'walk':
        core = 'walk';
        break;
      case 'shopping':
        core = 'shopping';
        break;
      case 'sport':
        core = 'sport';
        break;
      case 'wellness':
        core = 'spa';
        break;
      case 'event':
        core = 'event';
        break;
      case 'sightseeing':
        core = 'sightseeing';
        break;
      default:
        core = 'things to do';
        break;
    }

    const vibeParts: string[] = [];
    if (place.tags.includes('quiet')) vibeParts.push('quiet');
    if (place.tags.includes('romantic')) vibeParts.push('romantic');
    if (place.tags.includes('view') || place.tags.includes('photo')) vibeParts.push('scenic');
    if (place.tags.includes('green') || place.tags.includes('park')) vibeParts.push('green');

    return [...vibeParts, core].join(' ');
  };

  const resolveQueryLocation = (text: string) => {
    const normalized = text.toLowerCase();
    const proximityTriggers = [
      'around the restaurant',
      'around there',
      'near there',
      'nearby',
      'around it',
      'around this',
      'close to it',
      'near it',
      'around the place',
    ];

    if (proximityTriggers.some(trigger => normalized.includes(trigger))) {
      const anchor = lastAnchorRef.current;
      if (anchor) {
        return { lat: anchor.lat, lon: anchor.lon };
      }
    }

    const locationOverrides: Array<{ keywords: string[]; lat: number; lon: number }> = [
      { keywords: ['center', 'city center', 'city centre', 'downtown', 'central'], lat: ZURICH_LAT, lon: ZURICH_LON },
      { keywords: ['old town', 'oldtown', 'altstadt'], lat: 47.3717, lon: 8.5423 },
      { keywords: ['hb', 'hauptbahnhof', 'main station'], lat: 47.3779, lon: 8.5402 },
      { keywords: ['enge'], lat: 47.3649, lon: 8.5316 },
      { keywords: ['seefeld'], lat: 47.3576, lon: 8.5537 },
      { keywords: ['wiedikon'], lat: 47.3702, lon: 8.5195 },
      { keywords: ['oerlikon', 'oerliken'], lat: 47.4105, lon: 8.5446 },
      { keywords: ['langstrasse', 'kreis 4', 'district 4'], lat: 47.3781, lon: 8.5262 },
    ];

    for (const entry of locationOverrides) {
      if (entry.keywords.some(keyword => normalized.includes(keyword))) {
        return { lat: entry.lat, lon: entry.lon };
      }
    }

    return null;
  };

  const startNewChat = () => {
    setMessages([]);
    setFollowUps([]);
    setInputText('');
    lastAnchorRef.current = null;
    initializeChat();
  };

  const submitText = async (text: string) => {
    console.info('[submitText] start', {
      text: text.trim(),
      hasWeather: !!weather,
      hasDaylight: !!daylight,
      isLoading,
    });
    if (!text.trim() || !weather || !daylight || isLoading) {
      console.warn('[submitText] blocked', {
        text: text.trim(),
        hasWeather: !!weather,
        hasDaylight: !!daylight,
        isLoading,
      });
      return;
    }

    const normalizedInput = text.trim().toLowerCase();

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Skip prelude for quick follow-ups and refinements
    const quickFollowUpPhrases = [
      'more', 'another', 'different', 'else', 'instead', 'other',
      'budget', 'indoor', 'outdoor', 'nearby', 'closer', 'quieter',
    ];
    const isQuickFollowUp = quickFollowUpPhrases.some(phrase =>
      normalizedInput.includes(phrase)
    ) || normalizedInput.length < 20;

    if (!isQuickFollowUp) {
      const preludeMessage: ChatMessage = {
        id: `assistant-prelude-${Date.now()}`,
        type: 'assistant',
        text: HELGO_PRELUDES[Math.floor(Math.random() * HELGO_PRELUDES.length)],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, preludeMessage]);
      await new Promise(resolve => setTimeout(resolve, 600));
    } else {
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.info('[submitText] parsing intent');
    let intent: Intent;
    try {
      intent = parseIntent(userMessage.text!);
      console.info('[submitText] intent parsed', {
        cuisine: intent.cuisine,
        categories: intent.categoryPreference,
        vibes: intent.vibes,
        constraints: intent.constraints,
        indoorPreference: intent.indoorPreference,
        photoMode: intent.photoMode,
      });
      console.info('[submitText] building nonFoodCategories');
    } catch (error) {
      console.error('[submitText] intent parsing failed', error);
      setIsLoading(false);
      return;
    }
    const nonFoodCategories = new Set<PlaceCategory>([
      'park',
      'walk',
      'viewpoint',
      'museum',
      'event',
      'activity',
      'sightseeing',
      'shopping',
      'sport',
      'wellness',
    ]);

    if (intent.categoryPreference.length > 0) {
      if (intent.categoryPreference.some(category => nonFoodCategories.has(category))) {
        intent.cuisine = [];
      }
    }

    const ambiguous = isAmbiguousIntent(intent);
    console.info('[submitText] ambiguous check', { ambiguous });
    if (ambiguous) {
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
    const queryLocation = resolveQueryLocation(userMessage.text!);
    const effectiveLocation = queryLocation ?? resolvedLocation;
    console.info('[submitText] elevation start', effectiveLocation);
    const latestDaylight = getDaylightData(effectiveLocation.lat, effectiveLocation.lon);
    setDaylight(latestDaylight);
    const context = {
      userLocation: effectiveLocation,
      now: new Date(),
      weather,
      daylight: latestDaylight,
    };

    const proposalLimit = 3;
    let itineraries: Itinerary[] = [];
    let dataError: string | undefined;
    if (
      intent.cuisine.length === 0 &&
      intent.vibes.length === 0 &&
      intent.categoryPreference.length === 0
    ) {
      const result = await generateGreetingItineraries(context, 0, { limit: proposalLimit });
      if (result.status === 'error') {
        dataError = result.error;
      } else {
        itineraries = result.itineraries;
      }
    } else {
      let queryEmbedding: number[] | null = null;
      try {
        console.info('[embeddings] request start');
        queryEmbedding = await getQueryEmbedding(userMessage.text!, 6000);
        console.info('[embeddings] request done', { hasEmbedding: !!queryEmbedding });
      } catch (error) {
        console.warn('Query embedding failed:', error);
      }

      if (!queryEmbedding) {
        const errorMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          type: 'assistant',
          text: 'Embedding service is unavailable right now. Please try again.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        setFollowUps([]);
        setIsLoading(false);
        return;
      }

      const result = await generateItineraries(intent, context, 0, {
        limit: proposalLimit,
        queryEmbedding,
      });
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

    // Generate contextual response using the response generator
    const queryType = detectQueryType(intent, isQuickFollowUp);
    const responseContext: ResponseContext = {
      intent,
      itineraries,
      weather,
      daylight: latestDaylight,
      isFollowUp: isQuickFollowUp,
      queryType,
    };
    const responseText = generateResponse(responseContext);

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      type: 'assistant',
      text: responseText,
      itineraries,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setFollowUps(buildFollowUps(intent, itineraries));
    setIsLoading(false);
    if (itineraries[0]) {
      lastAnchorRef.current = itineraries[0].anchor;
    }

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Only show afterglow occasionally and not for quick follow-ups
    if (!isQuickFollowUp && Math.random() > 0.5) {
      const afterglow: ChatMessage = {
        id: `assistant-afterglow-${Date.now()}`,
        type: 'assistant',
        text: HELGO_AFTERGLOWS[Math.floor(Math.random() * HELGO_AFTERGLOWS.length)],
        timestamp: new Date(),
      };
      setTimeout(() => {
        setMessages(prev => [...prev, afterglow]);
      }, 800);
    }
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

  const handlePlaceSelect = (place: Place) => {
    recordSessionPositiveInteraction(place);
    lastAnchorRef.current = place;
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
      <Header weather={weather} locationLabel={locationLabel ?? undefined} onNewChat={startNewChat} />

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
            <ChatBubble
              key={message.id}
              message={message}
              index={index}
              onRequestSimilar={(place) => {
                const query = buildQueryFromPlace(place);
                submitText(query);
              }}
              onSelectPlace={handlePlaceSelect}
            />
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
    const timer = setTimeout(() => {
      opacity.value = withRepeat(
        withTiming(1, { duration: 600 }),
        -1,
        true
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity]);

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
    fontFamily: typography.family.regular,
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
