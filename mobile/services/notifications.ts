/**
 * Push Notification Service
 * Handles push notifications for pipeline status updates
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const PUSH_TOKEN_KEY = 'push_token';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type NotificationType =
  | 'pipeline_started'
  | 'pipeline_progress'
  | 'pipeline_completed'
  | 'pipeline_failed'
  | 'molecule_generated'
  | 'target_analyzed'
  | 'system';

interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  async initialize(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get Expo push token
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      this.expoPushToken = tokenData.data;

      // Store token locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, this.expoPushToken);

      // Register token with backend
      await this.registerTokenWithBackend(this.expoPushToken);

      // Configure Android channel
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('pipeline', {
      name: 'Pipeline Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('results', {
      name: 'Analysis Results',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('system', {
      name: 'System Notifications',
      importance: Notifications.AndroidImportance.LOW,
    });
  }

  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      // This would register the token with your backend
      // await api.registerPushToken(token);
      console.log('Push token registered:', token.substring(0, 20) + '...');
    } catch (error) {
      console.error('Failed to register push token with backend:', error);
    }
  }

  // Add notification listeners
  addListeners(
    onNotification: (notification: Notifications.Notification) => void,
    onResponse: (response: Notifications.NotificationResponse) => void
  ): void {
    this.notificationListener = Notifications.addNotificationReceivedListener(
      onNotification
    );

    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      onResponse
    );
  }

  // Remove notification listeners
  removeListeners(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  // Schedule local notification
  async scheduleLocalNotification(
    payload: NotificationPayload,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    const channelId = this.getChannelForType(payload.type);

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: {
          type: payload.type,
          ...payload.data,
        },
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: trigger || null,
    });
  }

  private getChannelForType(type: NotificationType): string {
    switch (type) {
      case 'pipeline_started':
      case 'pipeline_progress':
      case 'pipeline_completed':
      case 'pipeline_failed':
        return 'pipeline';
      case 'molecule_generated':
      case 'target_analyzed':
        return 'results';
      default:
        return 'system';
    }
  }

  // Cancel scheduled notification
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear badge
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  // Utility methods for common notifications
  async notifyPipelineStarted(pipelineId: string, targetId: string): Promise<string> {
    return await this.scheduleLocalNotification({
      type: 'pipeline_started',
      title: 'Pipeline Started',
      body: `Drug discovery pipeline for ${targetId} has started`,
      data: { pipelineId, targetId },
    });
  }

  async notifyPipelineProgress(
    pipelineId: string,
    stage: string,
    progress: number
  ): Promise<string> {
    return await this.scheduleLocalNotification({
      type: 'pipeline_progress',
      title: 'Pipeline Progress',
      body: `${stage}: ${Math.round(progress * 100)}% complete`,
      data: { pipelineId, stage, progress },
    });
  }

  async notifyPipelineCompleted(pipelineId: string, targetId: string): Promise<string> {
    return await this.scheduleLocalNotification({
      type: 'pipeline_completed',
      title: 'Pipeline Complete',
      body: `Analysis for ${targetId} is ready to view`,
      data: { pipelineId, targetId },
    });
  }

  async notifyPipelineFailed(
    pipelineId: string,
    error: string
  ): Promise<string> {
    return await this.scheduleLocalNotification({
      type: 'pipeline_failed',
      title: 'Pipeline Failed',
      body: error,
      data: { pipelineId, error },
    });
  }

  async notifyMoleculesGenerated(count: number, smiles: string): Promise<string> {
    return await this.scheduleLocalNotification({
      type: 'molecule_generated',
      title: 'Molecules Generated',
      body: `${count} new molecules generated`,
      data: { count, smiles },
    });
  }
}

// Singleton instance
export const notifications = new NotificationService();

export default notifications;
