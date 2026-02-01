import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius, shadows } from './theme';

interface GlassViewProps {
  children: React.ReactNode;
  intensity?: 'light' | 'medium' | 'heavy';
  tint?: 'light' | 'dark' | 'default';
  style?: ViewStyle;
  borderRadius?: number;
  border?: boolean;
  shadow?: 'sm' | 'md' | 'lg' | 'none';
  padding?: number;
}

const blurIntensity = {
  light: 25,
  medium: 40,
  heavy: 60,
};

export const GlassView: React.FC<GlassViewProps> = ({
  children,
  intensity = 'medium',
  tint = 'light',
  style,
  borderRadius = radius.lg,
  border = true,
  shadow = 'md',
  padding,
}) => {
  const shadowStyle = shadow !== 'none' ? shadows[shadow] : {};

  // For web, we use a fallback since BlurView doesn't work well
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.webFallback,
          {
            borderRadius,
            borderWidth: border ? 1 : 0,
            borderColor: colors.glass.lightBorder,
            padding,
          },
          shadowStyle,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={[{ borderRadius, overflow: 'hidden' }, shadowStyle, style]}>
      <BlurView
        intensity={blurIntensity[intensity]}
        tint={tint}
        style={[
          styles.blur,
          {
            borderRadius,
            padding,
          },
        ]}
      >
        <View
          style={[
            styles.innerContainer,
            {
              borderRadius,
              borderWidth: border ? 1 : 0,
              borderColor:
                tint === 'dark'
                  ? 'rgba(255,255,255,0.12)'
                  : colors.glass.lightBorder,
              backgroundColor:
                tint === 'dark'
                  ? colors.glass.darkSubtle
                  : colors.glass.lightSubtle,
            },
          ]}
        >
          {children}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  blur: {
    overflow: 'hidden',
  },
  innerContainer: {
    flex: 1,
  },
  webFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
});
