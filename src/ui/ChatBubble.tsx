import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ChatMessage } from '../types';
import { colors, spacing, radius, typography, animation, shadows } from './theme';
import { PlaceCarousel } from './PlaceCarousel';

interface ChatBubbleProps {
  message: ChatMessage;
  index?: number;
  onRequestSimilar?: (place: Itinerary['anchor']) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  index = 0,
  onRequestSimilar,
}) => {
  const isUser = message.type === 'user';
  const appear = useSharedValue(0);

  useEffect(() => {
    appear.value = withDelay(
      index * 50,
      withSpring(1, animation.spring.gentle)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(appear.value, [0, 1], [20, 0]);
    const translateX = interpolate(
      appear.value,
      [0, 1],
      [isUser ? 30 : -30, 0]
    );
    return {
      opacity: appear.value,
      transform: [
        { translateY },
        { translateX },
        { scale: interpolate(appear.value, [0, 1], [0.95, 1]) },
      ],
    };
  });

  if (isUser) {
    return (
      <Animated.View style={[styles.userContainer, animatedStyle]}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </Animated.View>
    );
  }

  // Assistant message
  return (
    <Animated.View style={[styles.assistantContainer, animatedStyle]}>
      <View style={styles.avatarRow}>
        <View style={styles.helgoAvatar}>
          <Text style={styles.avatarText}>H</Text>
        </View>
        {message.text && (
          <AssistantBubble text={message.text} />
        )}
      </View>
      {message.itineraries && message.itineraries.length > 0 && (
        <View style={styles.carouselContainer}>
          <PlaceCarousel itineraries={message.itineraries} onRequestSimilar={onRequestSimilar} />
        </View>
      )}
    </Animated.View>
  );
};

const AssistantBubble: React.FC<{ text: string }> = ({ text }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.assistantBubbleWeb}>
        <Text style={styles.assistantText}>{text}</Text>
      </View>
    );
  }

  return (
    <BlurView intensity={30} tint="light" style={styles.assistantBlur}>
      <View style={styles.assistantBubble}>
        <Text style={styles.assistantText}>{text}</Text>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  userContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    borderBottomRightRadius: radius.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '80%',
    ...shadows.sm,
  },
  userText: {
    color: colors.white,
    fontSize: typography.size.body,
    fontWeight: typography.weight.regular,
    fontFamily: typography.family.regular,
    lineHeight: typography.size.body * typography.lineHeight.normal,
  },
  assistantContainer: {
    paddingHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  helgoAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    ...shadows.sm,
  },
  avatarText: {
    color: colors.white,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.md,
    fontFamily: typography.family.bold,
  },
  assistantBlur: {
    borderRadius: radius.xl,
    borderTopLeftRadius: radius.xs,
    overflow: 'hidden',
    maxWidth: '85%',
    ...shadows.sm,
  },
  assistantBubble: {
    borderRadius: radius.xl,
    borderTopLeftRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
    backgroundColor: colors.glass.lightSubtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  assistantBubbleWeb: {
    borderRadius: radius.xl,
    borderTopLeftRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '85%',
    ...shadows.sm,
  },
  assistantText: {
    color: colors.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.regular,
    fontFamily: typography.family.regular,
    lineHeight: typography.size.body * typography.lineHeight.normal,
  },
  carouselContainer: {
    marginTop: spacing.md,
    marginLeft: spacing.xxxl + spacing.sm, // Align with text after avatar
  },
});
