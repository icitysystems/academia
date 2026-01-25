import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Surface,
  IconButton,
  Button,
  useTheme,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNotifications } from '../../contexts/NotificationContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

const NotificationsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'GRADE_POSTED':
        return 'grade';
      case 'ASSIGNMENT_DUE':
        return 'assignment';
      case 'QUIZ_AVAILABLE':
        return 'quiz';
      case 'COURSE_UPDATE':
        return 'school';
      case 'DISCUSSION_REPLY':
        return 'forum';
      case 'CERTIFICATE_EARNED':
        return 'workspace-premium';
      case 'LIVE_SESSION':
        return 'videocam';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'GRADE_POSTED':
        return '#4caf50';
      case 'ASSIGNMENT_DUE':
        return '#ff9800';
      case 'QUIZ_AVAILABLE':
        return '#2196f3';
      case 'COURSE_UPDATE':
        return '#9c27b0';
      case 'DISCUSSION_REPLY':
        return '#00bcd4';
      case 'CERTIFICATE_EARNED':
        return '#ffc107';
      case 'LIVE_SESSION':
        return '#f44336';
      default:
        return '#757575';
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on type
    if (notification.data) {
      switch (notification.type) {
        case 'GRADE_POSTED':
        case 'ASSIGNMENT_DUE':
          if (notification.data.courseId && notification.data.assignmentId) {
            navigation.navigate('Assignment', {
              courseId: notification.data.courseId,
              assignmentId: notification.data.assignmentId,
            });
          }
          break;
        case 'QUIZ_AVAILABLE':
          if (notification.data.courseId && notification.data.quizId) {
            navigation.navigate('Quiz', {
              courseId: notification.data.courseId,
              quizId: notification.data.quizId,
            });
          }
          break;
        case 'COURSE_UPDATE':
          if (notification.data.courseId) {
            navigation.navigate('CourseDetail', {
              courseId: notification.data.courseId,
            });
          }
          break;
        case 'DISCUSSION_REPLY':
          if (notification.data.courseId) {
            navigation.navigate('Discussion', {
              courseId: notification.data.courseId,
              threadId: notification.data.threadId,
            });
          }
          break;
        case 'CERTIFICATE_EARNED':
          navigation.navigate('Certificates');
          break;
        case 'LIVE_SESSION':
          if (notification.data.sessionId) {
            navigation.navigate('LiveSession', {
              sessionId: notification.data.sessionId,
            });
          }
          break;
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <Surface
        style={[
          styles.notificationItem,
          !item.read && styles.unreadItem,
        ]}
        elevation={item.read ? 0 : 1}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getNotificationColor(item.type) + '20' },
          ]}
        >
          <MaterialIcons
            name={getNotificationIcon(item.type)}
            size={24}
            color={getNotificationColor(item.type)}
          />
        </View>
        <View style={styles.contentContainer}>
          <Text
            variant="titleSmall"
            style={[styles.title, !item.read && styles.unreadText]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            variant="bodySmall"
            style={styles.message}
            numberOfLines={2}
          >
            {item.message}
          </Text>
          <Text variant="labelSmall" style={styles.time}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </Surface>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <View style={styles.header}>
          <Text variant="bodyMedium">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
          <Button mode="text" onPress={markAllAsRead} compact>
            Mark all as read
          </Button>
        </View>
      )}

      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <Divider />}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshNotifications}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="notifications-none"
                size={64}
                color="#ccc"
              />
              <Text variant="bodyLarge" style={styles.emptyText}>
                No notifications yet
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtext}>
                We'll notify you when something important happens
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listContent: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  unreadItem: {
    backgroundColor: '#f5f9ff',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontWeight: '600',
  },
  unreadText: {
    fontWeight: 'bold',
  },
  message: {
    color: '#666',
    marginTop: 2,
  },
  time: {
    color: '#999',
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1976d2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default NotificationsScreen;
