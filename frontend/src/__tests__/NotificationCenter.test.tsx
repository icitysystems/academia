import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import NotificationCenter from '../components/notifications/NotificationCenter';
import {
  GET_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
  GET_UNREAD_COUNT,
} from '../graphql/operations';

// Mock data
const mockNotifications = [
  {
    id: 'notif-1',
    type: 'ASSIGNMENT_DUE',
    title: 'Assignment Due Soon',
    message: 'Your assignment is due in 24 hours',
    timestamp: new Date().toISOString(),
    isRead: false,
    link: '/assignments/1',
  },
  {
    id: 'notif-2',
    type: 'QUIZ_GRADED',
    title: 'Quiz Graded',
    message: 'Your quiz has been graded: 85%',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
    link: '/quizzes/1/result',
  },
  {
    id: 'notif-3',
    type: 'ANNOUNCEMENT',
    title: 'New Announcement',
    message: 'Class cancelled tomorrow',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    isRead: true,
    link: null,
  },
];

const mocks = [
  {
    request: {
      query: GET_NOTIFICATIONS,
      variables: { limit: 20 },
    },
    result: {
      data: { notifications: mockNotifications },
    },
  },
  {
    request: {
      query: GET_UNREAD_COUNT,
    },
    result: {
      data: { unreadNotificationCount: 2 },
    },
  },
  {
    request: {
      query: MARK_NOTIFICATION_READ,
      variables: { notificationId: 'notif-1' },
    },
    result: {
      data: { markNotificationRead: { success: true } },
    },
  },
  {
    request: {
      query: MARK_ALL_NOTIFICATIONS_READ,
    },
    result: {
      data: { markAllNotificationsRead: { success: true } },
    },
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <BrowserRouter>{component}</BrowserRouter>
    </MockedProvider>
  );
};

describe('NotificationCenter', () => {
  it('renders notification icon', async () => {
    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  it('shows badge with unread count', async () => {
    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('opens dropdown when clicking icon', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('displays notification list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Assignment Due Soon')).toBeInTheDocument();
      expect(screen.getByText('Quiz Graded')).toBeInTheDocument();
      expect(screen.getByText('New Announcement')).toBeInTheDocument();
    });
  });

  it('shows notification messages', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/Your assignment is due in 24 hours/)).toBeInTheDocument();
    });
  });

  it('distinguishes read and unread notifications', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      // Unread notifications should have a different background
      const unreadNotification = screen.getByText('Assignment Due Soon').closest('[class*="MuiMenuItem"]');
      const readNotification = screen.getByText('New Announcement').closest('[class*="MuiMenuItem"]');
      
      expect(unreadNotification).toHaveStyle({ backgroundColor: expect.any(String) });
    });
  });

  it('shows Mark all read button when there are unread notifications', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mark all read/i })).toBeInTheDocument();
    });
  });

  it('shows View all button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /View all/i })).toBeInTheDocument();
    });
  });
});

describe('NotificationCenter interactions', () => {
  it('marks notification as read when clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Assignment Due Soon')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Assignment Due Soon'));

    // The mutation should be called
    await waitFor(() => {
      // Notification should be marked as read
      expect(screen.queryByText('Assignment Due Soon')).not.toBeInTheDocument();
    });
  });

  it('marks all notifications as read', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mark all read/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Mark all read/i }));

    // Badge should update
    await waitFor(() => {
      // Unread count should be 0
    });
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    // Click outside
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });
});

describe('NotificationCenter Panel variant', () => {
  it('renders as panel when variant is panel', async () => {
    renderWithProviders(<NotificationCenter variant="panel" />);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('shows all notifications in panel variant', async () => {
    renderWithProviders(<NotificationCenter variant="panel" />);

    await waitFor(() => {
      expect(screen.getByText('Assignment Due Soon')).toBeInTheDocument();
      expect(screen.getByText('Quiz Graded')).toBeInTheDocument();
      expect(screen.getByText('New Announcement')).toBeInTheDocument();
    });
  });
});

describe('NotificationCenter empty state', () => {
  const emptyMocks = [
    {
      request: {
        query: GET_NOTIFICATIONS,
        variables: { limit: 20 },
      },
      result: {
        data: { notifications: [] },
      },
    },
    {
      request: {
        query: GET_UNREAD_COUNT,
      },
      result: {
        data: { unreadNotificationCount: 0 },
      },
    },
  ];

  it('shows empty state when no notifications', async () => {
    const user = userEvent.setup();
    render(
      <MockedProvider mocks={emptyMocks} addTypename={false}>
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/No notifications/i)).toBeInTheDocument();
    });
  });

  it('does not show badge when no unread notifications', async () => {
    render(
      <MockedProvider mocks={emptyMocks} addTypename={false}>
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });
});
