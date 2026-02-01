import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '../types';
import { PlaceCard } from './PlaceCard';

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.type === 'user';

  if (isUser) {
    return (
      <View style={styles.userContainer}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  // Assistant message
  return (
    <View style={styles.assistantContainer}>
      <View style={styles.helgoAvatar}>
        <Text style={styles.avatarText}>H</Text>
      </View>
      <View style={styles.assistantContent}>
        {message.text && (
          <Text style={styles.assistantText}>{message.text}</Text>
        )}
        {message.itineraries && message.itineraries.length > 0 && (
          <View style={styles.cardsContainer}>
            {message.itineraries.map((itinerary, index) => (
              <PlaceCard key={itinerary.anchor.id} itinerary={itinerary} index={index} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  userBubble: {
    backgroundColor: '#667EEA',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  userText: {
    color: '#FFF',
    fontSize: 16,
  },
  assistantContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  helgoAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  assistantContent: {
    flex: 1,
  },
  assistantText: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  cardsContainer: {
    marginTop: 8,
  },
});
