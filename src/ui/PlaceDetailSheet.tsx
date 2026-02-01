import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Itinerary } from '../types';
import { GlassButton } from './GlassButton';
import { colors, spacing, radius, typography, animation, shadows } from './theme';

interface PlaceDetailSheetProps {
  itinerary: Itinerary | null;
  visible: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.65;

export const PlaceDetailSheet: React.FC<PlaceDetailSheetProps> = ({
  itinerary,
  visible,
  onClose,
}) => {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, animation.spring.gentle);
      backdropOpacity.value = withTiming(1, { duration: 200 });
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } else {
      translateY.value = withSpring(SHEET_HEIGHT, animation.spring.gentle);
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleOpenMaps = () => {
    if (itinerary) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      Linking.openURL(itinerary.anchor.mapsUrl);
    }
  };

  const handleOpenTikTok = () => {
    if (itinerary) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      Linking.openURL(itinerary.anchor.tiktokUrl);
    }
  };

  if (!itinerary) return null;

  const { anchor, satellite, mainCharacterScore, metrics } = itinerary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={styles.backdropPressable} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[styles.sheetContainer, sheetStyle]}>
          {Platform.OS === 'web' ? (
            <View style={styles.sheetWeb}>
              <SheetContent
                itinerary={itinerary}
                onClose={onClose}
                onOpenMaps={handleOpenMaps}
                onOpenTikTok={handleOpenTikTok}
              />
            </View>
          ) : (
            <BlurView intensity={60} tint="light" style={styles.sheet}>
              <View style={styles.sheetInner}>
                <SheetContent
                  itinerary={itinerary}
                  onClose={onClose}
                  onOpenMaps={handleOpenMaps}
                  onOpenTikTok={handleOpenTikTok}
                />
              </View>
            </BlurView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

interface SheetContentProps {
  itinerary: Itinerary;
  onClose: () => void;
  onOpenMaps: () => void;
  onOpenTikTok: () => void;
}

const SheetContent: React.FC<SheetContentProps> = ({
  itinerary,
  onClose,
  onOpenMaps,
  onOpenTikTok,
}) => {
  const { anchor, satellite, mainCharacterScore, metrics } = itinerary;

  return (
    <>
      {/* Handle */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* Close button */}
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={24} color={colors.text.secondary} />
      </Pressable>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{anchor.name}</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Main Character Score</Text>
          <Text style={styles.scoreValue}>{mainCharacterScore}/100</Text>
        </View>
      </View>

      {/* Description */}
      {anchor.description && (
        <Text style={styles.description}>{anchor.description}</Text>
      )}

      {/* Tags */}
      <View style={styles.tagsRow}>
        {anchor.tags.map((tag, i) => (
          <View key={i} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      {/* Itinerary */}
      <View style={styles.itinerarySection}>
        <Text style={styles.sectionTitle}>Your itinerary</Text>
        <View style={styles.itineraryCard}>
          <View style={styles.itineraryStep}>
            <View style={styles.stepIcon}>
              <Ionicons name="location" size={18} color={colors.primary} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{anchor.name}</Text>
              <Text style={styles.stepCategory}>{anchor.category}</Text>
            </View>
          </View>
          <View style={styles.stepConnector} />
          <View style={styles.itineraryStep}>
            <View style={[styles.stepIcon, styles.stepIconSecondary]}>
              <Ionicons name="walk" size={18} color={colors.accent} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{satellite.name}</Text>
              <Text style={styles.stepReason}>{itinerary.satelliteReason}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Metrics */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Conditions now</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            emoji={metrics.reflectionPotential.emoji}
            label={metrics.reflectionPotential.label}
            score={metrics.reflectionPotential.score}
          />
          <MetricCard
            emoji={metrics.nightGlow.emoji}
            label={metrics.nightGlow.label}
            score={metrics.nightGlow.score}
          />
          <MetricCard
            emoji={metrics.greenPocket.emoji}
            label={metrics.greenPocket.label}
            score={metrics.greenPocket.score}
          />
          <MetricCard
            emoji={metrics.fogEscape.emoji}
            label={metrics.fogEscape.label}
            score={metrics.fogEscape.score}
          />
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <View style={styles.actionButton}>
          <GlassButton
            onPress={onOpenMaps}
            label="Open Maps"
            icon="map"
            variant="primary"
            fullWidth
          />
        </View>
        <View style={styles.actionButton}>
          <GlassButton
            onPress={onOpenTikTok}
            label="TikTok"
            icon="logo-tiktok"
            variant="accent"
            fullWidth
          />
        </View>
      </View>
    </>
  );
};

const MetricCard: React.FC<{ emoji: string; label: string; score: number }> = ({
  emoji,
  label,
  score,
}) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricEmoji}>{emoji}</Text>
    <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
    <Text style={styles.metricScore}>{score}</Text>
  </View>
);

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    overflow: 'hidden',
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
  },
  sheetInner: {
    flex: 1,
    backgroundColor: colors.glass.lightSubtle,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.glass.lightBorder,
  },
  sheetWeb: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.glass.lightBorder,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.glass.lightBorder,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass.lightSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginRight: spacing.sm,
  },
  scoreValue: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.success,
  },
  description: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  tag: {
    backgroundColor: colors.glass.lightSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
  },
  tagText: {
    fontSize: typography.size.sm,
    color: colors.primary,
    fontWeight: typography.weight.medium,
  },
  itinerarySection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: spacing.sm,
  },
  itineraryCard: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  itineraryStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stepIconSecondary: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  stepCategory: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
  },
  stepReason: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  stepConnector: {
    width: 2,
    height: 20,
    backgroundColor: colors.glass.lightBorder,
    marginLeft: 17,
    marginVertical: spacing.xs,
  },
  metricsSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.glass.lightSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    margin: spacing.xs,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
    alignItems: 'center',
  },
  metricEmoji: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xxs,
  },
  metricScore: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
