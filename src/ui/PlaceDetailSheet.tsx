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
  Image,
  ScrollView,
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
import { Itinerary, PlaceCategory } from '../types';
import { GlassButton } from './GlassButton';
import { colors, spacing, radius, typography, animation, shadows } from './theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PlaceDetailSheetProps {
  itinerary: Itinerary | null;
  visible: boolean;
  onClose: () => void;
  onRequestSimilar?: (place: Itinerary['anchor']) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

const CATEGORY_PHOTOS: Record<PlaceCategory, string> = {
  cafe: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=70',
  restaurant: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=70',
  viewpoint: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=70',
  walk: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=70',
  bar: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=70',
  museum: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=70',
  market: 'https://images.unsplash.com/photo-1506807803488-8eafc15323c0?auto=format&fit=crop&w=1200&q=70',
  park: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=70',
  activity: 'https://images.unsplash.com/photo-1529257414771-1960a42a3b87?auto=format&fit=crop&w=1200&q=70',
  shopping: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=70',
  sport: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=70',
  wellness: 'https://images.unsplash.com/photo-1519821172141-b5d8b0a6cd6d?auto=format&fit=crop&w=1200&q=70',
  accommodation: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=70',
  event: 'https://images.unsplash.com/photo-1472653431158-6364773b2a56?auto=format&fit=crop&w=1200&q=70',
  sightseeing: 'https://images.unsplash.com/photo-1476041800959-2f6bb412c8ce?auto=format&fit=crop&w=1200&q=70',
};

const getDirectionsUrl = (name: string, lat: number, lon: number) => {
  const encodedName = encodeURIComponent(name);
  if (Platform.OS === 'ios') {
    return `maps://?daddr=${lat},${lon}`;
  }
  if (Platform.OS === 'android') {
    return `geo:0,0?q=${lat},${lon}(${encodedName})`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
};

export const PlaceDetailSheet: React.FC<PlaceDetailSheetProps> = ({
  itinerary,
  visible,
  onClose,
  onRequestSimilar,
}) => {
  const insets = useSafeAreaInsets();
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
      Linking.openURL(
        getDirectionsUrl(itinerary.anchor.name, itinerary.anchor.lat, itinerary.anchor.lon)
      );
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
                bottomInset={insets.bottom}
                onRequestSimilar={onRequestSimilar}
              />
            </View>
          ) : (
            <BlurView intensity={60} tint="light" style={styles.sheet}>
              <View style={styles.sheetInner}>
                <SheetContent
                  itinerary={itinerary}
                  onClose={onClose}
                  onOpenMaps={handleOpenMaps}
                  bottomInset={insets.bottom}
                  onRequestSimilar={onRequestSimilar}
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
  bottomInset: number;
  onRequestSimilar?: (place: Itinerary['anchor']) => void;
}

const SheetContent: React.FC<SheetContentProps> = ({
  itinerary,
  onClose,
  onOpenMaps,
  bottomInset,
  onRequestSimilar,
}) => {
  const { anchor, satellite, mainCharacterScore, metrics } = itinerary;
  const photoUrl = anchor.photoUrl ?? CATEGORY_PHOTOS[anchor.category];
  const hasInfo =
    !!anchor.area ||
    !!anchor.price ||
    !!anchor.bestTimeOfDay ||
    !!anchor.address ||
    !!anchor.gettingThere ||
    !!anchor.website ||
    !!anchor.phone;

  const formattedWebsite = anchor.website
    ? anchor.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : undefined;

  const handleOpenWebsite = () => {
    if (!anchor.website) return;
    let url = anchor.website.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    Linking.openURL(url);
  };

  const handleCallPhone = () => {
    if (!anchor.phone) return;
    const digits = anchor.phone.replace(/[^0-9+]/g, '');
    if (digits.length === 0) return;
    Linking.openURL(`tel:${digits}`);
  };

  return (
    <ScrollView
      style={styles.contentScroll}
      contentContainerStyle={[
        styles.contentScrollContent,
        { paddingBottom: bottomInset },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Handle */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* Photo */}
      <View style={styles.photoContainer}>
        <Image source={{ uri: photoUrl }} style={styles.photo} />
        <View style={styles.photoOverlay} />
        <View style={styles.photoLabel}>
          <Ionicons name="location" size={16} color={colors.white} />
          <Text style={styles.photoLabelText}>{anchor.category}</Text>
        </View>
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

      {/* Info */}
      {hasInfo && (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>About this place</Text>
          <View style={styles.infoGrid}>
            {anchor.area && (
              <InfoRow
                icon="navigate"
                label="Area"
                value={anchor.area.toUpperCase()}
              />
            )}
            {anchor.price && (
              <InfoRow
                icon="cash"
                label="Price"
                value={anchor.price}
              />
            )}
            {anchor.bestTimeOfDay && (
              <InfoRow
                icon="sunny"
                label="Best time"
                value={anchor.bestTimeOfDay}
              />
            )}
            {anchor.website && formattedWebsite && (
              <InfoRow
                icon="link"
                label="Website"
                value={formattedWebsite}
                onPress={handleOpenWebsite}
                isLink
              />
            )}
            {anchor.phone && (
              <InfoRow
                icon="call"
                label="Phone"
                value={anchor.phone}
                onPress={handleCallPhone}
                isLink
              />
            )}
            <InfoRow
              icon={anchor.indoorOutdoor === 'indoor' ? 'home' : 'leaf'}
              label="Setting"
              value={anchor.indoorOutdoor}
            />
          </View>
          {anchor.address && (
            <Text style={styles.addressText}>{anchor.address}</Text>
          )}
        </View>
      )}

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

      {/* Getting there */}
      {anchor.gettingThere && (
        <View style={styles.gettingThereSection}>
          <Text style={styles.sectionTitle}>How to get there</Text>
          <Text style={styles.gettingThereText}>{anchor.gettingThere}</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <View style={styles.actionButton}>
          <GlassButton
            onPress={onOpenMaps}
            label="Directions"
            icon="map"
            variant="primary"
            fullWidth
            size="lg"
          />
        </View>
        {onRequestSimilar && (
          <View style={styles.actionButton}>
            <GlassButton
              onPress={() => onRequestSimilar(anchor)}
              label="More like this"
              icon="shuffle"
              variant="secondary"
              fullWidth
              size="lg"
            />
          </View>
        )}
      </View>
      <View style={{ height: bottomInset }} />
    </ScrollView>
  );
};

const InfoRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
  isLink?: boolean;
}> = ({ icon, label, value, onPress, isLink }) => (
  <Pressable style={styles.infoRow} onPress={onPress} disabled={!onPress}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={14} color={colors.primary} />
    </View>
    <View style={styles.infoText}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[styles.infoValue, isLink && styles.infoLink]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  </Pressable>
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
  contentScroll: {
    flex: 1,
  },
  contentScrollContent: {
    paddingBottom: spacing.xxxl + spacing.lg,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.glass.lightBorder,
  },
  photoContainer: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    height: 180,
    ...shadows.sm,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  photoLabel: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  photoLabelText: {
    color: colors.white,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    marginLeft: spacing.xs,
    textTransform: 'capitalize',
    fontFamily: typography.family.medium,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
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
    fontFamily: typography.family.bold,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginRight: spacing.sm,
    fontFamily: typography.family.regular,
  },
  scoreValue: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.success,
    fontFamily: typography.family.bold,
  },
  description: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
    fontFamily: typography.family.regular,
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
    fontFamily: typography.family.medium,
  },
  infoSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.lightSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    width: '48%',
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginBottom: 2,
    fontFamily: typography.family.regular,
  },
  infoValue: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
    fontFamily: typography.family.semibold,
  },
  infoLink: {
    textDecorationLine: 'underline',
    color: colors.accent,
  },
  addressText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.family.regular,
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
    fontFamily: typography.family.semibold,
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
    fontFamily: typography.family.semibold,
  },
  stepCategory: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
    fontFamily: typography.family.regular,
  },
  stepReason: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    fontFamily: typography.family.regular,
  },
  stepConnector: {
    width: 2,
    height: 20,
    backgroundColor: colors.glass.lightBorder,
    marginLeft: 17,
    marginVertical: spacing.xs,
  },
  gettingThereSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  gettingThereText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
    fontFamily: typography.family.regular,
  },
  actionsRow: {
    flexDirection: 'column',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  actionButton: {
    width: '100%',
  },
});
