import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import LessonPlanGenerator from '../pages/LearningResources/LessonPlanGenerator';
import {
  GENERATE_LESSON_PLAN,
  GET_LESSON_PLANS,
  SAVE_LESSON_PLAN,
  EXPORT_LESSON_PLAN,
} from '../graphql/operations';

// Mock data
const mockLessonPlans = [
  {
    id: 'plan-1',
    subject: 'Mathematics',
    topic: 'Quadratic Equations',
    gradeLevel: 'Form 3',
    duration: '45 minutes',
    objectives: [
      'Solve quadratic equations by factoring',
      'Apply the quadratic formula',
    ],
    materials: ['Whiteboard', 'Calculator', 'Worksheet'],
    activities: [
      { name: 'Introduction', duration: '5 min', description: 'Review prerequisites' },
      { name: 'Main Activity', duration: '30 min', description: 'Practice problems' },
      { name: 'Wrap-up', duration: '10 min', description: 'Summary and Q&A' },
    ],
    assessment: 'Exit ticket with 3 problems',
    status: 'DRAFT',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'plan-2',
    subject: 'Physics',
    topic: 'Newton\'s Laws',
    gradeLevel: 'Form 4',
    duration: '60 minutes',
    objectives: ['State Newton\'s three laws', 'Apply F=ma to problems'],
    materials: ['Lab equipment', 'Textbook'],
    activities: [],
    assessment: 'Lab report',
    status: 'SAVED',
    createdAt: '2024-01-10T09:00:00Z',
  },
];

const mockGeneratedPlan = {
  id: 'plan-new',
  subject: 'Chemistry',
  topic: 'Chemical Bonding',
  gradeLevel: 'Form 4',
  duration: '45 minutes',
  objectives: [
    'Describe ionic bonding',
    'Describe covalent bonding',
    'Compare and contrast ionic and covalent bonds',
  ],
  materials: ['Molecular model kit', 'Periodic table', 'Whiteboard'],
  activities: [
    {
      name: 'Hook',
      duration: '5 min',
      description: 'Show examples of everyday compounds',
    },
    {
      name: 'Direct Instruction',
      duration: '15 min',
      description: 'Explain ionic and covalent bonding with diagrams',
    },
    {
      name: 'Hands-on Activity',
      duration: '20 min',
      description: 'Build molecular models in pairs',
    },
    {
      name: 'Assessment',
      duration: '5 min',
      description: 'Exit ticket identifying bond types',
    },
  ],
  assessment: 'Identify bond types in 5 compounds',
  status: 'DRAFT',
};

// GraphQL mocks
const mocks = [
  {
    request: {
      query: GET_LESSON_PLANS,
    },
    result: {
      data: {
        lessonPlans: mockLessonPlans,
      },
    },
  },
  {
    request: {
      query: GENERATE_LESSON_PLAN,
      variables: {
        input: {
          subject: 'Chemistry',
          topic: 'Chemical Bonding',
          gradeLevel: 'Form 4',
          duration: '45 minutes',
          objectives: 'Understand ionic and covalent bonding',
        },
      },
    },
    result: {
      data: {
        generateLessonPlan: mockGeneratedPlan,
      },
    },
  },
  {
    request: {
      query: SAVE_LESSON_PLAN,
      variables: {
        input: {
          id: 'plan-new',
          subject: 'Chemistry',
          topic: 'Chemical Bonding',
          status: 'SAVED',
        },
      },
    },
    result: {
      data: {
        saveLessonPlan: {
          ...mockGeneratedPlan,
          status: 'SAVED',
        },
      },
    },
  },
  {
    request: {
      query: EXPORT_LESSON_PLAN,
      variables: {
        id: 'plan-1',
        format: 'PDF',
      },
    },
    result: {
      data: {
        exportLessonPlan: {
          url: 'https://example.com/lesson-plan.pdf',
          format: 'PDF',
        },
      },
    },
  },
];

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement, additionalMocks: any[] = []) => {
  return render(
    <MockedProvider mocks={[...mocks, ...additionalMocks]} addTypename={false}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </MockedProvider>
  );
};

describe('LessonPlanGenerator Component', () => {
  it('renders the page title', () => {
    renderWithProviders(<LessonPlanGenerator />);
    
    expect(screen.getByText('📝 AI Lesson Plan Generator')).toBeInTheDocument();
  });

  it('renders the input form', () => {
    renderWithProviders(<LessonPlanGenerator />);
    
    expect(screen.getByLabelText(/Subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Topic/i)).toBeInTheDocument();
  });

  it('shows grade level selector', () => {
    renderWithProviders(<LessonPlanGenerator />);
    
    expect(screen.getByLabelText(/Grade Level/i)).toBeInTheDocument();
  });

  it('shows duration selector', () => {
    renderWithProviders(<LessonPlanGenerator />);
    
    expect(screen.getByLabelText(/Duration/i)).toBeInTheDocument();
  });

  it('allows entering lesson parameters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LessonPlanGenerator />);
    
    const subjectInput = screen.getByLabelText(/Subject/i);
    const topicInput = screen.getByLabelText(/Topic/i);
    
    await user.type(subjectInput, 'Chemistry');
    await user.type(topicInput, 'Chemical Bonding');
    
    expect(subjectInput).toHaveValue('Chemistry');
    expect(topicInput).toHaveValue('Chemical Bonding');
  });

  it('has generate button', () => {
    renderWithProviders(<LessonPlanGenerator />);
    
    expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
  });

  it('disables generate button when required fields are empty', () => {
    renderWithProviders(<LessonPlanGenerator />);
    
    const generateButton = screen.getByRole('button', { name: /Generate/i });
    
    // Button should be disabled when fields are empty
    expect(generateButton).toBeDisabled();
  });

  it('enables generate button when required fields are filled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LessonPlanGenerator />);
    
    const subjectInput = screen.getByLabelText(/Subject/i);
    const topicInput = screen.getByLabelText(/Topic/i);
    
    await user.type(subjectInput, 'Chemistry');
    await user.type(topicInput, 'Chemical Bonding');
    
    const generateButton = screen.getByRole('button', { name: /Generate/i });
    
    expect(generateButton).toBeEnabled();
  });

  it('shows loading state when generating', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LessonPlanGenerator />);
    
    const subjectInput = screen.getByLabelText(/Subject/i);
    const topicInput = screen.getByLabelText(/Topic/i);
    
    await user.type(subjectInput, 'Chemistry');
    await user.type(topicInput, 'Chemical Bonding');
    
    const generateButton = screen.getByRole('button', { name: /Generate/i });
    await user.click(generateButton);
    
    // Should show loading indicator
    await waitFor(() => {
      expect(screen.getByRole('progressbar') || screen.getByText(/Generating/i)).toBeTruthy();
    });
  });

  it('displays generated lesson plan', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LessonPlanGenerator />);
    
    const subjectInput = screen.getByLabelText(/Subject/i);
    const topicInput = screen.getByLabelText(/Topic/i);
    
    await user.type(subjectInput, 'Chemistry');
    await user.type(topicInput, 'Chemical Bonding');
    
    // Select grade level and duration
    const gradeLevelSelect = screen.getByLabelText(/Grade Level/i);
    fireEvent.change(gradeLevelSelect, { target: { value: 'Form 4' } });
    
    const generateButton = screen.getByRole('button', { name: /Generate/i });
    await user.click(generateButton);
    
    await waitFor(() => {
      // Should display generated objectives
      expect(screen.getByText(/Describe ionic bonding/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows save button after generation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LessonPlanGenerator />);
    
    const subjectInput = screen.getByLabelText(/Subject/i);
    const topicInput = screen.getByLabelText(/Topic/i);
    
    await user.type(subjectInput, 'Chemistry');
    await user.type(topicInput, 'Chemical Bonding');
    
    const generateButton = screen.getByRole('button', { name: /Generate/i });
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows export options', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LessonPlanGenerator />);
    
    const subjectInput = screen.getByLabelText(/Subject/i);
    const topicInput = screen.getByLabelText(/Topic/i);
    
    await user.type(subjectInput, 'Chemistry');
    await user.type(topicInput, 'Chemical Bonding');
    
    const generateButton = screen.getByRole('button', { name: /Generate/i });
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Export/i) || screen.getByText(/Download/i)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('displays activities timeline in generated plan', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LessonPlanGenerator />);
    
    const subjectInput = screen.getByLabelText(/Subject/i);
    const topicInput = screen.getByLabelText(/Topic/i);
    
    await user.type(subjectInput, 'Chemistry');
    await user.type(topicInput, 'Chemical Bonding');
    
    const generateButton = screen.getByRole('button', { name: /Generate/i });
    await user.click(generateButton);
    
    await waitFor(() => {
      // Should show activity names
      expect(screen.getByText(/Hook/i)).toBeInTheDocument();
      expect(screen.getByText(/Direct Instruction/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles generation error gracefully', async () => {
    const errorMocks = [
      {
        request: {
          query: GENERATE_LESSON_PLAN,
          variables: {
            input: {
              subject: 'Invalid',
              topic: 'Test',
              gradeLevel: 'Form 1',
              duration: '45 minutes',
              objectives: '',
            },
          },
        },
        error: new Error('Failed to generate lesson plan'),
      },
    ];
    
    const user = userEvent.setup();
    
    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <BrowserRouter>
          <LessonPlanGenerator />
        </BrowserRouter>
      </MockedProvider>
    );
    
    const subjectInput = screen.getByLabelText(/Subject/i);
    const topicInput = screen.getByLabelText(/Topic/i);
    
    await user.type(subjectInput, 'Invalid');
    await user.type(topicInput, 'Test');
    
    const generateButton = screen.getByRole('button', { name: /Generate/i });
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Error/i) || screen.getByText(/failed/i)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('has back navigation button', () => {
    renderWithProviders(<LessonPlanGenerator />);
    
    // Should have back button/link to resources
    const backButton = screen.getByRole('link', { name: '' }) || screen.getByRole('button');
    expect(backButton).toBeInTheDocument();
  });
});
