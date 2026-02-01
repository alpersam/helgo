import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Itinerary } from '../types';
import { colors, spacing, radius, typography, animation, shadows } from './theme';

interface PlaceCardProps {
  itinerary: Itinerary;
  index: number;
  onPress: () => void;
  scale?: SharedValue<number>;
  onAddToItinerary?: (place: Itinerary['anchor']) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PlaceCard: React.FC<PlaceCardProps> = ({
  itinerary,
  index,
  onPress,
  scale,
  onAddToItinerary,
}) => {
  const { anchor, satellite, mainCharacterScore, metrics } = itinerary;
  const pressed = useSharedValue(0);

  const pressStyle = useAnimatedStyle(() => {
    const scaleValue = scale?.value ?? 1;
    return {
      transform: [
        { scale: scaleValue * interpolate(pressed.value, [0, 1], [1, 0.97]) },
      ],
    };
  });

  const handlePressIn = () => {
    pressed.value = withSpring(1, animation.spring.snappy);
  };

  const handlePressOut = () => {
    pressed.value = withSpring(0, animation.spring.gentle);
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return colors.success;
    if (score >= 40) return colors.semantic.glow;
    return colors.text.tertiary;
  };

  const cardContent = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{index + 1}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>MAIN CHARACTER</Text>
          <Text style={[styles.score, { color: getScoreColor(mainCharacterScore) }]}>
            {mainCharacterScore}
          </Text>
        </View>
      </View>

      {/* Place Name */}
      <Text style={styles.placeName} numberOfLines={1}>{anchor.name}</Text>

      {/* Tags */}
      <View style={styles.tagsRow}>
        {anchor.tags.slice(0, 3).map((tag, i) => (
          <View key={i} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      {/* Itinerary Flow */}
      <View style={styles.flowContainer}>
        <View style={styles.flowStep}>
          <View style={styles.flowDot} />
          <Text style={styles.flowText} numberOfLines={1}>
            {anchor.name}
          </Text>
        </View>
        <View style={styles.flowLine} />
        <View style={styles.flowStep}>
          <View style={[styles.flowDot, styles.flowDotSecondary]} />
          <Text style={styles.flowText} numberOfLines={1}>
            {satellite.name}
          </Text>
        </View>
        <Text style={styles.flowReason}>{itinerary.satelliteReason}</Text>
      </View>

      {/* Metrics */}
      <View style={styles.metricsRow}>
        <MetricPill
          emoji={metrics.reflectionPotential.emoji}
          label="Reflection"
          score={metrics.reflectionPotential.score}
        />
        <MetricPill
          emoji={metrics.nightGlow.emoji}
          label="Glow"
          score={metrics.nightGlow.score}
        />
        <MetricPill
          emoji={metrics.greenPocket.emoji}
          label="Green"
          score={metrics.greenPocket.score}
        />
      </View>

      {/* CTA hint */}
      <View style={styles.ctaHint}>
        <Text style={styles.ctaText}>Tap for details</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.text.muted} />
      </View>

      {onAddToItinerary && (
        <Pressable style={styles.addButton} onPress={() => onAddToItinerary(anchor)}>
          <Text style={styles.addButtonText}>Add to itinerary</Text>
        </Pressable>
      )}
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[pressStyle]}
      >
        <View style={styles.cardWeb}>
          {cardContent}
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[pressStyle, styles.cardContainer]}
    >
      <BlurView intensity={35} tint="light" style={styles.blur}>
        <View style={styles.cardInner}>
          {cardContent}
        </View>
      </BlurView>
    </AnimatedPressable>
  );
};

const MetricPill: React.FC<{ emoji: string; label: string; score: number }> = ({
  emoji,
  label,
  score,
}) => (
  <View style={styles.metricPill}>
    <Text style={styles.metricEmoji}>{emoji}</Text>
    <Text style={styles.metricScore}>{score}</Text>
  </View>
);

const styles = StyleSheet.create({
  cardContainer: {
    width: 280,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  blur: {
    borderRadius: radius.xl,
  },
  cardInner: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
    backgroundColor: colors.glass.lightSubtle,
    padding: spacing.lg,
  },
  cardWeb: {
    width: 280,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: spacing.lg,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.circle,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: colors.white,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.sm,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
    letterSpacing: typography.letterSpacing.extraWide,
  },
  score: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.heavy,
    marginTop: -2,
  },
  placeName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: colors.glass.lightSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
  },
  tagText: {
    fontSize: typography.size.xs,
    color: colors.primary,
    fontWeight: typography.weight.medium,
  },
  flowContainer: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  flowDotSecondary: {
    backgroundColor: colors.accent,
  },
  flowLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.glass.lightBorder,
    marginLeft: 3,
    marginVertical: spacing.xs,
  },
  flowText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  flowReason: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    marginLeft: spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.lightSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
  },
  metricEmoji: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  metricScore: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  ctaHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    fontFamily: typography.family.regular,
  },
  addButton: {
    marginTop: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.family.semibold,
  },
});
