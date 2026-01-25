import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import SyllabusGenerator from '../pages/LearningResources/SyllabusGenerator';
import {
  GET_SYLLABI,
  CREATE_SYLLABUS,
  IMPORT_SYLLABUS,
} from '../graphql/operations';

// Mock data
const mockSyllabi = [
  {
    id: 'syllabus-1',
    subject: 'Mathematics',
    gradeLevel: 'Form 3',
    academicYear: '2024-2025',
    term: 'First Term',
    board: 'GCE',
    status: 'APPROVED',
    topics: [
      {
        id: 'topic-1',
        title: 'Algebra',
        description: 'Introduction to algebraic expressions',
        hours: 10,
        subtopics: ['Variables', 'Expressions', 'Equations'],
      },
      {
        id: 'topic-2',
        title: 'Geometry',
        description: 'Basic geometric shapes and properties',
        hours: 8,
        subtopics: ['Triangles', 'Circles', 'Polygons'],
      },
    ],
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'syllabus-2',
    subject: 'Physics',
    gradeLevel: 'Form 4',
    academicYear: '2024-2025',
    term: 'Second Term',
    board: 'National',
    status: 'DRAFT',
    topics: [
      {
        id: 'topic-3',
        title: 'Mechanics',
        description: 'Motion and forces',
        hours: 12,
        subtopics: ['Kinematics', 'Dynamics', 'Work and Energy'],
      },
    ],
    createdAt: '2024-01-10T09:00:00Z',
  },
];

const mockCreatedSyllabus = {
  id: 'syllabus-new',
  subject: 'Chemistry',
  gradeLevel: 'Form 4',
  academicYear: '2024-2025',
  term: 'First Term',
  board: 'GCE',
  status: 'DRAFT',
  topics: [
    {
      id: 'topic-new-1',
      title: 'Introduction to the Subject',
      description: 'Overview and foundational concepts',
      hours: 4,
      subtopics: ['Course overview', 'Learning objectives', 'Assessment criteria'],
    },
  ],
};

// GraphQL mocks
const mocks = [
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
      query: CREATE_SYLLABUS,
      variables: {
        input: {
          subject: 'Chemistry',
          gradeLevel: 'Form 4',
          academicYear: '2024-2025',
          term: 'First Term',
          board: 'GCE',
          topics: [
            {
              title: 'Introduction to the Subject',
              description: 'Overview and foundational concepts',
              hours: 4,
              subtopics: ['Course overview', 'Learning objectives', 'Assessment criteria'],
            },
          ],
        },
      },
    },
    result: {
      data: {
        createSyllabus: mockCreatedSyllabus,
      },
    },
  },
  {
    request: {
      query: IMPORT_SYLLABUS,
      variables: {
        input: {
          file: 'base64-file-content',
          fileName: 'syllabus.pdf',
          mimeType: 'application/pdf',
        },
      },
    },
    result: {
      data: {
        importSyllabus: {
          id: 'imported-syllabus',
          subject: 'Imported Subject',
          gradeLevel: 'Form 5',
          topics: [],
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

describe('SyllabusGenerator Component', () => {
  it('renders the page title', () => {
    renderWithProviders(<SyllabusGenerator />);
    
    expect(screen.getByText('📋 Syllabus Generator')).toBeInTheDocument();
  });

  it('renders the stepper', () => {
    renderWithProviders(<SyllabusGenerator />);
    
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Topics & Units')).toBeInTheDocument();
    expect(screen.getByText('Time Allocation')).toBeInTheDocument();
    expect(screen.getByText('Review & Generate')).toBeInTheDocument();
  });

  it('shows tabs for Create New and My Syllabi', async () => {
    renderWithProviders(<SyllabusGenerator />);
    
    expect(screen.getByText('Create New')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/My Syllabi/i)).toBeInTheDocument();
    });
  });

  it('renders basic information form on step 1', () => {
    renderWithProviders(<SyllabusGenerator />);
    
    expect(screen.getByLabelText(/Subject Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Grade Level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Academic Year/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Term/i)).toBeInTheDocument();
  });

  it('allows entering subject name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SyllabusGenerator />);
    
    const subjectInput = screen.getByLabelText(/Subject Name/i);
    await user.type(subjectInput, 'Chemistry');
    
    expect(subjectInput).toHaveValue('Chemistry');
  });

  it('allows selecting grade level', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SyllabusGenerator />);
    
    const gradeSelect = screen.getByLabelText(/Grade Level/i);
    fireEvent.mouseDown(gradeSelect);
    
    await waitFor(() => {
      expect(screen.getByText('Form 1')).toBeInTheDocument();
      expect(screen.getByText('Form 4')).toBeInTheDocument();
    });
  });

  it('has Next button to proceed to next step', () => {
    renderWithProviders(<SyllabusGenerator />);
    
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
  });

  it('advances to step 2 when Next is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SyllabusGenerator />);
    
    // Fill required fields
    const subjectInput = screen.getByLabelText(/Subject Name/i);
    await user.type(subjectInput, 'Chemistry');
    
    const gradeSelect = screen.getByLabelText(/Grade Level/i);
    fireEvent.mouseDown(gradeSelect);
    await waitFor(() => screen.getByText('Form 4'));
    fireEvent.click(screen.getByText('Form 4'));
    
    const nextButton = screen.getByRole('button', { name: /Next/i });
    await user.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Topics & Units')).toBeInTheDocument();
    });
  });

  it('shows default topic on step 2', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SyllabusGenerator />);
    
    // Navigate to step 2
    const nextButton = screen.getByRole('button', { name: /Next/i });
    await user.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Introduction to the Subject')).toBeInTheDocument();
    });
  });

  it('allows adding a new topic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SyllabusGenerator />);
    
    // Navigate to step 2
    const nextButton = screen.getByRole('button', { name: /Next/i });
    await user.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Topic Title/i)).toBeInTheDocument();
    });
    
    const topicInput = screen.getByLabelText(/Topic Title/i);
    await user.type(topicInput, 'New Topic');
    
    const addButton = screen.getByRole('button', { name: /Add/i });
    await user.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText('New Topic')).toBeInTheDocument();
    });
  });

  it('shows total hours calculation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SyllabusGenerator />);
    
    // Navigate to step 2
    const nextButton = screen.getByRole('button', { name: /Next/i });
    await user.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Total Hours/i)).toBeInTheDocument();
    });
  });

  it('has Back button on step 2', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SyllabusGenerator />);
    
    const nextButton = screen.getByRole('button', { name: /Next/i });
    await user.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
    });
  });

  it('Back button is disabled on step 1', () => {
    renderWithProviders(<SyllabusGenerator />);
    
    const backButton = screen.getByRole('button', { name: /Back/i });
    expect(backButton).toBeDisabled();
  });

  it('shows file import option', () => {
    renderWithProviders(<SyllabusGenerator />);
    
    expect(screen.getByText(/Import Syllabus Document/i)).toBeInTheDocument();
  });

  it('displays saved syllabi in My Syllabi tab', async () => {
    renderWithProviders(<SyllabusGenerator />);
    
    // Click My Syllabi tab
    const mySyllabiTab = screen.getByText(/My Syllabi/i);
    fireEvent.click(mySyllabiTab);
    
    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByText('Physics')).toBeInTheDocument();
    });
  });

  it('shows syllabus status in My Syllabi', async () => {
    renderWithProviders(<SyllabusGenerator />);
    
    const mySyllabiTab = screen.getByText(/My Syllabi/i);
    fireEvent.click(mySyllabiTab);
    
    await waitFor(() => {
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
    });
  });

  it('shows topic count in My Syllabi', async () => {
    renderWithProviders(<SyllabusGenerator />);
    
    const mySyllabiTab = screen.getByText(/My Syllabi/i);
    fireEvent.click(mySyllabiTab);
    
    await waitFor(() => {
      // Should show topic counts
      expect(screen.getByText(/2.*topics/i) || screen.getByText('2')).toBeTruthy();
    });
  });

  it('handles empty syllabi list', async () => {
    const emptyMocks = [
      {
        request: { query: GET_SYLLABI },
        result: { data: { syllabi: [] } },
      },
    ];
    
    render(
      <MockedProvider mocks={emptyMocks} addTypename={false}>
        <BrowserRouter>
          <SyllabusGenerator />
        </BrowserRouter>
      </MockedProvider>
    );
    
    const mySyllabiTab = screen.getByText(/My Syllabi/i);
    fireEvent.click(mySyllabiTab);
    
    await waitFor(() => {
      expect(screen.getByText(/No syllabi created yet/i)).toBeInTheDocument();
    });
  });

  it('shows Generate Syllabus button on final step', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SyllabusGenerator />);
    
    // Navigate through all steps
    for (let i = 0; i < 3; i++) {
      const nextButton = screen.getByRole('button', { name: /Next/i });
      await user.click(nextButton);
    }
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generate Syllabus/i })).toBeInTheDocument();
    });
  });

  it('shows review summary on final step', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SyllabusGenerator />);
    
    // Fill in subject
    const subjectInput = screen.getByLabelText(/Subject Name/i);
    await user.type(subjectInput, 'Chemistry');
    
    // Navigate through all steps
    for (let i = 0; i < 3; i++) {
      const nextButton = screen.getByRole('button', { name: /Next/i });
      await user.click(nextButton);
    }
    
    await waitFor(() => {
      expect(screen.getByText('Syllabus Summary')).toBeInTheDocument();
      expect(screen.getByText('Chemistry')).toBeInTheDocument();
    });
  });

  it('has export options on final step', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SyllabusGenerator />);
    
    // Navigate through all steps
    for (let i = 0; i < 3; i++) {
      const nextButton = screen.getByRole('button', { name: /Next/i });
      await user.click(nextButton);
    }
    
    await waitFor(() => {
      expect(screen.getByText(/Download as PDF/i)).toBeInTheDocument();
      expect(screen.getByText(/Download as Word/i)).toBeInTheDocument();
    });
  });

  it('has back navigation to resources', () => {
    renderWithProviders(<SyllabusGenerator />);
    
    const backLink = screen.getByRole('link', { name: '' });
    expect(backLink).toHaveAttribute('href', '/resources');
  });
});
