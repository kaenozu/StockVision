/**
 * Push notification service for stock alerts and updates
 * Handles local notifications and push notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StockAlert {
  id: string;
  symbol: string;
  type: 'price_target' | 'price_change' | 'volume_spike' | 'news';
  targetPrice?: number;
  percentChange?: number;
  currentPrice?: number;
  message: string;
  isActive: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  pushNotificationsEnabled: boolean;
  priceAlertsEnabled: boolean;
  newsAlertsEnabled: boolean;
  marketOpenCloseEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
  };
}

class NotificationServiceClass {
  private expoPushToken: string | null = null;
  private settings: NotificationSettings = {
    pushNotificationsEnabled: true,
    priceAlertsEnabled: true,
    newsAlertsEnabled: true,
    marketOpenCloseEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
    },
  };

  async initialize(): Promise<void> {
    console.log('Initializing NotificationService...');
    
    try {
      // Load settings from storage
      await this.loadSettings();
      
      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: this.settings.soundEnabled,
          shouldSetBadge: true,
        }),
      });

      // Register for push notifications
      if (this.settings.pushNotificationsEnabled) {
        await this.registerForPushNotifications();
      }

      // Schedule market open/close notifications
      if (this.settings.marketOpenCloseEnabled) {
        await this.scheduleMarketNotifications();
      }

      console.log('NotificationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem('notification_settings');
      if (settingsJson) {
        this.settings = { ...this.settings, ...JSON.parse(settingsJson) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(this.settings));
      
      // Re-register if push notifications setting changed
      if (newSettings.pushNotificationsEnabled !== undefined) {
        if (newSettings.pushNotificationsEnabled) {
          await this.registerForPushNotifications();
        } else {
          this.expoPushToken = null;
        }
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  private async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;
      console.log('Expo push token:', token);
      
      // Send token to backend
      await this.sendTokenToBackend(token);
      
      return token;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      // Replace with your backend endpoint
      const response = await fetch('http://localhost:8080/api/notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Failed to register push token with backend:', error);
    }
  }

  async scheduleStockAlert(alert: Omit<StockAlert, 'id' | 'createdAt'>): Promise<string> {
    const alertId = `${alert.symbol}_${alert.type}_${Date.now()}`;
    const fullAlert: StockAlert = {
      ...alert,
      id: alertId,
      createdAt: new Date().toISOString(),
    };

    try {
      // Store alert in local storage
      const existingAlerts = await this.getStoredAlerts();
      const updatedAlerts = [...existingAlerts, fullAlert];
      await AsyncStorage.setItem('stock_alerts', JSON.stringify(updatedAlerts));

      console.log('Stock alert scheduled:', fullAlert);
      return alertId;
    } catch (error) {
      console.error('Failed to schedule stock alert:', error);
      throw error;
    }
  }

  async cancelStockAlert(alertId: string): Promise<void> {
    try {
      const existingAlerts = await this.getStoredAlerts();
      const updatedAlerts = existingAlerts.filter(alert => alert.id !== alertId);
      await AsyncStorage.setItem('stock_alerts', JSON.stringify(updatedAlerts));
      
      console.log('Stock alert cancelled:', alertId);
    } catch (error) {
      console.error('Failed to cancel stock alert:', error);
    }
  }

  async getStoredAlerts(): Promise<StockAlert[]> {
    try {
      const alertsJson = await AsyncStorage.getItem('stock_alerts');
      return alertsJson ? JSON.parse(alertsJson) : [];
    } catch (error) {
      console.error('Failed to get stored alerts:', error);
      return [];
    }
  }

  async checkAndTriggerAlerts(symbol: string, currentPrice: number): Promise<void> {
    if (!this.settings.priceAlertsEnabled) {
      return;
    }

    if (this.isInQuietHours()) {
      return;
    }

    try {
      const alerts = await this.getStoredAlerts();
      const activeAlerts = alerts.filter(alert => 
        alert.symbol === symbol && 
        alert.isActive &&
        alert.type === 'price_target'
      );

      for (const alert of activeAlerts) {
        if (alert.targetPrice && this.shouldTriggerPriceAlert(alert, currentPrice)) {
          await this.sendLocalNotification(
            `${symbol} Price Alert`,
            `${symbol} has reached $${currentPrice.toFixed(2)} (target: $${alert.targetPrice.toFixed(2)})`,
            { alertId: alert.id, symbol, currentPrice }
          );

          // Deactivate the alert after triggering
          await this.deactivateAlert(alert.id);
        }
      }
    } catch (error) {
      console.error('Failed to check and trigger alerts:', error);
    }
  }

  private shouldTriggerPriceAlert(alert: StockAlert, currentPrice: number): boolean {
    if (!alert.targetPrice) return false;

    // Trigger if price crosses the target (either direction)
    return Math.abs(currentPrice - alert.targetPrice) < 0.01 || 
           (alert.currentPrice && 
            ((alert.currentPrice < alert.targetPrice && currentPrice >= alert.targetPrice) ||
             (alert.currentPrice > alert.targetPrice && currentPrice <= alert.targetPrice)));
  }

  private async deactivateAlert(alertId: string): Promise<void> {
    try {
      const alerts = await this.getStoredAlerts();
      const updatedAlerts = alerts.map(alert => 
        alert.id === alertId ? { ...alert, isActive: false } : alert
      );
      await AsyncStorage.setItem('stock_alerts', JSON.stringify(updatedAlerts));
    } catch (error) {
      console.error('Failed to deactivate alert:', error);
    }
  }

  async sendLocalNotification(
    title: string, 
    body: string, 
    data?: any
  ): Promise<string> {
    if (this.isInQuietHours()) {
      console.log('Notification suppressed due to quiet hours');
      return '';
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: this.settings.soundEnabled ? 'default' : undefined,
        },
        trigger: null, // Send immediately
      });

      console.log('Local notification sent:', { title, body, notificationId });
      return notificationId;
    } catch (error) {
      console.error('Failed to send local notification:', error);
      return '';
    }
  }

  private isInQuietHours(): boolean {
    if (!this.settings.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { startTime, endTime } = this.settings.quietHours;
    
    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  private async scheduleMarketNotifications(): Promise<void> {
    try {
      // Cancel existing scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Market open notification (9:30 AM ET weekdays)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Market Open',
          body: 'US stock markets are now open for trading',
          data: { type: 'market_open' },
        },
        trigger: {
          weekday: [2, 3, 4, 5, 6], // Monday to Friday (1 = Sunday)
          hour: 9,
          minute: 30,
          repeats: true,
        },
      });

      // Market close notification (4:00 PM ET weekdays)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Market Close',
          body: 'US stock markets have closed for the day',
          data: { type: 'market_close' },
        },
        trigger: {
          weekday: [2, 3, 4, 5, 6], // Monday to Friday
          hour: 16,
          minute: 0,
          repeats: true,
        },
      });

      console.log('Market notifications scheduled');
    } catch (error) {
      console.error('Failed to schedule market notifications:', error);
    }
  }

  // Handle notification received while app is in foreground
  addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  // Handle notification tapped (app was in background/killed)
  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

export const NotificationService = new NotificationServiceClass();