import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  Dimensions,
  Pressable,
  Image,
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
  interpolate,
} from 'react-native-reanimated';

import { ChatMessage, WeatherData, DaylightData, Itinerary, Intent, PlaceCategory, Place } from '../types';
import {
  Header,
  InputBar,
  ChatBubble,
  Chip,
  colors,
  spacing,
  radius,
  typography,
  shadows,
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
  "Hey, I'm Helgo - your Zurich micro-guide. What sounds nice right now?",
  "Gruezi! Want a gentle suggestion for Zurich? Tell me your mood.",
  "Hi there. Anything in particular you feel like doing today?",
];

const HELGO_RESPONSES = [
  "Here are my top picks for you:",
  "Perfect! Check these out:",
  "Based on the vibes right now, try these:",
];

const HELGO_CLARIFIERS = [
  "I can help with food, views, walks, parks, and museums. What are you in the mood for?",
  "Quick check: are you looking for a restaurant, a stroll, a viewpoint, or something indoors?",
  "Give me a vibe or category to work with - e.g., \"mexican restaurant\" or \"sunset walk\".",
];

const HELGO_PRELUDES = [
  "Give me a second - I'll shape a quick two-stop plan.",
  "Alright, let me curate something that fits the moment.",
  "On it. I'll pull a short, easy-to-do plan for you.",
];

const HELGO_AFTERGLOWS = [
  "Want me to refine it - calmer, or more scenic?",
  "If you want a different mood, say the word.",
  "Want a shorter route or something more atmospheric?",
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
  const [assistantMode, setAssistantMode] = useState<'chat' | 'itinerary'>('chat');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [itineraryList, setItineraryList] = useState<Place[]>([]);
  const [itineraryPanelHeight, setItineraryPanelHeight] = useState(0);
  const [showRecap, setShowRecap] = useState(false);
  const lastIntentRef = useRef<Intent | null>(null);
  const lastAnchorRef = useRef<Place | null>(null);
  const itineraryPendingRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Animated gradient blobs
  const blob1X = useSharedValue(0);
  const blob2X = useSharedValue(SCREEN_WIDTH);
  const recapOpacity = useSharedValue(0);

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

  useEffect(() => {
    recapOpacity.value = withTiming(showRecap ? 1 : 0, {
      duration: showRecap ? 450 : 200,
      easing: Easing.out(Easing.ease),
    });
  }, [showRecap]);

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

    suggestions.push({ label: 'Build itinerary', icon: 'map', autoSend: true });

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

  const mergeIntent = (current: Intent, previous: Intent | null): Intent => {
    if (!previous) return current;
    return {
      ...current,
      cuisine: current.cuisine.length > 0 ? current.cuisine : previous.cuisine,
      categoryPreference:
        current.categoryPreference.length > 0
          ? current.categoryPreference
          : previous.categoryPreference,
      vibes: current.vibes.length > 0 ? current.vibes : previous.vibes,
      constraints: Array.from(new Set([...previous.constraints, ...current.constraints])),
      timeBudgetMins: current.timeBudgetMins ?? previous.timeBudgetMins,
      groupContext: current.groupContext ?? previous.groupContext,
      photoMode: current.photoMode !== 'none' ? current.photoMode : previous.photoMode,
      indoorPreference:
        current.indoorPreference !== 'no-preference'
          ? current.indoorPreference
          : previous.indoorPreference,
    };
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

  const buildBridge = (intent: Intent) => {
    const parts: string[] = [];
    if (intent.cuisine.length > 0) {
      parts.push(`Got it — keeping it ${intent.cuisine[0]}.`);
    } else if (intent.categoryPreference.length > 0) {
      parts.push(`Alright — focusing on ${CATEGORY_LABELS[intent.categoryPreference[0]]}.`);
    } else if (intent.vibes.length > 0) {
      parts.push(`Love the ${intent.vibes[0]} vibe.`);
    } else if (intent.constraints.includes('quiet')) {
      parts.push('Keeping it calm and low-key.');
    } else if (intent.constraints.includes('budget')) {
      parts.push('Keeping it budget-friendly.');
    }

    if (daylight?.isGoldenHour) {
      parts.push('Golden hour is on.');
    } else if (daylight?.isEvening) {
      parts.push("It's a nice evening window.");
    }

    return parts.length > 0 ? parts.join(' ') : 'Okay - give me a second.';
  };

  const addToItinerary = (place: Place) => {
    setItineraryList(prev => {
      if (prev.some(item => item.id === place.id)) return prev;
      const hasRestaurant = prev.some(item => item.category === 'restaurant');
      if (hasRestaurant && place.category === 'restaurant') {
        const warning: ChatMessage = {
          id: `assistant-itinerary-warn-${Date.now()}`,
          type: 'assistant',
          text: 'Your itinerary already has a restaurant. Add a nearby activity next.',
          timestamp: new Date(),
        };
        setMessages(current => [...current, warning]);
        return prev;
      }
      return [...prev, place];
    });
  };

  const removeFromItinerary = (placeId: string) => {
    setItineraryList(prev => prev.filter(item => item.id !== placeId));
  };

  const clearItinerary = () => {
    setItineraryList([]);
  };

  const isItineraryRequest = (text: string) => {
    const normalized = text.toLowerCase();
    return (
      normalized.includes('itinerary') ||
      normalized.includes('plan') ||
      normalized.includes('schedule')
    );
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

  const buildItinerarySummary = () => {
    if (itineraryList.length === 0) return 'Your itinerary is empty right now.';
    const lines = itineraryList.map(
      (place, index) => `${index + 1}. ${place.name} (${place.category})`
    );
    return `Here is your itinerary so far:\n${lines.join('\n')}`;
  };

  const pushItinerarySummary = () => {
    setShowRecap(true);
  };



  const submitText = async (text: string) => {
    if (!text.trim() || !weather || !daylight || isLoading) return;
    setHasInteracted(true);

    const normalizedInput = text.trim().toLowerCase();
    const stopPhrases = ['nothing else', 'nothing', 'no thanks', 'no thank you', 'done', 'that is all', 'all good'];

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    if (stopPhrases.some(phrase => normalizedInput.includes(phrase))) {
      const wrapUp: ChatMessage = {
        id: `assistant-wrap-${Date.now()}`,
        type: 'assistant',
        text: 'Got it. Here is your recap:',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, wrapUp]);
      setShowRecap(true);
      setFollowUps([]);
      setAssistantMode('chat');
      itineraryPendingRef.current = false;
      return;
    }
    if (showRecap) {
      setShowRecap(false);
    }
    setIsLoading(true);

    const preludeMessage: ChatMessage = {
      id: `assistant-prelude-${Date.now()}`,
      type: 'assistant',
      text: HELGO_PRELUDES[Math.floor(Math.random() * HELGO_PRELUDES.length)],
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, preludeMessage]);

    await new Promise(resolve => setTimeout(resolve, 600));

    const rawIntent = parseIntent(userMessage.text!);
    const intent = mergeIntent(rawIntent, lastIntentRef.current);
    const normalizedText = userMessage.text!.toLowerCase();
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
    if (rawIntent.categoryPreference.length > 0) {
      intent.categoryPreference = rawIntent.categoryPreference;
      if (rawIntent.categoryPreference.some(category => nonFoodCategories.has(category))) {
        intent.cuisine = [];
      }
    }
    const hasNonFoodCategory = intent.categoryPreference.some(category =>
      nonFoodCategories.has(category)
    );
    const isNextActivityRequest =
      normalizedText.includes('nearby') ||
      normalizedText.includes('next') ||
      normalizedText.includes('add ') ||
      normalizedText.includes('another');
    if (wantsItinerary && (hasNonFoodCategory || isNextActivityRequest)) {
      intent.cuisine = [];
    }

    const wantsItinerary =
      itineraryPendingRef.current ||
      assistantMode === 'itinerary' ||
      isItineraryRequest(userMessage.text!);
    if (wantsItinerary && !lastIntentRef.current && isAmbiguousIntent(intent)) {
      const askPref: ChatMessage = {
        id: `assistant-intent-${Date.now()}`,
        type: 'assistant',
        text: 'Tell me what kind of plan you want (e.g., date night, sightseeing, food).',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, askPref]);
      setIsLoading(false);
      return;
    }

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
    lastIntentRef.current = intent;

    if (wantsItinerary && !intent.timeBudgetMins) {
      itineraryPendingRef.current = true;
      const askTime: ChatMessage = {
        id: `assistant-time-${Date.now()}`,
        type: 'assistant',
        text: 'How much time do you have? (1 hour, 2 hours, or half day)',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, askTime]);
      setFollowUps([
        { label: '1 hour', icon: 'time', autoSend: true },
        { label: '2 hours', icon: 'time', autoSend: true },
        { label: 'Half day', icon: 'time', autoSend: true },
      ]);
      setIsLoading(false);
      return;
    }
    itineraryPendingRef.current = false;

    const resolvedLocation = userLocation ?? FALLBACK_LOCATION;
    const queryLocation = resolveQueryLocation(userMessage.text!);
    const effectiveLocation = queryLocation ?? resolvedLocation;
    const userElevation = await getUserElevation(effectiveLocation.lat, effectiveLocation.lon);
    const latestDaylight = getDaylightData(effectiveLocation.lat, effectiveLocation.lon);
    setDaylight(latestDaylight);
    const context = {
      userLocation: effectiveLocation,
      now: new Date(),
      weather,
      daylight: latestDaylight,
    };

    const proposalLimit = assistantMode === 'itinerary' ? 8 : 3;
    let itineraries: Itinerary[] = [];
    let dataError: string | undefined;
    if (
      intent.cuisine.length === 0 &&
      intent.vibes.length === 0 &&
      intent.categoryPreference.length === 0
    ) {
      const result = await generateGreetingItineraries(context, userElevation, { limit: proposalLimit });
      if (result.status === 'error') {
        dataError = result.error;
      } else {
        itineraries = result.itineraries;
      }
    } else {
      const result = await generateItineraries(intent, context, userElevation, { limit: proposalLimit });
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
      text: `${buildBridge(intent)} ${HELGO_RESPONSES[Math.floor(Math.random() * HELGO_RESPONSES.length)]}`,
      itineraries,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    if (!wantsItinerary) {
      setFollowUps(buildFollowUps(intent, itineraries));
    }
    setIsLoading(false);
    if (itineraries[0]) {
      lastAnchorRef.current = itineraries[0].anchor;
    }


    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    if (!wantsItinerary) {
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

    if (wantsItinerary) {
      const nextMessage: ChatMessage = {
        id: `assistant-next-${Date.now()}`,
        type: 'assistant',
        text: 'What should we add next? (Try a park, view, museum, or something nearby.)',
        timestamp: new Date(),
      };
      setTimeout(() => {
        setMessages(prev => [...prev, nextMessage]);
        setFollowUps([
          { label: 'Nearby park', icon: 'leaf', autoSend: true },
          { label: 'Best view', icon: 'eye', autoSend: true },
          { label: 'Museum', icon: 'color-palette', autoSend: true },
          { label: 'Walk', icon: 'walk', autoSend: true },
          { label: 'Surprise me', icon: 'sparkles', autoSend: true },
        ]);
      }, 600);
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

  // Calculate header height for scroll padding
  const headerHeight = insets.top + 70;
  const itineraryPadding =
    assistantMode === 'itinerary' ? itineraryPanelHeight + spacing.md : 0;
  const recapStyle = useAnimatedStyle(() => ({
    opacity: recapOpacity.value,
    transform: [{ translateY: interpolate(recapOpacity.value, [0, 1], [12, 0]) }],
  }));

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
      <Header weather={weather} locationLabel={locationLabel ?? undefined} />

      {/* Chat content */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {assistantMode === 'itinerary' && (
          <View
            style={[styles.itineraryOverlay, { top: headerHeight + spacing.sm }]}
            onLayout={(event) => setItineraryPanelHeight(event.nativeEvent.layout.height)}
          >
            <View style={styles.itineraryPanel}>
              <View style={styles.itineraryHeader}>
                <Text style={styles.itineraryTitle}>Your itinerary</Text>
                {itineraryList.length > 0 && (
                  <View style={styles.itineraryActions}>
                    <Pressable onPress={pushItinerarySummary} style={styles.summaryButton}>
                      <Text style={styles.summaryButtonText}>Summary</Text>
                    </Pressable>
                    <Pressable onPress={clearItinerary} style={styles.clearButton}>
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </Pressable>
                  </View>
                )}
              </View>
              {itineraryList.length === 0 ? (
                <Text style={styles.itineraryEmpty}>
                  Add a restaurant first, then nearby parks, events, or sights.
                </Text>
              ) : (
                itineraryList.map((place, index) => (
                  <View key={place.id} style={styles.itineraryRow}>
                    <Text style={styles.itineraryIndex}>{index + 1}.</Text>
                    <View style={styles.itineraryInfo}>
                      <Text style={styles.itineraryName}>{place.name}</Text>
                      <Text style={styles.itineraryMeta}>{place.category}</Text>
                    </View>
                    <Pressable
                      onPress={() => removeFromItinerary(place.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close" size={16} color={colors.text.tertiary} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingTop: headerHeight + spacing.md + itineraryPadding },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!hasInteracted && (
            <View style={styles.modeSelector}>
              <Chip
                label="Chat"
                icon="chatbubble-ellipses"
                variant={assistantMode === 'chat' ? 'accent' : 'default'}
                onPress={() => setAssistantMode('chat')}
              />
              <Chip
                label="Itinerary"
                icon="map"
                variant={assistantMode === 'itinerary' ? 'accent' : 'default'}
                onPress={() => setAssistantMode('itinerary')}
              />
            </View>
          )}
          {showRecap && (
            <Animated.View style={[styles.recapPanel, recapStyle]}>
              <Text style={styles.recapTitle}>Your planned activities</Text>
              {itineraryList.length === 0 ? (
                <Text style={styles.recapEmpty}>
                  You haven't added any activities yet. Tap "Add to itinerary" on a place card to build your list.
                </Text>
              ) : (
                itineraryList.map((place) => (
                  <View key={`recap-${place.id}`} style={styles.recapCard}>
                    {place.photoUrl ? (
                      <Image source={{ uri: place.photoUrl }} style={styles.recapImage} />
                    ) : (
                      <View style={styles.recapImagePlaceholder}>
                        <Ionicons name="image" size={24} color={colors.text.tertiary} />
                      </View>
                    )}
                    <View style={styles.recapInfo}>
                      <Text style={styles.recapName}>{place.name}</Text>
                      <Text style={styles.recapLocation}>
                        {place.address || place.area || 'Zurich'}
                      </Text>
                      {place.description ? (
                        <Text style={styles.recapDescription} numberOfLines={2}>
                          {place.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </Animated.View>
          )}
          {messages.map((message, index) => (
            <ChatBubble
              key={message.id}
              message={message}
              index={index}
              onRequestSimilar={(place) => {
                const query = buildQueryFromPlace(place);
                submitText(query);
              }}
              onAddToItinerary={assistantMode === 'itinerary' ? addToItinerary : undefined}
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
            placeholder="What are you in the mood for-"
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
  modeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  itineraryPanel: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(248, 246, 242, 0.96)',
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
  },
  itineraryOverlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 2,
  },
  itineraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  itineraryTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    fontFamily: typography.family.semibold,
  },
  itineraryEmpty: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.family.regular,
  },
  itineraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  itineraryIndex: {
    width: 20,
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    fontFamily: typography.family.regular,
  },
  itineraryInfo: {
    flex: 1,
  },
  itineraryName: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontFamily: typography.family.semibold,
  },
  itineraryMeta: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
    fontFamily: typography.family.regular,
  },
  clearButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
  },
  clearButtonText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontFamily: typography.family.regular,
  },
  itineraryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  summaryButtonText: {
    fontSize: typography.size.xs,
    color: colors.white,
    fontFamily: typography.family.semibold,
  },
  recapPanel: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
    ...shadows.sm,
  },
  recapTitle: {
    fontSize: typography.size.md,
    color: colors.text.primary,
    fontFamily: typography.family.semibold,
    marginBottom: spacing.sm,
  },
  recapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.glass.lightSubtle,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  recapImage: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.glass.lightBorder,
  },
  recapImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.glass.lightBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recapInfo: {
    flex: 1,
  },
  recapName: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontFamily: typography.family.semibold,
    marginBottom: 2,
  },
  recapLocation: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontFamily: typography.family.regular,
    marginBottom: 2,
  },
  recapDescription: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    fontFamily: typography.family.regular,
    lineHeight: typography.size.xs * typography.lineHeight.normal,
  },
  recapEmpty: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.family.regular,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followUpContainer: {
    marginBottom: spacing.sm,
  },
  followUpContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
});
