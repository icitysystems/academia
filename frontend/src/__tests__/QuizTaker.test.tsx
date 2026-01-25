import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import QuizTaker from '../components/quiz/QuizTaker';
import {
  GET_QUIZ_FOR_TAKING,
  START_QUIZ_ATTEMPT,
  SAVE_QUIZ_RESPONSE,
  SUBMIT_QUIZ_ATTEMPT,
} from '../graphql/operations';

// Mock data
const mockQuiz = {
  id: 'quiz-1',
  title: 'Chapter 5 Quiz',
  description: 'Test your understanding of Chapter 5 concepts',
  timeLimit: 30, // 30 minutes
  totalQuestions: 5,
  totalPoints: 50,
  passingScore: 70,
  shuffleQuestions: false,
  showResults: true,
  questions: [
    {
      id: 'q1',
      text: 'What is the capital of France?',
      type: 'MCQ',
      points: 10,
      options: [
        { id: 'o1', text: 'London' },
        { id: 'o2', text: 'Paris' },
        { id: 'o3', text: 'Berlin' },
        { id: 'o4', text: 'Madrid' },
      ],
    },
    {
      id: 'q2',
      text: 'The Earth is flat.',
      type: 'TRUE_FALSE',
      points: 10,
      options: [
        { id: 'tf1', text: 'True' },
        { id: 'tf2', text: 'False' },
      ],
    },
    {
      id: 'q3',
      text: 'Select all prime numbers:',
      type: 'MULTI_SELECT',
      points: 10,
      options: [
        { id: 'ms1', text: '2' },
        { id: 'ms2', text: '3' },
        { id: 'ms3', text: '4' },
        { id: 'ms4', text: '5' },
      ],
    },
    {
      id: 'q4',
      text: 'What is 2 + 2?',
      type: 'SHORT_ANSWER',
      points: 10,
    },
    {
      id: 'q5',
      text: 'Explain the theory of relativity.',
      type: 'ESSAY',
      points: 10,
    },
  ],
};

const mockAttempt = {
  id: 'attempt-1',
  quizId: 'quiz-1',
  startedAt: new Date().toISOString(),
  responses: [],
};

const mocks = [
  {
    request: {
      query: GET_QUIZ_FOR_TAKING,
      variables: { quizId: 'quiz-1' },
    },
    result: {
      data: { quiz: mockQuiz },
    },
  },
  {
    request: {
      query: START_QUIZ_ATTEMPT,
      variables: { quizId: 'quiz-1' },
    },
    result: {
      data: { startQuizAttempt: mockAttempt },
    },
  },
  {
    request: {
      query: SAVE_QUIZ_RESPONSE,
      variables: {
        attemptId: 'attempt-1',
        questionId: 'q1',
        response: expect.any(String),
      },
    },
    result: {
      data: { saveQuizResponse: { success: true } },
    },
  },
  {
    request: {
      query: SUBMIT_QUIZ_ATTEMPT,
      variables: { attemptId: 'attempt-1' },
    },
    result: {
      data: {
        submitQuizAttempt: {
          id: 'attempt-1',
          score: 40,
          percentage: 80,
          passed: true,
          submittedAt: new Date().toISOString(),
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

describe('QuizTaker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders quiz title and info', async () => {
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByText('Chapter 5 Quiz')).toBeInTheDocument();
    });

    expect(screen.getByText(/5 questions/i)).toBeInTheDocument();
    expect(screen.getByText(/50 points/i)).toBeInTheDocument();
  });

  it('shows start quiz button initially', async () => {
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });
  });

  it('displays timer when quiz is started', async () => {
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Start Quiz/i }));

    await waitFor(() => {
      // Timer should show 30:00 initially
      expect(screen.getByText(/30:00/)).toBeInTheDocument();
    });
  });

  it('displays first question after starting', async () => {
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Start Quiz/i }));

    await waitFor(() => {
      expect(screen.getByText(/What is the capital of France/)).toBeInTheDocument();
    });
  });

  it('shows question navigation panel', async () => {
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Start Quiz/i }));

    await waitFor(() => {
      // Should show question numbers
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('allows selecting an answer for MCQ', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Start Quiz/i }));

    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });

    const parisOption = screen.getByLabelText('Paris');
    await user.click(parisOption);

    expect(parisOption).toBeChecked();
  });

  it('shows next button to navigate questions', async () => {
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Start Quiz/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    });
  });

  it('navigates to next question when clicking Next', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Start Quiz/i }));

    await waitFor(() => {
      expect(screen.getByText(/What is the capital of France/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(screen.getByText(/The Earth is flat/)).toBeInTheDocument();
    });
  });

  it('shows flag question option', async () => {
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Start Quiz/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Flag/i })).toBeInTheDocument();
    });
  });

  it('shows submit button on last question', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Start Quiz/i }));

    // Navigate to last question
    for (let i = 0; i < 4; i++) {
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /Next/i }));
    }

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Submit Quiz/i })).toBeInTheDocument();
    });
  });
});

describe('QuizTaker timer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('decrements timer every second', async () => {
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Start Quiz/i }));

    await waitFor(() => {
      expect(screen.getByText(/30:00/)).toBeInTheDocument();
    });

    // Advance timer by 1 second
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText(/29:59/)).toBeInTheDocument();
    });
  });

  it('changes timer color when time is low', async () => {
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Start Quiz/i }));

    // Advance timer to 4:59 remaining
    jest.advanceTimersByTime(25 * 60 * 1000 + 1000);

    await waitFor(() => {
      const timer = screen.getByText(/4:59/);
      expect(timer).toHaveStyle({ color: expect.stringContaining('red') });
    });
  });
});

describe('QuizTaker question types', () => {
  it('renders TRUE_FALSE question correctly', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Start Quiz/i }));
    await user.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(screen.getByText(/The Earth is flat/)).toBeInTheDocument();
      expect(screen.getByLabelText('True')).toBeInTheDocument();
      expect(screen.getByLabelText('False')).toBeInTheDocument();
    });
  });

  it('renders MULTI_SELECT question with checkboxes', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Start Quiz/i }));

    // Navigate to multi-select question
    for (let i = 0; i < 2; i++) {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    }

    await waitFor(() => {
      expect(screen.getByText(/Select all prime numbers/)).toBeInTheDocument();
    });

    // Check that checkboxes exist
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('renders SHORT_ANSWER question with text input', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Start Quiz/i }));

    // Navigate to short answer question
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    }

    await waitFor(() => {
      expect(screen.getByText(/What is 2 \+ 2/)).toBeInTheDocument();
    });

    const textInput = screen.getByRole('textbox');
    expect(textInput).toBeInTheDocument();
  });

  it('renders ESSAY question with multi-line text area', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<QuizTaker quizId="quiz-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Start Quiz/i }));

    // Navigate to essay question
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    }

    await waitFor(() => {
      expect(screen.getByText(/Explain the theory of relativity/)).toBeInTheDocument();
    });

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows');
  });
});
