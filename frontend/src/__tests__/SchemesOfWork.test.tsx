import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import SchemesOfWork from '../pages/LearningResources/SchemesOfWork';
import {
  GET_SCHEMES_OF_WORK,
  GET_SYLLABI,
  GENERATE_SCHEME_OF_WORK,
  DELETE_SCHEME_OF_WORK,
  APPROVE_SCHEME_OF_WORK,
} from '../graphql/operations';

// Mock data
const mockSchemes = [
  {
    id: 'scheme-1',
    subject: 'Mathematics',
    gradeLevel: 'Form 3',
    academicYear: '2024-2025',
    term: 'First Term',
    status: 'DRAFT',
    weeks: [
      {
        weekNumber: 1,
        topic: 'Algebra Basics',
        objectives: ['Understand variables', 'Solve simple equations'],
        activities: ['Group work', 'Practice problems'],
        resources: ['Textbook Chapter 1'],
        assessment: 'Quiz at end of week',
      },
      {
        weekNumber: 2,
        topic: 'Linear Equations',
        objectives: ['Graph linear equations', 'Find slope and intercept'],
        activities: ['Graphing exercise', 'Real-world applications'],
        resources: ['Graphing calculators', 'Worksheet'],
        assessment: 'Homework assignment',
      },
    ],
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'scheme-2',
    subject: 'Physics',
    gradeLevel: 'Form 4',
    academicYear: '2024-2025',
    term: 'Second Term',
    status: 'APPROVED',
    weeks: [
      {
        weekNumber: 1,
        topic: 'Motion and Forces',
        objectives: ['Define force', 'Apply Newton\'s laws'],
        activities: ['Lab experiment', 'Demonstrations'],
        resources: ['Lab equipment', 'Simulation software'],
        assessment: 'Lab report',
      },
    ],
    createdAt: '2024-01-10T09:00:00Z',
  },
];

const mockSyllabi = [
  { id: 'syllabus-1', subject: 'Mathematics', gradeLevel: 'Form 3' },
  { id: 'syllabus-2', subject: 'Physics', gradeLevel: 'Form 4' },
  { id: 'syllabus-3', subject: 'Chemistry', gradeLevel: 'Form 5' },
];

// GraphQL mocks
const mocks = [
  {
    request: {
      query: GET_SCHEMES_OF_WORK,
    },
    result: {
      data: {
        schemesOfWork: mockSchemes,
      },
    },
  },
  {
    request: {
      query: GET_SYLLABI,
    },
    result: {
      data: {
        syllabi: mockSyllabi,
      },
    },
  },
  {
    request: {
      query: GENERATE_SCHEME_OF_WORK,
      variables: {
        input: {
          syllabusId: 'syllabus-1',
          term: 'First Term',
          weeksCount: 12,
        },
      },
    },
    result: {
      data: {
        generateSchemeOfWork: {
          id: 'scheme-new',
          subject: 'Mathematics',
          gradeLevel: 'Form 3',
          status: 'DRAFT',
          weeks: [],
        },
      },
    },
  },
  {
    request: {
      query: DELETE_SCHEME_OF_WORK,
      variables: { id: 'scheme-1' },
    },
    result: {
      data: {
        deleteSchemeOfWork: { id: 'scheme-1' },
      },
    },
  },
  {
    request: {
      query: APPROVE_SCHEME_OF_WORK,
      variables: { id: 'scheme-1' },
    },
    result: {
      data: {
        approveSchemeOfWork: {
          id: 'scheme-1',
          status: 'APPROVED',
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

describe('SchemesOfWork Component', () => {
  it('renders the page title', async () => {
    renderWithProviders(<SchemesOfWork />);
    
    expect(screen.getByText('📅 Schemes of Work')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderWithProviders(<SchemesOfWork />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders schemes after loading', async () => {
    renderWithProviders(<SchemesOfWork />);
    
    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Physics')).toBeInTheDocument();
  });

  it('displays scheme statistics', async () => {
    renderWithProviders(<SchemesOfWork />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Schemes')).toBeInTheDocument();
    });
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Total count
  });

  it('shows scheme status badges', async () => {
    renderWithProviders(<SchemesOfWork />);
    
    await waitFor(() => {
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
    });
  });

  it('allows switching between tabs', async () => {
    renderWithProviders(<SchemesOfWork />);
    
    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
    });
    
    // Click "Create New" tab
    const createTab = screen.getByText(/Create New/i);
    fireEvent.click(createTab);
    
    await waitFor(() => {
      expect(screen.getByText(/Generate New Scheme/i)).toBeInTheDocument();
    });
  });

  it('shows syllabus selection dropdown when creating new scheme', async () => {
    renderWithProviders(<SchemesOfWork />);
    
    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
    });
    
    // Click "Create New" tab
    const createTab = screen.getByText(/Create New/i);
    fireEvent.click(createTab);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Select Syllabus/i)).toBeInTheDocument();
    });
  });

  it('displays week details when scheme is selected', async () => {
    renderWithProviders(<SchemesOfWork />);
    
    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
    });
    
    // Click on Mathematics scheme
    const mathScheme = screen.getByText('Mathematics');
    fireEvent.click(mathScheme);
    
    await waitFor(() => {
      expect(screen.getByText('Algebra Basics')).toBeInTheDocument();
      expect(screen.getByText('Linear Equations')).toBeInTheDocument();
    });
  });

  it('shows delete confirmation when delete is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SchemesOfWork />);
    
    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
    });
    
    // Find and click delete button
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);
    
    // Should show confirmation or initiate delete
    await waitFor(() => {
      expect(screen.queryByText(/deleted/i) || screen.getByRole('progressbar')).toBeTruthy();
    });
  });

  it('handles empty schemes state', async () => {
    const emptyMocks = [
      {
        request: { query: GET_SCHEMES_OF_WORK },
        result: { data: { schemesOfWork: [] } },
      },
      {
        request: { query: GET_SYLLABI },
        result: { data: { syllabi: mockSyllabi } },
      },
    ];
    
    render(
      <MockedProvider mocks={emptyMocks} addTypename={false}>
        <BrowserRouter>
          <SchemesOfWork />
        </BrowserRouter>
      </MockedProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/No schemes of work found/i)).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    const errorMocks = [
      {
        request: { query: GET_SCHEMES_OF_WORK },
        error: new Error('Failed to fetch schemes'),
      },
      {
        request: { query: GET_SYLLABI },
        result: { data: { syllabi: [] } },
      },
    ];
    
    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <BrowserRouter>
          <SchemesOfWork />
        </BrowserRouter>
      </MockedProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });
});
