import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  } as Notifications.NotificationBehavior),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === 'granted') {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
    }
  }

  return token;
}

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: { [key: string]: any }
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Send immediately
  });
}

export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
): { subscription: Notifications.Subscription | null } {
  let subscription: Notifications.Subscription | null = null;

  if (onNotificationReceived) {
    subscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
  }

  if (onNotificationResponse) {
    Notifications.addNotificationResponseReceivedListener(onNotificationResponse);
  }

  return { subscription };
}

export function removeNotificationListener(subscription: Notifications.EventSubscription): void {
  subscription.remove();
}

export async function scheduleBookingReminder(
  departureTime: Date,
  routeName: string,
  busName: string
): Promise<string | null> {
  if (departureTime.getTime() < Date.now()) {
    return null;
  }

  const triggerTime = new Date(departureTime.getTime() - 15 * 60 * 1000); // 15 min before

  if (triggerTime.getTime() < Date.now()) {
    return null;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚌 Bus Departure Reminder',
      body: `Your ${routeName} ${busName} departs in 15 minutes!`,
      sound: true,
    },
    trigger: { type: 'date', date: triggerTime.getTime() } as Notifications.DateTriggerInput,
  });

  return id;
}
