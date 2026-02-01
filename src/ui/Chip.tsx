import React from 'react';
import { Pressable, Text, StyleSheet, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography, animation } from './theme';

interface ChipProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  selected?: boolean;
  variant?: 'default' | 'accent';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  onPress,
  selected = false,
  variant = 'default',
}) => {
  const pressed = useSharedValue(0);
  const shine = useSharedValue(-1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: interpolate(pressed.value, [0, 1], [1, 0.92]) },
      ],
    };
  });

  const shineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shine.value * 150 }],
      opacity: interpolate(shine.value, [-1, 0, 1], [0, 0.6, 0]),
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
    // Trigger shine animation
    shine.value = withSequence(
      withTiming(-1, { duration: 0 }),
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    onPress();
  };

  const isAccent = variant === 'accent' || selected;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle]}
    >
      <View
        style={[
          styles.container,
          isAccent && styles.containerAccent,
        ]}
      >
        {/* Shine overlay */}
        <Animated.View style={[styles.shineContainer, shineStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shine}
          />
        </Animated.View>

        {icon && (
          <Ionicons
            name={icon}
            size={14}
            color={isAccent ? colors.white : colors.primary}
            style={styles.icon}
          />
        )}
        <Text
          style={[
            styles.label,
            isAccent && styles.labelAccent,
          ]}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.lightSubtle,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glass.lightBorder,
    overflow: 'hidden',
  },
  containerAccent: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  shineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  shine: {
    width: 40,
    height: '100%',
  },
  icon: {
    marginRight: spacing.xs + 2,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.primary,
    letterSpacing: typography.letterSpacing.normal,
    fontFamily: typography.family.medium,
  },
  labelAccent: {
    color: colors.white,
  },
});
