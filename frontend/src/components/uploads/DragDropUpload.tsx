import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
} from '@mui/icons-material';
import { useMutation, gql } from '@apollo/client';

const UPLOAD_FILE = gql`
  mutation UploadFile($file: Upload!, $resourceType: String!, $resourceId: String!) {
    uploadFileAttachment(file: $file, resourceType: $resourceType, resourceId: $resourceId) {
      id
      fileName
      originalName
      fileUrl
      mimeType
      fileSize
    }
  }
`;

interface FileWithPreview extends File {
  preview?: string;
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
  uploadError?: string;
  uploadedId?: string;
}

interface DragDropUploadProps {
  resourceType: string;
  resourceId: string;
  accept?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  onUploadComplete?: (files: Array<{ id: string; fileName: string; fileUrl: string }>) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon color="primary" />;
  if (mimeType === 'application/pdf') return <PdfIcon color="error" />;
  if (mimeType.includes('document') || mimeType.includes('word')) return <DocIcon color="info" />;
  return <FileIcon />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const DragDropUpload: React.FC<DragDropUploadProps> = ({
  resourceType,
  resourceId,
  accept = '*/*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  onUploadComplete,
  onError,
  disabled = false,
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadFile] = useMutation(UPLOAD_FILE);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize) {
      return `File "${file.name}" exceeds maximum size of ${formatFileSize(maxSize)}`;
    }
    if (accept !== '*/*') {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'));
        }
        return file.type === type;
      });
      if (!isAccepted) {
        return `File type "${file.type}" is not accepted`;
      }
    }
    return null;
  }, [accept, maxSize]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    
    if (files.length + fileArray.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles: FileWithPreview[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        const fileWithPreview: FileWithPreview = Object.assign(file, {
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          uploadStatus: 'pending' as const,
          uploadProgress: 0,
        });
        validFiles.push(fileWithPreview);
      }
    });

    if (errors.length > 0) {
      onError?.(errors.join('; '));
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  }, [files.length, maxFiles, onError, validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [addFiles, disabled]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  }, [addFiles]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const removed = newFiles.splice(index, 1)[0];
      if (removed.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return newFiles;
    });
  }, []);

  const uploadFiles = useCallback(async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    const uploadedFiles: Array<{ id: string; fileName: string; fileUrl: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.uploadStatus === 'success') {
        if (file.uploadedId) {
          uploadedFiles.push({
            id: file.uploadedId,
            fileName: file.name,
            fileUrl: '',
          });
        }
        continue;
      }

      setFiles(prev => {
        const newFiles = [...prev];
        newFiles[i] = { ...newFiles[i], uploadStatus: 'uploading', uploadProgress: 0 };
        return newFiles;
      });

      try {
        const result = await uploadFile({
          variables: {
            file,
            resourceType,
            resourceId,
          },
        });

        const uploaded = result.data.uploadFileAttachment;
        uploadedFiles.push({
          id: uploaded.id,
          fileName: uploaded.originalName,
          fileUrl: uploaded.fileUrl,
        });

        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[i] = {
            ...newFiles[i],
            uploadStatus: 'success',
            uploadProgress: 100,
            uploadedId: uploaded.id,
          };
          return newFiles;
        });
      } catch (error: any) {
        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[i] = {
            ...newFiles[i],
            uploadStatus: 'error',
            uploadError: error.message || 'Upload failed',
          };
          return newFiles;
        });
      }
    }

    setIsUploading(false);
    if (uploadedFiles.length > 0) {
      onUploadComplete?.(uploadedFiles);
    }
  }, [files, isUploading, uploadFile, resourceType, resourceId, onUploadComplete]);

  const pendingCount = files.filter(f => f.uploadStatus === 'pending').length;
  const successCount = files.filter(f => f.uploadStatus === 'success').length;
  const errorCount = files.filter(f => f.uploadStatus === 'error').length;

  return (
    <Box>
      {/* Drop Zone */}
      <Paper
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: '2px dashed',
          borderColor: isDragging ? 'primary.main' : 'grey.300',
          backgroundColor: isDragging ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: disabled ? 'grey.300' : 'primary.light',
            backgroundColor: disabled ? 'background.paper' : 'action.hover',
          },
          opacity: disabled ? 0.6 : 1,
        }}
        role="button"
        aria-label="Drop files here or click to select"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled}
          aria-hidden="true"
        />
        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragging ? 'Drop files here' : 'Drag & Drop files here'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or click to browse
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
          Maximum {maxFiles} files, up to {formatFileSize(maxSize)} each
        </Typography>
      </Paper>

      {/* File List */}
      {files.length > 0 && (
        <Paper sx={{ mt: 2 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">
              {files.length} file(s) selected
              {successCount > 0 && <Chip size="small" label={`${successCount} uploaded`} color="success" sx={{ ml: 1 }} />}
              {errorCount > 0 && <Chip size="small" label={`${errorCount} failed`} color="error" sx={{ ml: 1 }} />}
            </Typography>
            <Button
              variant="contained"
              startIcon={isUploading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
              onClick={uploadFiles}
              disabled={disabled || isUploading || pendingCount === 0}
            >
              {isUploading ? 'Uploading...' : `Upload ${pendingCount} file(s)`}
            </Button>
          </Box>
          <List dense>
            {files.map((file, index) => (
              <ListItem key={`${file.name}-${index}`}>
                <ListItemIcon>
                  {file.uploadStatus === 'success' ? (
                    <SuccessIcon color="success" />
                  ) : file.uploadStatus === 'error' ? (
                    <ErrorIcon color="error" />
                  ) : (
                    getFileIcon(file.type)
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={
                    <Box component="span">
                      {formatFileSize(file.size)}
                      {file.uploadError && (
                        <Typography component="span" color="error" sx={{ ml: 1 }}>
                          - {file.uploadError}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                {file.uploadStatus === 'uploading' && (
                  <Box sx={{ width: 100, mr: 2 }}>
                    <LinearProgress />
                  </Box>
                )}
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeFile(index)}
                    disabled={file.uploadStatus === 'uploading'}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default DragDropUpload;
