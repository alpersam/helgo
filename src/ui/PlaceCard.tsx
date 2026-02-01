import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ImageBackground } from 'react-native';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Itinerary } from '../types';
import { colors, spacing, radius, typography, animation, shadows } from './theme';

interface PlaceCardProps {
  itinerary: Itinerary;
  index: number;
  onPress: () => void;
  scale?: SharedValue<number>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PlaceCard: React.FC<PlaceCardProps> = ({
  itinerary,
  index,
  onPress,
  scale,
}) => {
  const { anchor, satellite } = itinerary;
  const photoUrl = anchor.photoUrl;
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

  const cardContent = (
    <>
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

      {/* CTA hint */}
      <View style={styles.ctaHint}>
        <Text style={styles.ctaText}>Tap for details</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.text.muted} />
      </View>
    </>
  );

  const mediaHeader = photoUrl ? (
    <View style={styles.mediaHeader}>
      <ImageBackground source={{ uri: photoUrl }} style={styles.imageBackground} imageStyle={styles.imageStyle}>
        <LinearGradient
          colors={['rgba(8, 12, 22, 0.1)', 'rgba(8, 12, 22, 0.65)']}
          style={styles.imageOverlay}
        />
        <View style={styles.mediaTextWrap}>
          <View style={styles.numberBadgeMedia}>
            <Text style={styles.numberTextMedia}>{index + 1}</Text>
          </View>
          <Text style={styles.placeNameMedia} numberOfLines={1}>{anchor.name}</Text>
          <View style={styles.tagsRowMedia}>
            {anchor.tags.slice(0, 2).map((tag, i) => (
              <View key={i} style={styles.tagMedia}>
                <Text style={styles.tagTextMedia}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </ImageBackground>
    </View>
  ) : (
    <View style={styles.mediaFallback}>
      <View style={styles.numberBadgeMedia}>
        <Text style={styles.numberTextMedia}>{index + 1}</Text>
      </View>
      <Text style={styles.placeNameFallback} numberOfLines={1}>{anchor.name}</Text>
    </View>
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
          {mediaHeader}
          <View style={styles.contentBelow}>{cardContent}</View>
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
          {mediaHeader}
          <View style={styles.contentBelow}>{cardContent}</View>
        </View>
      </BlurView>
    </AnimatedPressable>
  );
};

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
  mediaHeader: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: colors.glass.lightSubtle,
  },
  imageBackground: {
    width: '100%',
    height: 140,
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderRadius: radius.lg,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaTextWrap: {
    padding: spacing.md,
  },
  placeNameMedia: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  tagsRowMedia: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagMedia: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  tagTextMedia: {
    fontSize: typography.size.xs,
    color: colors.white,
    fontWeight: typography.weight.medium,
  },
  placeNameFallback: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  contentBelow: {
    gap: spacing.md,
  },
  mediaFallback: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  numberBadgeMedia: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  numberTextMedia: {
    color: colors.white,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.xs,
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
});
