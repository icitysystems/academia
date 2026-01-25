import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Chip,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  Announcement as AnnouncementIcon,
  Grade as GradeIcon,
  Event as EventIcon,
  Message as MessageIcon,
  CheckCircle as ReadIcon,
  Circle as UnreadIcon,
  MarkEmailRead as MarkAllReadIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
  GET_UNREAD_COUNT,
} from '../../graphql/operations';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
  metadata?: any;
}

const notificationIcons: Record<string, React.ReactElement> = {
  ASSIGNMENT_DUE: <AssignmentIcon />,
  ASSIGNMENT_GRADED: <GradeIcon />,
  QUIZ_AVAILABLE: <QuizIcon />,
  QUIZ_GRADED: <GradeIcon />,
  ANNOUNCEMENT: <AnnouncementIcon />,
  EVENT_REMINDER: <EventIcon />,
  MESSAGE: <MessageIcon />,
  GRADE_POSTED: <GradeIcon />,
  COURSE_UPDATE: <AnnouncementIcon />,
};

const notificationColors: Record<string, string> = {
  ASSIGNMENT_DUE: '#ff9800',
  ASSIGNMENT_GRADED: '#4caf50',
  QUIZ_AVAILABLE: '#2196f3',
  QUIZ_GRADED: '#4caf50',
  ANNOUNCEMENT: '#9c27b0',
  EVENT_REMINDER: '#f44336',
  MESSAGE: '#00bcd4',
  GRADE_POSTED: '#4caf50',
  COURSE_UPDATE: '#673ab7',
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

interface NotificationCenterProps {
  variant?: 'icon' | 'panel';
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ variant = 'icon' }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; notification: Notification | null }>({
    open: false,
    notification: null,
  });

  const { data: notificationsData, loading, refetch } = useQuery(GET_NOTIFICATIONS, {
    variables: { limit: 20 },
    pollInterval: 30000, // Poll every 30 seconds
  });

  const { data: unreadData, refetch: refetchCount } = useQuery(GET_UNREAD_COUNT, {
    pollInterval: 15000, // Poll every 15 seconds
  });

  const [markRead] = useMutation(MARK_NOTIFICATION_READ, {
    onCompleted: () => {
      refetch();
      refetchCount();
    },
  });

  const [markAllRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ, {
    onCompleted: () => {
      refetch();
      refetchCount();
    },
  });

  const notifications: Notification[] = notificationsData?.notifications || [];
  const unreadCount = unreadData?.unreadNotificationCount || 0;

  // Show snackbar for new notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const latestUnread = notifications.find((n) => !n.isRead);
      if (latestUnread) {
        const lastShown = localStorage.getItem('lastNotificationShown');
        if (lastShown !== latestUnread.id) {
          setSnackbar({ open: true, notification: latestUnread });
          localStorage.setItem('lastNotificationShown', latestUnread.id);
        }
      }
    }
  }, [notifications]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markRead({ variables: { notificationId: notification.id } });
    }
    if (notification.link) {
      navigate(notification.link);
    }
    handleClose();
  };

  const handleMarkAllRead = () => {
    markAllRead();
  };

  const renderNotificationItem = (notification: Notification) => (
    <MenuItem
      key={notification.id}
      onClick={() => handleNotificationClick(notification)}
      sx={{
        py: 1.5,
        px: 2,
        bgcolor: notification.isRead ? 'transparent' : 'primary.light',
        '&:hover': {
          bgcolor: notification.isRead ? 'grey.100' : 'primary.200',
        },
      }}
    >
      <ListItemIcon>
        <Avatar
          sx={{
            bgcolor: notificationColors[notification.type] || 'grey.500',
            width: 40,
            height: 40,
          }}
        >
          {notificationIcons[notification.type] || <NotificationsIcon />}
        </Avatar>
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: notification.isRead ? 400 : 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 200,
              }}
            >
              {notification.title}
            </Typography>
            {!notification.isRead && (
              <UnreadIcon sx={{ fontSize: 8, color: 'primary.main' }} />
            )}
          </Box>
        }
        secondary={
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 250,
              }}
            >
              {notification.message}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {formatTimestamp(notification.timestamp)}
            </Typography>
          </Box>
        }
      />
      {notification.link && (
        <OpenIcon fontSize="small" color="action" sx={{ ml: 1 }} />
      )}
    </MenuItem>
  );

  if (variant === 'panel') {
    return (
      <Paper sx={{ p: 2, maxHeight: 500, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" startIcon={<MarkAllReadIcon />} onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography color="text.secondary">No notifications</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => (
              <React.Fragment key={notification.id}>
                {renderNotificationItem(notification)}
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    );
  }

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton color="inherit" onClick={handleOpen}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            {unreadCount > 0 ? <NotificationsActiveIcon /> : <NotificationsIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 500,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} new`}
              size="small"
              color="primary"
            />
          )}
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography color="text.secondary">No notifications</Typography>
          </Box>
        ) : (
          <>
            {notifications.slice(0, 10).map((notification) => (
              <React.Fragment key={notification.id}>
                {renderNotificationItem(notification)}
                <Divider />
              </React.Fragment>
            ))}
          </>
        )}

        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between' }}>
              <Button size="small" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
                Mark all read
              </Button>
              <Button size="small" onClick={() => { navigate('/notifications'); handleClose(); }}>
                View all
              </Button>
            </Box>
          </>
        )}
      </Menu>

      {/* New Notification Snackbar */}
      <Snackbar
        open={snackbar.open && !!snackbar.notification}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ open: false, notification: null })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity="info"
          onClose={() => setSnackbar({ open: false, notification: null })}
          action={
            snackbar.notification?.link ? (
              <Button
                size="small"
                onClick={() => {
                  if (snackbar.notification?.link) {
                    navigate(snackbar.notification.link);
                  }
                  setSnackbar({ open: false, notification: null });
                }}
              >
                View
              </Button>
            ) : undefined
          }
          sx={{ width: '100%' }}
        >
          <Typography variant="subtitle2">{snackbar.notification?.title}</Typography>
          <Typography variant="body2">{snackbar.notification?.message}</Typography>
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationCenter;
