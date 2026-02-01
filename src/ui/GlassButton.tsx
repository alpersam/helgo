import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from './GlassView';
import { colors, spacing, radius, typography, animation } from './theme';

interface GlassButtonProps {
  onPress: () => void;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GlassButton: React.FC<GlassButtonProps> = ({
  onPress,
  label,
  icon,
  iconPosition = 'left',
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  fullWidth = false,
}) => {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: interpolate(pressed.value, [0, 1], [1, 0.95]) },
      ],
      opacity: interpolate(pressed.value, [0, 1], [1, 0.85]),
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

  const sizeStyles = {
    sm: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      iconSize: 16,
      fontSize: typography.size.sm,
    },
    md: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      iconSize: 20,
      fontSize: typography.size.md,
    },
    lg: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      iconSize: 24,
      fontSize: typography.size.body,
    },
  };

  const variantStyles: Record<string, { bg: string; text: string; tint: 'light' | 'dark' }> = {
    primary: {
      bg: colors.primary,
      text: colors.white,
      tint: 'dark',
    },
    secondary: {
      bg: colors.white,
      text: colors.text.primary,
      tint: 'light',
    },
    ghost: {
      bg: 'transparent',
      text: colors.primary,
      tint: 'light',
    },
    accent: {
      bg: colors.accent,
      text: colors.white,
      tint: 'dark',
    },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  const content = (
    <>
      {icon && iconPosition === 'left' && (
        <Ionicons
          name={icon}
          size={currentSize.iconSize}
          color={currentVariant.text}
          style={label ? styles.iconLeft : undefined}
        />
      )}
      {label && (
        <Text
          style={[
            styles.label,
            {
              fontSize: currentSize.fontSize,
              color: currentVariant.text,
            },
          ]}
        >
          {label}
        </Text>
      )}
      {icon && iconPosition === 'right' && (
        <Ionicons
          name={icon}
          size={currentSize.iconSize}
          color={currentVariant.text}
          style={label ? styles.iconRight : undefined}
        />
      )}
    </>
  );

  if (variant === 'ghost') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          animatedStyle,
          styles.container,
          {
            paddingVertical: currentSize.paddingVertical,
            paddingHorizontal: currentSize.paddingHorizontal,
            opacity: disabled ? 0.5 : 1,
          },
          fullWidth && styles.fullWidth,
          style,
        ]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animatedStyle, fullWidth && styles.fullWidth, style]}
    >
      <View
        style={[
          styles.container,
          {
            paddingVertical: currentSize.paddingVertical,
            paddingHorizontal: currentSize.paddingHorizontal,
            backgroundColor: currentVariant.bg,
            opacity: disabled ? 0.5 : 1,
            width: fullWidth ? '100%' : undefined,
            borderWidth: variant === 'secondary' ? 1 : 0,
            borderColor: variant === 'secondary' ? colors.glass.lightBorder : 'transparent',
          },
        ]}
      >
        {content}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    fontWeight: typography.weight.semibold,
    letterSpacing: typography.letterSpacing.normal,
    fontFamily: typography.family.semibold,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
