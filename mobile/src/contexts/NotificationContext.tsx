import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => void;
  expoPushToken: string | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const GET_NOTIFICATIONS = gql`
  query GetNotifications {
    myNotifications {
      id
      type
      title
      message
      read
      createdAt
      data
    }
  }
`;

const MARK_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id) {
      id
      read
    }
  }
`;

const MARK_ALL_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

const REGISTER_PUSH_TOKEN = gql`
  mutation RegisterPushToken($token: String!, $platform: String!) {
    registerPushToken(token: $token, platform: $platform)
  }
`;

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(GET_NOTIFICATIONS, {
    skip: !isAuthenticated,
    pollInterval: 60000, // Poll every minute
  });

  const [markReadMutation] = useMutation(MARK_READ);
  const [markAllReadMutation] = useMutation(MARK_ALL_READ);
  const [registerPushTokenMutation] = useMutation(REGISTER_PUSH_TOKEN);

  const notifications: Notification[] = data?.myNotifications || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Register for push notifications
  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications();
    }
  }, [isAuthenticated]);

  // Set up notification listeners
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      refetch();
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      // Handle navigation based on notification data
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [refetch]);

  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setExpoPushToken(token);

      // Register token with backend
      await registerPushTokenMutation({
        variables: {
          token,
          platform: Platform.OS,
        },
      });

      // Configure Android channel
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1976d2',
        });
      }
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
    }
  };

  const markAsRead = useCallback(
    async (id: string) => {
      await markReadMutation({ variables: { id } });
      refetch();
    },
    [markReadMutation, refetch]
  );

  const markAllAsRead = useCallback(async () => {
    await markAllReadMutation();
    refetch();
  }, [markAllReadMutation, refetch]);

  const refreshNotifications = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading: loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        expoPushToken,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export default NotificationContext;
