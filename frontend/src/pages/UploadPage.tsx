import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  TextField,
  Grid,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { UPLOAD_SHEET, BATCH_UPLOAD_SHEETS } from '../graphql/queries';

interface FileWithPreview extends File {
  preview?: string;
  studentId?: string;
  studentName?: string;
  status?: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const UploadPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);

  const [uploadSheet] = useMutation(UPLOAD_SHEET);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const filesWithPreview = newFiles.map((file) => {
      const f = file as FileWithPreview;
      f.preview = URL.createObjectURL(file);
      f.status = 'pending';
      f.studentId = '';
      f.studentName = '';
      return f;
    });
    setFiles((prev) => [...prev, ...filesWithPreview]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const updateFileInfo = (index: number, field: 'studentId' | 'studentName', value: string) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], [field]: value };
      return newFiles;
    });
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0 || !templateId) return;

    setUploading(true);
    setProgress(0);
    let successCount = 0;
    let failedCount = 0;

    const updatedFiles = [...files];

    for (let i = 0; i < files.length; i++) {
      const file = updatedFiles[i];
      updatedFiles[i] = { ...file, status: 'uploading' };
      setFiles([...updatedFiles]);

      try {
        const base64 = await convertToBase64(file);

        await uploadSheet({
          variables: {
            input: {
              templateId,
              imageData: base64,
              fileName: file.name,
              studentId: file.studentId || undefined,
              studentName: file.studentName || undefined,
            },
          },
        });

        updatedFiles[i] = { ...file, status: 'success' };
        successCount++;
      } catch (error: any) {
        updatedFiles[i] = { ...file, status: 'error', error: error.message };
        failedCount++;
      }

      setFiles([...updatedFiles]);
      setProgress(((i + 1) / files.length) * 100);
    }

    setUploading(false);
    setResults({ success: successCount, failed: failedCount });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Upload Answer Sheets</Typography>
        <Button variant="outlined" onClick={() => navigate(`/templates/${templateId}`)}>
          Back to Template
        </Button>
      </Box>

      {results && (
        <Alert
          severity={results.failed === 0 ? 'success' : 'warning'}
          sx={{ mb: 3 }}
          onClose={() => setResults(null)}
        >
          Upload complete: {results.success} successful, {results.failed} failed
        </Alert>
      )}

      {/* Drop Zone */}
      <Paper
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        sx={{
          p: 4,
          mb: 3,
          border: '2px dashed',
          borderColor: 'primary.main',
          borderRadius: 2,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: 'action.hover',
          '&:hover': {
            backgroundColor: 'action.selected',
          },
        }}
      >
        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Drag and drop answer sheets here
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          or
        </Typography>
        <Button variant="contained" component="label">
          Select Files
          <input
            type="file"
            hidden
            multiple
            accept="image/*,.pdf"
            onChange={handleFileSelect}
          />
        </Button>
        <Typography variant="caption" display="block" sx={{ mt: 2 }}>
          Supported formats: JPEG, PNG, PDF
        </Typography>
      </Paper>

      {/* File List */}
      {files.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Selected Files ({files.length})
          </Typography>
          <List>
            {files.map((file, index) => (
              <ListItem
                key={index}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemIcon>
                  {file.status === 'success' ? (
                    <SuccessIcon color="success" />
                  ) : file.status === 'error' ? (
                    <ErrorIcon color="error" />
                  ) : (
                    <FileIcon />
                  )}
                </ListItemIcon>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <ListItemText
                      primary={file.name}
                      secondary={`${(file.size / 1024).toFixed(1)} KB`}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      size="small"
                      label="Student ID"
                      value={file.studentId || ''}
                      onChange={(e) => updateFileInfo(index, 'studentId', e.target.value)}
                      disabled={uploading || file.status === 'success'}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      size="small"
                      label="Student Name"
                      value={file.studentName || ''}
                      onChange={(e) => updateFileInfo(index, 'studentName', e.target.value)}
                      disabled={uploading || file.status === 'success'}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Chip
                      size="small"
                      label={file.status || 'pending'}
                      color={
                        file.status === 'success'
                          ? 'success'
                          : file.status === 'error'
                          ? 'error'
                          : file.status === 'uploading'
                          ? 'primary'
                          : 'default'
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <IconButton
                      onClick={() => removeFile(index)}
                      disabled={uploading || file.status === 'success'}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </ListItem>
            ))}
          </List>

          {uploading && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" color="text.secondary">
                Uploading... {Math.round(progress)}%
              </Typography>
            </Box>
          )}

          <Box display="flex" gap={2} mt={2}>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={uploading || files.every((f) => f.status === 'success')}
              startIcon={<UploadIcon />}
            >
              {uploading ? 'Uploading...' : 'Upload All'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setFiles([])}
              disabled={uploading}
            >
              Clear All
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default UploadPage;
