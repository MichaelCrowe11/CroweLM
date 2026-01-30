import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, borderRadius, spacing } from '../../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  haptic = true,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.9, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  const sizeStyles = {
    sm: {
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[3],
      fontSize: typography.sizes.sm,
    },
    md: {
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[5],
      fontSize: typography.sizes.base,
    },
    lg: {
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[6],
      fontSize: typography.sizes.md,
    },
  };

  const variantStyles = {
    primary: {
      container: {
        backgroundColor: colors.primary[600],
      },
      text: {
        color: colors.text.primary,
      },
    },
    secondary: {
      container: {
        backgroundColor: colors.secondary[600],
      },
      text: {
        color: colors.text.primary,
      },
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary[500],
      },
      text: {
        color: colors.primary[400],
      },
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
      },
      text: {
        color: colors.primary[400],
      },
    },
    gradient: {
      container: {
        backgroundColor: 'transparent',
      },
      text: {
        color: colors.text.primary,
      },
    },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={currentVariant.text.color}
          style={{ marginRight: icon || title ? spacing[2] : 0 }}
        />
      ) : (
        icon && iconPosition === 'left' && (
          <Animated.View style={{ marginRight: spacing[2] }}>{icon}</Animated.View>
        )
      )}
      <Text
        style={[
          styles.text,
          { fontSize: currentSize.fontSize },
          currentVariant.text,
          textStyle,
        ]}
      >
        {title}
      </Text>
      {icon && iconPosition === 'right' && !loading && (
        <Animated.View style={{ marginLeft: spacing[2] }}>{icon}</Animated.View>
      )}
    </>
  );

  if (variant === 'gradient') {
    return (
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          animatedStyle,
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          style,
        ]}
        activeOpacity={1}
      >
        <LinearGradient
          colors={[colors.primary[500], colors.accent[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.container,
            {
              paddingVertical: currentSize.paddingVertical,
              paddingHorizontal: currentSize.paddingHorizontal,
            },
          ]}
        >
          {buttonContent}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.container,
        animatedStyle,
        {
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
        },
        currentVariant.container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={1}
    >
      {buttonContent}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;
