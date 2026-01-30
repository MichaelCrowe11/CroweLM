import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Card, StatusBadge, Button } from '../../components/ui';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { api } from '../../services/api';
import { useOfflineCache } from '../../hooks/useOfflineCache';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: [string, string];
  route: string;
}

interface ActivityItem {
  id: string;
  type: 'analysis' | 'molecule' | 'pipeline' | 'error';
  title: string;
  timestamp: string;
  status: 'success' | 'pending' | 'error';
}

const quickActions: QuickAction[] = [
  {
    id: 'target',
    title: 'Target Analysis',
    description: 'Analyze drug targets',
    icon: 'flask',
    color: colors.primary[500],
    gradient: [colors.primary[600], colors.primary[800]],
    route: '/target/new',
  },
  {
    id: 'chat',
    title: 'Research Chat',
    description: 'Ask biotech questions',
    icon: 'chatbubbles',
    color: colors.secondary[500],
    gradient: [colors.secondary[500], colors.secondary[700]],
    route: '/(tabs)/research',
  },
  {
    id: 'pipeline',
    title: 'Drug Pipeline',
    description: 'Run discovery workflow',
    icon: 'git-branch',
    color: colors.accent[500],
    gradient: [colors.accent[500], colors.accent[700]],
    route: '/(tabs)/pipeline',
  },
  {
    id: 'molecules',
    title: 'Molecules',
    description: 'Generate compounds',
    icon: 'cube',
    color: colors.status.warning,
    gradient: ['#f59e0b', '#d97706'],
    route: '/molecule/new',
  },
];

const mockActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'analysis',
    title: 'BRAF Analysis Complete',
    timestamp: '2 hours ago',
    status: 'success',
  },
  {
    id: '2',
    type: 'molecule',
    title: '10 molecules generated',
    timestamp: '5 hours ago',
    status: 'success',
  },
  {
    id: '3',
    type: 'pipeline',
    title: 'EGFR pipeline running',
    timestamp: '1 day ago',
    status: 'pending',
  },
];

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = React.useState(false);
  const [isApiConnected, setIsApiConnected] = React.useState(true);

  const statusPulse = useSharedValue(1);

  useEffect(() => {
    statusPulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      false
    );

    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    const connected = await api.healthCheck();
    setIsApiConnected(connected);
  };

  const {
    data: activity,
    isStale,
    isOffline,
    refresh: refreshActivity,
  } = useOfflineCache<ActivityItem[]>(
    'recent_activity',
    async () => mockActivity,
    { ttl: 60000 }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([checkApiConnection(), refreshActivity()]);
    setRefreshing(false);
  };

  const handleQuickAction = (action: QuickAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(action.route as any);
  };

  const getActivityIcon = (type: ActivityItem['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'analysis': return 'checkmark-circle';
      case 'molecule': return 'flask';
      case 'pipeline': return 'sync';
      case 'error': return 'alert-circle';
      default: return 'information-circle';
    }
  };

  const getActivityColor = (status: ActivityItem['status']): string => {
    switch (status) {
      case 'success': return colors.status.success;
      case 'pending': return colors.status.warning;
      case 'error': return colors.status.error;
      default: return colors.text.secondary;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary[500]}
          colors={[colors.primary[500]]}
        />
      }
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <Text style={styles.title}>CroweLM Biotech</Text>
        <Text style={styles.subtitle}>AI-Powered Drug Discovery Platform</Text>

        <View style={styles.statusRow}>
          <StatusBadge
            status={isApiConnected ? 'success' : 'error'}
            label={isApiConnected ? 'API Connected' : 'API Offline'}
            pulse={isApiConnected}
          />
          <View style={styles.statusSpacer} />
          <StatusBadge status="info" label="NVIDIA NIMs" pulse />
          {isOffline && (
            <>
              <View style={styles.statusSpacer} />
              <StatusBadge status="warning" label="Offline Mode" />
            </>
          )}
        </View>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(200).duration(600)}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <Animated.View
              key={action.id}
              entering={FadeInRight.delay(300 + index * 100).duration(400)}
              style={styles.actionWrapper}
            >
              <Pressable
                onPress={() => handleQuickAction(action)}
                style={({ pressed }) => [
                  styles.actionCard,
                  pressed && styles.actionCardPressed,
                ]}
              >
                <LinearGradient
                  colors={action.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionGradient}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name={action.icon} size={28} color={colors.text.primary} />
                  </View>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* Recent Activity */}
      <Animated.View entering={FadeInDown.delay(600).duration(600)}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Card variant="elevated" padding={0} style={styles.activityCard}>
          {(activity || mockActivity).map((item, index) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.activityItem,
                index < (activity || mockActivity).length - 1 && styles.activityItemBorder,
                pressed && styles.activityItemPressed,
              ]}
              onPress={() => Haptics.selectionAsync()}
            >
              <View
                style={[
                  styles.activityIconContainer,
                  { backgroundColor: `${getActivityColor(item.status)}20` },
                ]}
              >
                <Ionicons
                  name={getActivityIcon(item.type)}
                  size={20}
                  color={getActivityColor(item.status)}
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityTimestamp}>{item.timestamp}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </Pressable>
          ))}
        </Card>
      </Animated.View>

      {/* CTA Section */}
      <Animated.View entering={FadeInDown.delay(800).duration(600)} style={styles.ctaSection}>
        <LinearGradient
          colors={[colors.primary[900], colors.accent[900]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaTitle}>Ready to accelerate drug discovery?</Text>
          <Text style={styles.ctaDescription}>
            Start analyzing targets and generating novel molecules with AI
          </Text>
          <Button
            title="Start New Analysis"
            variant="primary"
            size="lg"
            onPress={() => router.push('/target/new' as any)}
            icon={<Ionicons name="arrow-forward" size={20} color={colors.text.primary} />}
            iconPosition="right"
            style={styles.ctaButton}
          />
        </LinearGradient>
      </Animated.View>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  contentContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
  },
  header: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.sizes['4xl'],
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    marginTop: spacing[1],
    marginBottom: spacing[4],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusSpacer: {
    width: spacing[2],
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing[2],
    marginBottom: spacing[6],
  },
  actionWrapper: {
    width: '50%',
    padding: spacing[2],
  },
  actionCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  actionCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  actionGradient: {
    padding: spacing[4],
    minHeight: 140,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  actionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  actionDescription: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activityCard: {
    marginBottom: spacing[6],
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  activityItemPressed: {
    backgroundColor: colors.background.tertiary,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  activityTimestamp: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  ctaSection: {
    marginBottom: spacing[6],
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  ctaGradient: {
    padding: spacing[6],
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  ctaDescription: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  ctaButton: {
    minWidth: 200,
  },
  footer: {
    height: spacing[10],
  },
});
