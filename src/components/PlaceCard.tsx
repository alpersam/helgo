import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ImageBackground } from 'react-native';
import { Itinerary } from '../types';
import { colors, typography } from '../ui/theme';

interface PlaceCardProps {
  itinerary: Itinerary;
  index: number;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ itinerary, index }) => {
  const { anchor, satellite } = itinerary;
  const photoUrl = anchor.photoUrl;

  const openMaps = () => {
    Linking.openURL(anchor.mapsUrl);
  };

  const mediaHeader = photoUrl ? (
    <View style={styles.mediaHeader}>
      <ImageBackground source={{ uri: photoUrl }} style={styles.imageBackground} imageStyle={styles.imageStyle}>
        <View style={styles.imageOverlay} />
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
      <Text style={styles.placeNameFallback}>{anchor.name}</Text>
    </View>
  );

  const content = (
    <>
      {/* Anchor Place */}
      {!photoUrl && (
        <View style={styles.tagsRow}>
          {anchor.tags.slice(0, 4).map((tag, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Itinerary Flow */}
      <View style={styles.itineraryFlow}>
        <Text style={styles.flowText}>
          Go to <Text style={styles.boldText}>{anchor.name}</Text>
        </Text>
        <Text style={styles.arrow}>-></Text>
        <Text style={styles.flowText}>
          then <Text style={styles.boldText}>{satellite.name}</Text>
        </Text>
        <Text style={styles.reason}>{itinerary.satelliteReason}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity style={styles.mapButton} onPress={openMaps}>
          <Text style={styles.mapButtonText}>Open Maps</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.card}>
      {mediaHeader}
      <View style={styles.contentOverlay}>{content}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginVertical: 8,
    marginHorizontal: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  mediaFallback: {
    marginBottom: 8,
    gap: 6,
  },
  numberBadgeMedia: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  numberTextMedia: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
    fontFamily: typography.family.bold,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: colors.glass.lightSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    fontFamily: typography.family.medium,
  },
  itineraryFlow: {
    backgroundColor: colors.glass.lightSubtle,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  flowText: {
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: typography.family.regular,
  },
  boldText: {
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: typography.family.bold,
  },
  arrow: {
    fontSize: 16,
    color: colors.accent,
    textAlign: 'center',
    marginVertical: 4,
  },
  reason: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 6,
    fontFamily: typography.family.regular,
  },
  buttonsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  mapButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mapButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: typography.family.semibold,
  },
  mediaHeader: {
    borderRadius: 14,
    overflow: 'hidden',
    margin: 12,
    marginBottom: 0,
  },
  imageBackground: {
    width: '100%',
    height: 140,
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderRadius: 16,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 12, 18, 0.45)',
  },
  mediaTextWrap: {
    padding: 12,
  },
  placeNameMedia: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 6,
    fontFamily: typography.family.bold,
  },
  tagsRowMedia: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagMedia: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagTextMedia: {
    fontSize: 11,
    color: colors.white,
    fontWeight: '500',
    fontFamily: typography.family.medium,
  },
  placeNameFallback: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    margin: 16,
    fontFamily: typography.family.bold,
  },
  contentOverlay: {
    padding: 16,
    paddingTop: 12,
  },
});
