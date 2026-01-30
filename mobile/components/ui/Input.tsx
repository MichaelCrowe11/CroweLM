import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, borderRadius, spacing } from '../../theme';

const AnimatedView = Animated.createAnimatedComponent(View);

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  variant?: 'default' | 'filled' | 'outlined';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  variant = 'default',
  secureTextEntry,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const focusProgress = useSharedValue(0);
  const labelPosition = useSharedValue(props.value ? 1 : 0);

  const handleFocus = () => {
    setIsFocused(true);
    focusProgress.value = withTiming(1, { duration: 200 });
    labelPosition.value = withSpring(1, { damping: 15, stiffness: 200 });
    Haptics.selectionAsync();
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, { duration: 200 });
    if (!props.value) {
      labelPosition.value = withSpring(0, { damping: 15, stiffness: 200 });
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    const borderColor = error
      ? colors.status.error
      : interpolateColor(
          focusProgress.value,
          [0, 1],
          [colors.border.light, colors.primary[500]]
        );

    return {
      borderColor,
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withTiming(labelPosition.value === 1 ? -24 : 0, {
            duration: 150,
          }),
        },
        {
          scale: withTiming(labelPosition.value === 1 ? 0.85 : 1, {
            duration: 150,
          }),
        },
      ],
      color: error
        ? colors.status.error
        : isFocused
        ? colors.primary[400]
        : colors.text.secondary,
    };
  });

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const variantStyles = {
    default: {
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
    },
    filled: {
      backgroundColor: colors.background.tertiary,
      borderWidth: 0,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
    },
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <AnimatedView
        style={[
          styles.container,
          variantStyles[variant],
          animatedContainerStyle,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={isFocused ? colors.primary[400] : colors.text.tertiary}
            style={styles.leftIcon}
          />
        )}

        <View style={styles.inputWrapper}>
          {label && (
            <Animated.Text style={[styles.label, animatedLabelStyle]}>
              {label}
            </Animated.Text>
          )}
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              leftIcon && styles.inputWithLeftIcon,
              (rightIcon || secureTextEntry) && styles.inputWithRightIcon,
            ]}
            placeholderTextColor={colors.text.tertiary}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            {...props}
          />
        </View>

        {secureTextEntry && (
          <Pressable onPress={togglePasswordVisibility} style={styles.rightIcon}>
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={20}
              color={colors.text.tertiary}
            />
          </Pressable>
        )}

        {rightIcon && !secureTextEntry && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          >
            <Ionicons name={rightIcon} size={20} color={colors.text.tertiary} />
          </Pressable>
        )}
      </AnimatedView>

      {(error || helper) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || helper}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing[4],
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    minHeight: 56,
    paddingHorizontal: spacing[4],
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.sizes.base,
    paddingVertical: spacing[3],
  },
  inputWithLeftIcon: {
    paddingLeft: spacing[2],
  },
  inputWithRightIcon: {
    paddingRight: spacing[2],
  },
  label: {
    position: 'absolute',
    left: 0,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  leftIcon: {
    marginRight: spacing[2],
  },
  rightIcon: {
    padding: spacing[2],
    marginLeft: spacing[1],
  },
  helperText: {
    marginTop: spacing[1],
    marginLeft: spacing[4],
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  errorText: {
    color: colors.status.error,
  },
});

export default Input;
