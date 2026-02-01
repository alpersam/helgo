import React, { useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, spacing, radius, typography, animation, shadows } from './theme';

interface InputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

export const InputBar: React.FC<InputBarProps> = ({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'What are you in the mood for?',
  disabled = false,
}) => {
  const hasText = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const buttonRotation = useSharedValue(0);
  const glowIntensity = useSharedValue(0);

  useEffect(() => {
    hasText.value = withSpring(value.trim().length > 0 ? 1 : 0, animation.spring.gentle);
  }, [value]);

  const buttonContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: buttonScale.value },
        { rotate: `${buttonRotation.value}deg` },
      ],
    };
  });

  const buttonBackgroundStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      hasText.value,
      [0, 1],
      [colors.glass.lightSubtle, colors.primary]
    );
    return { backgroundColor };
  });

  const iconStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      hasText.value,
      [0, 1],
      [colors.text.tertiary, colors.white]
    );
    const translateX = interpolate(
      hasText.value,
      [0, 1],
      [0, 2],
      Extrapolation.CLAMP
    );
    return {
      color,
      transform: [{ translateX }],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowIntensity.value * 0.5,
      transform: [{ scale: 1 + glowIntensity.value * 0.3 }],
    };
  });

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.9, animation.spring.snappy);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, animation.spring.bouncy);
  };

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Bounce animation
    buttonScale.value = withSequence(
      withSpring(0.85, animation.spring.snappy),
      withSpring(1.15, animation.spring.bouncy),
      withSpring(1, animation.spring.gentle)
    );

    // Rotation flourish
    buttonRotation.value = withSequence(
      withSpring(-15, { damping: 8, stiffness: 400 }),
      withSpring(0, animation.spring.gentle)
    );

    // Glow pulse
    glowIntensity.value = withSequence(
      withSpring(1, { damping: 10, stiffness: 200 }),
      withSpring(0, { damping: 15, stiffness: 100 })
    );

    onSubmit();
  };

  const inputContent = (
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
        editable={!disabled}
        multiline={false}
      />
      <View style={styles.buttonWrapper}>
        {/* Glow effect */}
        <Animated.View style={[styles.glow, glowStyle]} />

        <AnimatedPressable
          onPress={handleSubmit}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!value.trim() || disabled}
          style={buttonContainerStyle}
        >
          <Animated.View style={[styles.sendButton, buttonBackgroundStyle]}>
            <AnimatedIonicons
              name="arrow-up"
              size={22}
              style={iconStyle}
            />
          </Animated.View>
        </AnimatedPressable>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        {inputContent}
      </View>
    );
  }

  return (
    <BlurView intensity={40} tint="light" style={styles.container}>
      <View style={styles.innerBorder}>
        {inputContent}
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  webContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
    ...shadows.lg,
  },
  innerBorder: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
    backgroundColor: colors.glass.lightSubtle,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.size.body,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  buttonWrapper: {
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: radius.circle,
    backgroundColor: colors.primary,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
  },
});
