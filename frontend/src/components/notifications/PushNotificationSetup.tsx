import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  FormGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  Close as CloseIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  Grade as GradeIcon,
  Event as EventIcon,
  Message as MessageIcon,
  Announcement as AnnouncementIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, gql } from '@apollo/client';

const REGISTER_PUSH_SUBSCRIPTION = gql`
  mutation RegisterPushSubscription($subscription: PushSubscriptionInput!) {
    registerPushSubscription(subscription: $subscription) {
      success
    }
  }
`;

const UPDATE_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateNotificationPreferences($preferences: NotificationPreferencesInput!) {
    updateNotificationPreferences(preferences: $preferences) {
      success
    }
  }
`;

const GET_NOTIFICATION_PREFERENCES = gql`
  query GetNotificationPreferences {
    myNotificationPreferences {
      pushEnabled
      emailEnabled
      assignmentReminders
      quizReminders
      gradeNotifications
      eventReminders
      messageNotifications
      announcementNotifications
    }
  }
`;

interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  assignmentReminders: boolean;
  quizReminders: boolean;
  gradeNotifications: boolean;
  eventReminders: boolean;
  messageNotifications: boolean;
  announcementNotifications: boolean;
}

const defaultPreferences: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  assignmentReminders: true,
  quizReminders: true,
  gradeNotifications: true,
  eventReminders: true,
  messageNotifications: true,
  announcementNotifications: true,
};

export const PushNotificationSetup: React.FC = () => {
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [showDialog, setShowDialog] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const { data: prefsData, loading: prefsLoading } = useQuery(GET_NOTIFICATION_PREFERENCES, {
    fetchPolicy: 'cache-and-network',
  });

  const [registerSubscription] = useMutation(REGISTER_PUSH_SUBSCRIPTION);
  const [updatePreferences] = useMutation(UPDATE_NOTIFICATION_PREFERENCES);

  useEffect(() => {
    // Check current permission state
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (prefsData?.myNotificationPreferences) {
      setPreferences(prefsData.myNotificationPreferences);
    }
  }, [prefsData]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setNotification({ message: 'Push notifications are not supported in this browser', severity: 'warning' });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission === 'granted') {
        await subscribeToPush();
        setNotification({ message: 'Push notifications enabled!', severity: 'success' });
      } else if (permission === 'denied') {
        setNotification({ message: 'Push notifications were denied. You can enable them in browser settings.', severity: 'warning' });
      }
    } catch (error: any) {
      setNotification({ message: `Failed to request permission: ${error.message}`, severity: 'error' });
    }
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotification({ message: 'Push notifications are not supported', severity: 'warning' });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get the VAPID public key from the server (you'd typically fetch this)
      const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
      await registerSubscription({
        variables: {
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
              auth: arrayBufferToBase64(subscription.getKey('auth')),
            },
          },
        },
      });

      setPreferences(prev => ({ ...prev, pushEnabled: true }));
    } catch (error: any) {
      console.error('Failed to subscribe to push:', error);
      setNotification({ message: `Failed to enable push notifications: ${error.message}`, severity: 'error' });
    }
  };

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      await updatePreferences({
        variables: { preferences: newPreferences },
      });
    } catch (error: any) {
      setNotification({ message: 'Failed to save preferences', severity: 'error' });
      // Revert on error
      setPreferences(preferences);
    }
  };

  const notificationTypes = [
    { key: 'assignmentReminders' as const, label: 'Assignment Reminders', icon: <AssignmentIcon />, description: 'Get notified about upcoming assignment deadlines' },
    { key: 'quizReminders' as const, label: 'Quiz Reminders', icon: <QuizIcon />, description: 'Reminders for scheduled quizzes and exams' },
    { key: 'gradeNotifications' as const, label: 'Grade Updates', icon: <GradeIcon />, description: 'When your grades are posted or updated' },
    { key: 'eventReminders' as const, label: 'Event Reminders', icon: <EventIcon />, description: 'Class sessions, office hours, and events' },
    { key: 'messageNotifications' as const, label: 'Messages', icon: <MessageIcon />, description: 'Direct messages from instructors and peers' },
    { key: 'announcementNotifications' as const, label: 'Announcements', icon: <AnnouncementIcon />, description: 'Course and institution announcements' },
  ];

  return (
    <>
      {/* Quick Access Button */}
      <IconButton
        onClick={() => setShowDialog(true)}
        aria-label="Notification settings"
      >
        {permissionState === 'granted' ? (
          <NotificationsActiveIcon color="primary" />
        ) : permissionState === 'denied' ? (
          <NotificationsOffIcon color="error" />
        ) : (
          <NotificationsIcon />
        )}
      </IconButton>

      {/* Settings Dialog */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon color="primary" />
            Notification Settings
          </Box>
          <IconButton onClick={() => setShowDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {/* Permission Status */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle2">Push Notifications</Typography>
                <Typography variant="body2" color="text.secondary">
                  {permissionState === 'granted'
                    ? 'Enabled - You will receive push notifications'
                    : permissionState === 'denied'
                      ? 'Blocked - Enable in browser settings'
                      : 'Not enabled - Click to enable push notifications'}
                </Typography>
              </Box>
              {permissionState === 'default' ? (
                <Button variant="contained" onClick={requestPermission}>
                  Enable
                </Button>
              ) : (
                <Chip
                  label={permissionState === 'granted' ? 'Enabled' : 'Blocked'}
                  color={permissionState === 'granted' ? 'success' : 'error'}
                />
              )}
            </Box>
          </Paper>

          {/* Email Notifications Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={preferences.emailEnabled}
                onChange={(e) => handlePreferenceChange('emailEnabled', e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body1">Email Notifications</Typography>
                <Typography variant="body2" color="text.secondary">
                  Receive notifications via email
                </Typography>
              </Box>
            }
            sx={{ mb: 2, width: '100%', ml: 0 }}
          />

          <Divider sx={{ my: 2 }} />

          {/* Notification Types */}
          <Typography variant="subtitle2" gutterBottom>
            Notification Types
          </Typography>
          <List dense>
            {notificationTypes.map(({ key, label, icon, description }) => (
              <ListItem key={key} sx={{ px: 0 }}>
                <ListItemIcon>{icon}</ListItemIcon>
                <ListItemText
                  primary={label}
                  secondary={description}
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={preferences[key]}
                    onChange={(e) => handlePreferenceChange(key, e.target.checked)}
                    disabled={!preferences.pushEnabled && !preferences.emailEnabled}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          {!preferences.pushEnabled && !preferences.emailEnabled && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Enable push or email notifications to configure notification types.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar
        open={!!notification}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={notification?.severity} onClose={() => setNotification(null)}>
          {notification?.message}
        </Alert>
      </Snackbar>
    </>
  );
};

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export default PushNotificationSetup;
