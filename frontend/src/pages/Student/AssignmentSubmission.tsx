import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Alert,
  Chip,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  Send as SubmitIcon,
  Schedule as ScheduleIcon,
  Grade as GradeIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { gql } from '@apollo/client';
import { useDropzone } from 'react-dropzone';

// GraphQL queries and mutations
const GET_ASSIGNMENT_DETAILS = gql`
  query GetAssignmentDetails($id: ID!) {
    assignment(id: $id) {
      id
      title
      description
      instructions
      dueDate
      totalMarks
      allowLateSubmission
      lateDeadline
      maxFileSize
      allowedFileTypes
      lesson {
        id
        title
        module {
          id
          title
          course {
            id
            title
          }
        }
      }
    }
    mySubmission(assignmentId: $id) {
      id
      content
      status
      submittedAt
      isLate
      score
      maxScore
      feedback
      files {
        id
        fileName
        fileUrl
        fileSize
        mimeType
      }
    }
  }
`;

const SUBMIT_ASSIGNMENT = gql`
  mutation SubmitAssignment($input: SubmitAssignmentInput!) {
    submitAssignment(input: $input) {
      id
      content
      status
      submittedAt
      isLate
    }
  }
`;

const UPLOAD_SUBMISSION_FILE = gql`
  mutation UploadSubmissionFile($submissionId: ID!, $file: Upload!) {
    uploadSubmissionFile(submissionId: $submissionId, file: $file) {
      id
      fileName
      fileUrl
      fileSize
    }
  }
`;

interface FileToUpload {
  file: File;
  id: string;
  uploading: boolean;
  progress: number;
  error?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AssignmentSubmission: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();

  // State
  const [content, setContent] = useState('');
  const [filesToUpload, setFilesToUpload] = useState<FileToUpload[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Queries and mutations
  const { data, loading, error, refetch } = useQuery(GET_ASSIGNMENT_DETAILS, {
    variables: { id: assignmentId },
    skip: !assignmentId,
  });

  const [submitAssignment, { loading: submitting }] = useMutation(SUBMIT_ASSIGNMENT);
  const [uploadFile] = useMutation(UPLOAD_SUBMISSION_FILE);

  const assignment = data?.assignment;
  const existingSubmission = data?.mySubmission;

  // Check if assignment is past due
  const now = new Date();
  const dueDate = assignment?.dueDate ? new Date(assignment.dueDate) : null;
  const lateDeadline = assignment?.lateDeadline ? new Date(assignment.lateDeadline) : null;
  const isPastDue = dueDate && now > dueDate;
  const isPastLateDeadline = lateDeadline && now > lateDeadline;
  const canSubmit = !isPastLateDeadline && (!isPastDue || assignment?.allowLateSubmission);

  // File drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileToUpload[] = acceptedFiles.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}`,
      uploading: false,
      progress: 0,
    }));

    // Validate file types and sizes
    const allowedTypes = assignment?.allowedFileTypes || [];
    const maxSize = assignment?.maxFileSize || 10 * 1024 * 1024; // 10MB default

    const validatedFiles = newFiles.map((f) => {
      const ext = f.file.name.split('.').pop()?.toLowerCase();
      if (allowedTypes.length > 0 && !allowedTypes.includes(ext || '')) {
        f.error = `File type .${ext} not allowed`;
      } else if (f.file.size > maxSize) {
        f.error = `File too large (max ${formatFileSize(maxSize)})`;
      }
      return f;
    });

    setFilesToUpload((prev) => [...prev, ...validatedFiles]);
  }, [assignment]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !canSubmit || existingSubmission?.status === 'GRADED',
  });

  // Remove file from upload list
  const removeFile = (fileId: string) => {
    setFilesToUpload((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Handle submission
  const handleSubmit = async () => {
    if (!assignmentId) return;
    setSubmitError(null);

    try {
      // First submit the assignment
      const { data: submitData } = await submitAssignment({
        variables: {
          input: {
            assignmentId,
            content,
          },
        },
      });

      const submissionId = submitData.submitAssignment.id;

      // Then upload files
      for (const fileToUpload of filesToUpload) {
        if (fileToUpload.error) continue;

        setFilesToUpload((prev) =>
          prev.map((f) =>
            f.id === fileToUpload.id ? { ...f, uploading: true } : f
          )
        );

        try {
          await uploadFile({
            variables: {
              submissionId,
              file: fileToUpload.file,
            },
          });

          setFilesToUpload((prev) =>
            prev.map((f) =>
              f.id === fileToUpload.id ? { ...f, uploading: false, progress: 100 } : f
            )
          );
        } catch (uploadError: any) {
          setFilesToUpload((prev) =>
            prev.map((f) =>
              f.id === fileToUpload.id
                ? { ...f, uploading: false, error: uploadError.message }
                : f
            )
          );
        }
      }

      setSubmitSuccess(true);
      refetch();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit assignment');
    }
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading assignment...</Typography>
      </Container>
    );
  }

  // Error state
  if (error || !assignment) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load assignment. Please try again later.
        </Alert>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Container>
    );
  }

  // Already graded view
  if (existingSubmission?.status === 'GRADED') {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            {assignment.title}
          </Typography>
          
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="subtitle1">
              This assignment has been graded
            </Typography>
          </Alert>

          <Box sx={{ mb: 4, p: 3, bgcolor: 'grey.100', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <GradeIcon color="primary" fontSize="large" />
              <Box>
                <Typography variant="h3">
                  {existingSubmission.score} / {existingSubmission.maxScore}
                </Typography>
                <Typography color="text.secondary">
                  {((existingSubmission.score / existingSubmission.maxScore) * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Box>

            {existingSubmission.feedback && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Instructor Feedback:
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                  {existingSubmission.feedback}
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" gutterBottom>
            Your Submission:
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
            {existingSubmission.content || 'No text content submitted'}
          </Typography>

          {existingSubmission.files?.length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Submitted Files:
              </Typography>
              <List dense>
                {existingSubmission.files.map((file: any) => (
                  <ListItem key={file.id}>
                    <ListItemIcon>
                      <FileIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={file.fileName}
                      secondary={formatFileSize(file.fileSize)}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          <Button
            variant="contained"
            onClick={() => navigate(-1)}
            sx={{ mt: 3 }}
          >
            Back to Assignments
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Assignment Header */}
      <Paper sx={{ p: 4, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">
          {assignment.lesson?.module?.course?.title} &gt; {assignment.lesson?.module?.title} &gt; {assignment.lesson?.title}
        </Typography>
        
        <Typography variant="h4" gutterBottom>
          {assignment.title}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip
            icon={<ScheduleIcon />}
            label={`Due: ${formatDate(assignment.dueDate)}`}
            color={isPastDue ? 'error' : 'default'}
          />
          <Chip
            icon={<GradeIcon />}
            label={`${assignment.totalMarks} points`}
          />
          {assignment.allowLateSubmission && (
            <Chip
              label="Late submissions allowed"
              color="warning"
              size="small"
            />
          )}
        </Box>

        {isPastDue && !isPastLateDeadline && assignment.allowLateSubmission && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Past due date!</strong> Late submissions are accepted until {formatDate(assignment.lateDeadline)}.
            Late submissions may receive reduced credit.
          </Alert>
        )}

        {isPastLateDeadline && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>Submission closed.</strong> The deadline for this assignment has passed.
          </Alert>
        )}

        {existingSubmission && (
          <Alert 
            severity={existingSubmission.status === 'SUBMITTED' ? 'info' : 'success'} 
            sx={{ mb: 2 }}
            icon={<CheckIcon />}
          >
            You submitted this assignment on {formatDate(existingSubmission.submittedAt)}
            {existingSubmission.isLate && ' (Late submission)'}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Description
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
          {assignment.description}
        </Typography>

        {assignment.instructions && (
          <>
            <Typography variant="h6" gutterBottom>
              Instructions
            </Typography>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>
              {assignment.instructions}
            </Typography>
          </>
        )}
      </Paper>

      {/* Submission Form */}
      {canSubmit && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {existingSubmission ? 'Update Your Submission' : 'Your Submission'}
            </Typography>

            {submitSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Assignment submitted successfully!
              </Alert>
            )}

            {submitError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {submitError}
              </Alert>
            )}

            <TextField
              fullWidth
              multiline
              rows={8}
              label="Your Answer"
              placeholder="Type your response here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              sx={{ mb: 3 }}
              disabled={submitting}
            />

            {/* File Upload Area */}
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive ? 'primary.50' : 'grey.50',
                mb: 2,
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'primary.50',
                },
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              <Typography>
                {isDragActive
                  ? 'Drop files here...'
                  : 'Drag & drop files here, or click to select'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {assignment.allowedFileTypes?.length > 0
                  ? `Allowed: ${assignment.allowedFileTypes.join(', ')}`
                  : 'All file types allowed'}
                {' • '}
                Max size: {formatFileSize(assignment.maxFileSize || 10 * 1024 * 1024)}
              </Typography>
            </Box>

            {/* Files to upload list */}
            {filesToUpload.length > 0 && (
              <List>
                {filesToUpload.map((fileItem) => (
                  <ListItem key={fileItem.id}>
                    <ListItemIcon>
                      <FileIcon color={fileItem.error ? 'error' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={fileItem.file.name}
                      secondary={
                        fileItem.error ? (
                          <Typography color="error" variant="caption">
                            {fileItem.error}
                          </Typography>
                        ) : fileItem.uploading ? (
                          <LinearProgress variant="indeterminate" />
                        ) : (
                          formatFileSize(fileItem.file.size)
                        )
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => removeFile(fileItem.id)}
                        disabled={fileItem.uploading}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}

            {/* Existing uploaded files */}
            {existingSubmission?.files?.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                  Previously Uploaded Files:
                </Typography>
                <List dense>
                  {existingSubmission.files.map((file: any) => (
                    <ListItem key={file.id}>
                      <ListItemIcon>
                        <FileIcon color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.fileName}
                        secondary={formatFileSize(file.fileSize)}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={submitting ? <CircularProgress size={20} /> : <SubmitIcon />}
                onClick={handleSubmit}
                disabled={submitting || (!content && filesToUpload.length === 0)}
              >
                {submitting ? 'Submitting...' : existingSubmission ? 'Update Submission' : 'Submit Assignment'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default AssignmentSubmission;
