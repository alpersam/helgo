import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MetricRowProps {
  emoji: string;
  label: string;
  score?: number;
}

export const MetricRow: React.FC<MetricRowProps> = ({ emoji, label, score }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.label}>{label}</Text>
      {score !== undefined && (
        <View style={styles.scoreContainer}>
          <Text style={styles.score}>{score}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  emoji: {
    fontSize: 14,
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
  scoreContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  score: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
});
