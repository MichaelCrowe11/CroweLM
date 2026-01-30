import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing, shadows } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient' | 'glass';
  onPress?: () => void;
  padding?: keyof typeof spacing;
  style?: ViewStyle;
  animated?: boolean;
  haptic?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  onPress,
  padding = 4,
  style,
  animated = true,
  haptic = true,
}) => {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      pressed.value,
      [0, 1],
      [0.25, 0.15],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale: scale.value }],
      shadowOpacity,
    };
  });

  const handlePressIn = () => {
    if (animated && onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      pressed.value = withSpring(1);
    }
  };

  const handlePressOut = () => {
    if (animated && onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      pressed.value = withSpring(0);
    }
  };

  const handlePress = () => {
    if (haptic && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: colors.background.card,
    },
    elevated: {
      backgroundColor: colors.background.elevated,
      ...shadows.lg,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    gradient: {},
    glass: {},
  };

  const containerStyle: ViewStyle = {
    borderRadius: borderRadius.lg,
    padding: spacing[padding],
    overflow: 'hidden',
    ...variantStyles[variant],
  };

  if (variant === 'gradient') {
    const content = (
      <LinearGradient
        colors={[colors.background.secondary, colors.background.tertiary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[containerStyle, style]}
      >
        {children}
      </LinearGradient>
    );

    if (onPress) {
      return (
        <AnimatedPressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={animatedStyle}
        >
          {content}
        </AnimatedPressable>
      );
    }
    return content;
  }

  if (variant === 'glass') {
    const content = (
      <BlurView intensity={20} tint="dark" style={[containerStyle, style]}>
        <View style={styles.glassOverlay}>{children}</View>
      </BlurView>
    );

    if (onPress) {
      return (
        <AnimatedPressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={animatedStyle}
        >
          {content}
        </AnimatedPressable>
      );
    }
    return content;
  }

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[containerStyle, animatedStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <Animated.View style={[containerStyle, style]}>{children}</Animated.View>;
};

const styles = StyleSheet.create({
  glassOverlay: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    flex: 1,
  },
});

export default Card;
