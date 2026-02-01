import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Itinerary } from '../types';
import { colors, typography } from '../ui/theme';
import { MetricRow } from './MetricRow';

interface PlaceCardProps {
  itinerary: Itinerary;
  index: number;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ itinerary, index }) => {
  const { anchor, satellite, mainCharacterScore, metrics } = itinerary;

  const openMaps = () => {
    Linking.openURL(anchor.mapsUrl);
  };


  const getScoreColor = (score: number) => {
    if (score >= 70) return colors.success;
    if (score >= 40) return colors.accent;
    return colors.text.tertiary;
  };

  return (
    <View style={styles.card}>
      {/* Header with number */}
      <View style={styles.header}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{index + 1}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Main Character</Text>
          <Text style={[styles.score, { color: getScoreColor(mainCharacterScore) }]}>
            {mainCharacterScore}/100
          </Text>
        </View>
      </View>

      {/* Anchor Place */}
      <Text style={styles.placeName}>{anchor.name}</Text>
      <View style={styles.tagsRow}>
        {anchor.tags.slice(0, 4).map((tag, i) => (
          <View key={i} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      {/* Itinerary Flow */}
      <View style={styles.itineraryFlow}>
        <Text style={styles.flowText}>
          Go to <Text style={styles.boldText}>{anchor.name}</Text>
        </Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.flowText}>
          then <Text style={styles.boldText}>{satellite.name}</Text>
        </Text>
        <Text style={styles.reason}>{itinerary.satelliteReason}</Text>
      </View>

      {/* Metrics */}
      <View style={styles.metricsContainer}>
        <MetricRow
          emoji={metrics.reflectionPotential.emoji}
          label={metrics.reflectionPotential.label}
        />
        <MetricRow
          emoji={metrics.nightGlow.emoji}
          label={metrics.nightGlow.label}
        />
        <MetricRow
          emoji={metrics.greenPocket.emoji}
          label={metrics.greenPocket.label}
        />
        {metrics.fogEscape.score > 50 && (
          <MetricRow
            emoji={metrics.fogEscape.emoji}
            label={metrics.fogEscape.label}
          />
        )}
        {metrics.windShelter.score > 50 && (
          <MetricRow
            emoji={metrics.windShelter.emoji}
            label={metrics.windShelter.label}
          />
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity style={styles.mapButton} onPress={openMaps}>
          <Text style={styles.mapButtonText}>📍 Open Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: typography.family.bold,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: typography.family.regular,
  },
  score: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: typography.family.bold,
  },
  placeName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
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
  metricsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.glass.lightBorder,
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
});
