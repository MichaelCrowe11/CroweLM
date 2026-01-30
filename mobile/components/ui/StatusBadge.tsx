import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { colors, typography, borderRadius, spacing } from '../../theme';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending' | 'offline';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  pulse = false,
  size = 'md',
}) => {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  React.useEffect(() => {
    if (pulse) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        false
      );
    }
  }, [pulse]);

  const animatedDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const statusColors: Record<StatusType, string> = {
    success: colors.status.success,
    warning: colors.status.warning,
    error: colors.status.error,
    info: colors.status.info,
    pending: colors.status.pending,
    offline: colors.text.tertiary,
  };

  const sizeStyles = {
    sm: {
      dotSize: 6,
      fontSize: typography.sizes.xs,
      padding: spacing[1],
      paddingHorizontal: spacing[2],
    },
    md: {
      dotSize: 8,
      fontSize: typography.sizes.sm,
      padding: spacing[2],
      paddingHorizontal: spacing[3],
    },
    lg: {
      dotSize: 10,
      fontSize: typography.sizes.base,
      padding: spacing[2],
      paddingHorizontal: spacing[4],
    },
  };

  const currentSize = sizeStyles[size];
  const statusColor = statusColors[status];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${statusColor}20`,
          paddingVertical: currentSize.padding,
          paddingHorizontal: currentSize.paddingHorizontal,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.dot,
          animatedDotStyle,
          {
            width: currentSize.dotSize,
            height: currentSize.dotSize,
            backgroundColor: statusColor,
          },
        ]}
      />
      <Text
        style={[
          styles.label,
          { fontSize: currentSize.fontSize, color: statusColor },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  dot: {
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
  },
  label: {
    fontWeight: '500',
  },
});

export default StatusBadge;
