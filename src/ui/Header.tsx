import React from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography, shadows } from './theme';
import { WeatherData } from '../types';

interface HeaderProps {
  weather: WeatherData | null;
}

const getWeatherIcon = (weather: WeatherData | null): keyof typeof Ionicons.glyphMap => {
  if (!weather) return 'partly-sunny';
  if (weather.precipitation > 0) return 'rainy';
  if (weather.cloudCover > 70) return 'cloudy';
  if (weather.cloudCover > 30) return 'partly-sunny';
  return 'sunny';
};

export const Header: React.FC<HeaderProps> = ({ weather }) => {
  const insets = useSafeAreaInsets();
  const weatherIcon = getWeatherIcon(weather);

  const content = (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.leftSection}>
        <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
      </View>

      <View style={styles.weatherPill}>
        <Ionicons
          name={weatherIcon}
          size={18}
          color={colors.semantic.glow}
          style={styles.weatherIcon}
        />
        <Text style={styles.weatherTemp}>
          {weather ? `${Math.round(weather.temperature)}°` : '--'}
        </Text>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webHeader, { paddingTop: insets.top + spacing.sm }]}>
        {content}
      </View>
    );
  }

  return (
    <BlurView intensity={50} tint="light" style={styles.blurContainer}>
      {content}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.lightBorder,
  },
  webHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.lightBorder,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.lightSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
  },
  weatherIcon: {
    marginRight: spacing.xs,
  },
  weatherTemp: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    fontFamily: typography.family.semibold,
  },
});
