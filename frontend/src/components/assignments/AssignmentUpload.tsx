import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  AttachFile as FileIcon,
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Description as DocIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { useMutation, useQuery } from '@apollo/client';
import { SUBMIT_ASSIGNMENT, GET_ASSIGNMENT, GET_MY_SUBMISSIONS } from '../../graphql/operations';

interface AssignmentUploadProps {
  assignmentId?: string;
  onSubmitSuccess?: () => void;
}

interface FileWithPreview extends File {
  preview?: string;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <ImageIcon color="primary" />;
  if (type === 'application/pdf') return <PdfIcon color="error" />;
  return <DocIcon color="action" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const AssignmentUpload: React.FC<AssignmentUploadProps> = ({
  assignmentId: propAssignmentId,
  onSubmitSuccess,
}) => {
  const { assignmentId: paramAssignmentId } = useParams<{ assignmentId: string }>();
  const assignmentId = propAssignmentId || paramAssignmentId || '';
  
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [content, setContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const { data: assignmentData, loading: assignmentLoading } = useQuery(GET_ASSIGNMENT, {
    variables: { id: assignmentId },
  });

  const { data: submissionsData } = useQuery(GET_MY_SUBMISSIONS, {
    variables: { courseId: assignmentData?.assignment?.lesson?.module?.course?.id },
  });

  const [submitAssignment, { loading: submitting }] = useMutation(SUBMIT_ASSIGNMENT, {
    onCompleted: () => {
      setFiles([]);
      setContent('');
      setUploadProgress(0);
      onSubmitSuccess?.();
    },
    onError: (err) => setError(err.message),
  });

  const assignment = assignmentData?.assignment;
  const existingSubmission = submissionsData?.mySubmissions?.find(
    (s: any) => s.assignmentId === assignmentId
  );

  const allowedTypes = assignment?.allowedFileTypes
    ? JSON.parse(assignment.allowedFileTypes)
    : ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png'];

  const maxFileSize = assignment?.maxFileSize || 10; // MB

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return `File type .${ext} is not allowed. Allowed: ${allowedTypes.join(', ')}`;
    }
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`;
    }
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setError(null);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles: FileWithPreview[] = [];

    for (const file of droppedFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      validFiles.push(file);
    }

    setFiles((prev) => [...prev, ...validFiles]);
  }, [allowedTypes, maxFileSize]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    const validFiles: FileWithPreview[] = [];

    for (const file of selectedFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      validFiles.push(file);
    }

    setFiles((prev) => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0 && !content.trim()) {
      setError('Please add a file or text content');
      return;
    }

    setConfirmDialog(false);
    setUploadProgress(10);

    try {
      // Simulate file upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      await submitAssignment({
        variables: {
          input: {
            assignmentId,
            content: content.trim() || undefined,
            // In real implementation, files would be uploaded separately
            // and their URLs passed here
          },
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
    } catch (err) {
      setUploadProgress(0);
    }
  };

  const isLate = assignment?.dueDate && new Date(assignment.dueDate) < new Date();
  const canSubmit = !submitting && (files.length > 0 || content.trim());

  if (assignmentLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Assignment Info */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {assignment?.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {assignment?.description}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            icon={<PendingIcon />}
            label={`Due: ${assignment?.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No deadline'}`}
            color={isLate ? 'error' : 'default'}
            size="small"
          />
          <Chip
            label={`Max Score: ${assignment?.totalMarks}`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`Max File Size: ${maxFileSize}MB`}
            size="small"
            variant="outlined"
          />
        </Box>

        {isLate && assignment?.allowLate && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This assignment is past due. Late penalty: {assignment.latePenalty}% per day
          </Alert>
        )}

        {isLate && !assignment?.allowLate && (
          <Alert severity="error" sx={{ mb: 2 }}>
            This assignment is past due and late submissions are not accepted.
          </Alert>
        )}
      </Box>

      {/* Existing Submission */}
      {existingSubmission && (
        <Card sx={{ mb: 3, bgcolor: 'success.light', color: 'success.contrastText' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SuccessIcon />
              <Typography variant="subtitle1">
                You have already submitted this assignment
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Submitted: {new Date(existingSubmission.submittedAt).toLocaleString()}
              {existingSubmission.score !== null && (
                <> | Score: {existingSubmission.score}/{existingSubmission.maxScore}</>
              )}
            </Typography>
          </CardContent>
        </Card>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Upload Area */}
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          border: '2px dashed',
          borderColor: isDragOver ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          bgcolor: isDragOver ? 'primary.light' : 'grey.50',
          transition: 'all 0.2s',
          cursor: 'pointer',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.light',
          },
        }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          hidden
          onChange={handleFileSelect}
          accept={allowedTypes.map((t: string) => `.${t}`).join(',')}
        />
        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Drag & Drop files here
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or click to browse
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Allowed: {allowedTypes.join(', ')} | Max size: {maxFileSize}MB
        </Typography>
      </Box>

      {/* Selected Files List */}
      {files.length > 0 && (
        <List sx={{ mt: 2 }}>
          {files.map((file, index) => (
            <ListItem key={index} sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
              <ListItemIcon>
                {getFileIcon(file.type)}
              </ListItemIcon>
              <ListItemText
                primary={file.name}
                secondary={formatFileSize(file.size)}
              />
              <ListItemSecondaryAction>
                <Tooltip title="Remove file">
                  <IconButton edge="end" onClick={() => removeFile(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Text Content */}
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Additional Comments (optional)"
        placeholder="Add any notes or comments about your submission..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        sx={{ mt: 3 }}
      />

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="caption" color="text.secondary">
            Uploading... {uploadProgress}%
          </Typography>
        </Box>
      )}

      {/* Submit Button */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<UploadIcon />}
          onClick={() => setConfirmDialog(true)}
          disabled={!canSubmit || (isLate && !assignment?.allowLate)}
        >
          {submitting ? 'Submitting...' : existingSubmission ? 'Resubmit' : 'Submit Assignment'}
        </Button>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit this assignment?
            {existingSubmission && ' This will replace your previous submission.'}
          </Typography>
          {isLate && assignment?.allowLate && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This is a late submission and will incur a penalty.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            Confirm Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AssignmentUpload;
