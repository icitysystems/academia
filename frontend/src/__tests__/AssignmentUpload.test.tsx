import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import AssignmentUpload from '../components/assignments/AssignmentUpload';
import { GET_ASSIGNMENT, GET_MY_SUBMISSIONS, SUBMIT_ASSIGNMENT } from '../graphql/operations';

// Mock data
const mockAssignment = {
  id: 'assignment-1',
  title: 'Research Paper',
  description: 'Write a 10-page research paper on climate change',
  dueDate: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
  maxPoints: 100,
  allowedFileTypes: ['.pdf', '.docx'],
  maxFileSize: 10485760, // 10MB
  allowLateSubmissions: true,
  latePenaltyPercent: 10,
  allowResubmission: true,
  maxAttempts: 3,
};

const mockSubmissions = [
  {
    id: 'submission-1',
    assignmentId: 'assignment-1',
    submittedAt: new Date().toISOString(),
    fileName: 'paper_v1.pdf',
    fileSize: 2048576,
    status: 'SUBMITTED',
    grade: null,
    feedback: null,
    attemptNumber: 1,
  },
];

const mocks = [
  {
    request: {
      query: GET_ASSIGNMENT,
      variables: { assignmentId: 'assignment-1' },
    },
    result: {
      data: { assignment: mockAssignment },
    },
  },
  {
    request: {
      query: GET_MY_SUBMISSIONS,
      variables: { assignmentId: 'assignment-1' },
    },
    result: {
      data: { mySubmissions: mockSubmissions },
    },
  },
  {
    request: {
      query: SUBMIT_ASSIGNMENT,
      variables: { assignmentId: 'assignment-1', file: expect.any(File) },
    },
    result: {
      data: {
        submitAssignment: {
          id: 'submission-2',
          status: 'SUBMITTED',
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

describe('AssignmentUpload', () => {
  it('renders assignment details correctly', async () => {
    renderWithProviders(<AssignmentUpload assignmentId="assignment-1" />);

    await waitFor(() => {
      expect(screen.getByText('Research Paper')).toBeInTheDocument();
    });

    expect(screen.getByText(/Write a 10-page research paper/)).toBeInTheDocument();
    expect(screen.getByText('100 points')).toBeInTheDocument();
  });

  it('displays due date information', async () => {
    renderWithProviders(<AssignmentUpload assignmentId="assignment-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Due:/)).toBeInTheDocument();
    });
  });

  it('shows allowed file types', async () => {
    renderWithProviders(<AssignmentUpload assignmentId="assignment-1" />);

    await waitFor(() => {
      expect(screen.getByText(/\.pdf/)).toBeInTheDocument();
      expect(screen.getByText(/\.docx/)).toBeInTheDocument();
    });
  });

  it('displays existing submissions', async () => {
    renderWithProviders(<AssignmentUpload assignmentId="assignment-1" />);

    await waitFor(() => {
      expect(screen.getByText('paper_v1.pdf')).toBeInTheDocument();
    });
  });

  it('shows upload area when no file selected', async () => {
    renderWithProviders(<AssignmentUpload assignmentId="assignment-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Drag and drop/i)).toBeInTheDocument();
    });
  });

  it('validates file type on selection', async () => {
    renderWithProviders(<AssignmentUpload assignmentId="assignment-1" />);

    await waitFor(() => {
      expect(screen.getByText('Research Paper')).toBeInTheDocument();
    });

    // Create an invalid file
    const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      fireEvent.change(input, { target: { files: [invalidFile] } });
      
      await waitFor(() => {
        expect(screen.getByText(/File type not allowed/i)).toBeInTheDocument();
      });
    }
  });

  it('shows submit button when file is selected', async () => {
    renderWithProviders(<AssignmentUpload assignmentId="assignment-1" />);

    await waitFor(() => {
      expect(screen.getByText('Research Paper')).toBeInTheDocument();
    });

    const validFile = new File(['content'], 'paper.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      fireEvent.change(input, { target: { files: [validFile] } });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
      });
    }
  });

  it('displays resubmission info when allowed', async () => {
    renderWithProviders(<AssignmentUpload assignmentId="assignment-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Resubmission allowed/i)).toBeInTheDocument();
    });
  });
});

describe('AssignmentUpload file validation', () => {
  it('rejects files exceeding size limit', async () => {
    renderWithProviders(<AssignmentUpload assignmentId="assignment-1" />);

    await waitFor(() => {
      expect(screen.getByText('Research Paper')).toBeInTheDocument();
    });

    // Create a large file (mock)
    const largeFile = new File(['x'.repeat(20000000)], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: 20000000 }); // 20MB
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      fireEvent.change(input, { target: { files: [largeFile] } });
      
      await waitFor(() => {
        expect(screen.getByText(/File size exceeds/i)).toBeInTheDocument();
      });
    }
  });
});
