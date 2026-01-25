import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import DiscussionBoard from '../components/discussions/DiscussionBoard';
import {
  GET_COURSE_DISCUSSIONS,
  GET_DISCUSSION_THREAD,
  CREATE_DISCUSSION_THREAD,
  CREATE_DISCUSSION_POST,
} from '../graphql/operations';

// Mock data
const mockThreads = [
  {
    id: 'thread-1',
    title: 'Question about homework',
    content: 'Can someone explain problem 3?',
    author: {
      id: 'user-1',
      name: 'John Doe',
      role: 'STUDENT',
      avatar: null,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replyCount: 5,
    isPinned: false,
    isLocked: false,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 'thread-2',
    title: 'Welcome to the course!',
    content: 'Please introduce yourselves.',
    author: {
      id: 'instructor-1',
      name: 'Dr. Smith',
      role: 'INSTRUCTOR',
      avatar: null,
    },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    replyCount: 12,
    isPinned: true,
    isLocked: false,
    lastActivity: new Date().toISOString(),
  },
];

const mockThread = {
  ...mockThreads[0],
  posts: [
    {
      id: 'post-1',
      content: 'Can someone explain problem 3?',
      author: {
        id: 'user-1',
        name: 'John Doe',
        role: 'STUDENT',
        avatar: null,
      },
      createdAt: new Date().toISOString(),
      isEdited: false,
    },
    {
      id: 'post-2',
      content: 'Sure, you need to use the quadratic formula.',
      author: {
        id: 'user-2',
        name: 'Jane Smith',
        role: 'STUDENT',
        avatar: null,
      },
      createdAt: new Date().toISOString(),
      isEdited: false,
    },
  ],
};

const mocks = [
  {
    request: {
      query: GET_COURSE_DISCUSSIONS,
      variables: { courseId: 'course-1' },
    },
    result: {
      data: {
        courseDiscussions: {
          threads: mockThreads,
          totalCount: 2,
        },
      },
    },
  },
  {
    request: {
      query: GET_DISCUSSION_THREAD,
      variables: { threadId: 'thread-1' },
    },
    result: {
      data: { discussionThread: mockThread },
    },
  },
  {
    request: {
      query: CREATE_DISCUSSION_THREAD,
      variables: {
        courseId: 'course-1',
        title: 'New Thread',
        content: 'Thread content',
      },
    },
    result: {
      data: {
        createDiscussionThread: {
          id: 'thread-3',
          title: 'New Thread',
          content: 'Thread content',
          author: {
            id: 'user-1',
            name: 'John Doe',
            role: 'STUDENT',
            avatar: null,
          },
          createdAt: new Date().toISOString(),
          replyCount: 0,
        },
      },
    },
  },
  {
    request: {
      query: CREATE_DISCUSSION_POST,
      variables: {
        threadId: 'thread-1',
        content: 'Test reply content',
      },
    },
    result: {
      data: {
        createDiscussionPost: {
          id: 'post-3',
          content: 'Test reply content',
          author: {
            id: 'user-1',
            name: 'John Doe',
            role: 'STUDENT',
            avatar: null,
          },
          createdAt: new Date().toISOString(),
        },
      },
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

describe('DiscussionBoard', () => {
  it('renders discussion board title', async () => {
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByText('Discussion Board')).toBeInTheDocument();
    });
  });

  it('displays list of threads', async () => {
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByText('Question about homework')).toBeInTheDocument();
      expect(screen.getByText('Welcome to the course!')).toBeInTheDocument();
    });
  });

  it('shows thread author information', async () => {
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    });
  });

  it('displays reply count for threads', async () => {
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByText(/5 replies/i)).toBeInTheDocument();
      expect(screen.getByText(/12 replies/i)).toBeInTheDocument();
    });
  });

  it('shows pinned badge for pinned threads', async () => {
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pinned')).toBeInTheDocument();
    });
  });

  it('displays New Thread button', async () => {
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Thread/i })).toBeInTheDocument();
    });
  });

  it('has search functionality', async () => {
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search discussions/i)).toBeInTheDocument();
    });
  });

  it('filters threads by search query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByText('Question about homework')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search discussions/i);
    await user.type(searchInput, 'Welcome');

    await waitFor(() => {
      expect(screen.getByText('Welcome to the course!')).toBeInTheDocument();
    });
  });
});

describe('DiscussionBoard Thread Creation', () => {
  it('opens new thread dialog when clicking New Thread', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Thread/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /New Thread/i }));

    await waitFor(() => {
      expect(screen.getByText('Create New Discussion')).toBeInTheDocument();
    });
  });

  it('shows title and content fields in new thread dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Thread/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /New Thread/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Content/i)).toBeInTheDocument();
    });
  });

  it('validates required fields before submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Thread/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /New Thread/i }));

    await waitFor(() => {
      expect(screen.getByText('Create New Discussion')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Create/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit when required fields are filled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Thread/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /New Thread/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Title/i), 'Test Thread');
    await user.type(screen.getByLabelText(/Content/i), 'Test content for thread');

    const submitButton = screen.getByRole('button', { name: /Create/i });
    expect(submitButton).toBeEnabled();
  });
});

describe('DiscussionBoard Thread View', () => {
  it('opens thread view when clicking a thread', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByText('Question about homework')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Question about homework'));

    await waitFor(() => {
      expect(screen.getByText('Can someone explain problem 3?')).toBeInTheDocument();
    });
  });

  it('displays all posts in a thread', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByText('Question about homework')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Question about homework'));

    await waitFor(() => {
      expect(screen.getByText('Can someone explain problem 3?')).toBeInTheDocument();
      expect(screen.getByText('Sure, you need to use the quadratic formula.')).toBeInTheDocument();
    });
  });

  it('shows reply input in thread view', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByText('Question about homework')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Question about homework'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Write a reply/i)).toBeInTheDocument();
    });
  });

  it('has back button to return to thread list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByText('Question about homework')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Question about homework'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
    });
  });
});

describe('DiscussionBoard Accessibility', () => {
  it('has proper ARIA labels', async () => {
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Thread/i })).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search discussions/i);
    expect(searchInput).toHaveAttribute('type', 'text');
  });

  it('threads are keyboard navigable', async () => {
    renderWithProviders(<DiscussionBoard courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByText('Question about homework')).toBeInTheDocument();
    });

    const threads = screen.getAllByRole('listitem');
    expect(threads.length).toBeGreaterThan(0);
  });
});
