import React, { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client';
import { ADD_LESSON_ATTACHMENT, ADD_LESSON_LINK } from '../../graphql/lessons/queries';
import './AttachmentUploader.css';

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
}

interface AttachmentUploaderProps {
  lessonId: string;
  existingAttachments?: Attachment[];
  onAttachmentAdded?: (attachment: Attachment) => void;
  onAttachmentRemoved?: (attachmentId: string) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  lessonId,
  existingAttachments = [],
  onAttachmentAdded,
  onAttachmentRemoved,
  maxFiles = 10,
  maxSizeMB = 50,
  acceptedTypes = ['.pdf', '.docx', '.pptx', '.png', '.jpg', '.jpeg', '.gif'],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);

  const [addAttachment] = useMutation(ADD_LESSON_ATTACHMENT);
  const [addLink] = useMutation(ADD_LESSON_LINK);

  const getFileType = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'PDF';
      case 'doc':
      case 'docx':
        return 'DOCX';
      case 'ppt':
      case 'pptx':
        return 'PPT';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return 'IMAGE';
      default:
        return 'OTHER';
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file count
    if (existingAttachments.length >= maxFiles) {
      return `Maximum ${maxFiles} attachments allowed`;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    // Check file type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(ext)) {
      return `File type ${ext} is not allowed`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Convert file to base64 for upload
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const { data } = await addAttachment({
          variables: {
            lessonId,
            input: {
              fileName: file.name,
              fileData: base64,
              fileType: getFileType(file.name),
              fileSize: file.size,
            },
          },
        });

        if (data?.addLessonAttachment && onAttachmentAdded) {
          onAttachmentAdded(data.addLessonAttachment);
        }
        setUploading(false);
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      setUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  }, [existingAttachments.length]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(uploadFile);
    e.target.value = ''; // Reset input
  };

  const handleAddLink = async () => {
    if (!linkUrl || !linkTitle) {
      setError('Please enter both URL and title');
      return;
    }

    // Validate URL
    try {
      new URL(linkUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const { data } = await addLink({
        variables: {
          lessonId,
          url: linkUrl,
          title: linkTitle,
        },
      });

      if (data?.addLessonLink && onAttachmentAdded) {
        onAttachmentAdded(data.addLessonLink);
      }
      setLinkUrl('');
      setLinkTitle('');
      setShowLinkForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add link');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType: string): string => {
    switch (fileType) {
      case 'PDF':
        return '📄';
      case 'DOCX':
        return '📝';
      case 'PPT':
        return '📊';
      case 'IMAGE':
        return '🖼️';
      case 'LINK':
        return '🔗';
      default:
        return '📁';
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="attachment-uploader">
      {/* Drop Zone */}
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-input"
          className="file-input"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <label htmlFor="file-input" className="drop-zone-content">
          {uploading ? (
            <>
              <div className="upload-spinner" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <span className="drop-icon">📎</span>
              <span className="drop-text">
                Drag & drop files here or <span className="browse-link">browse</span>
              </span>
              <span className="drop-hint">
                Max {maxFiles} files, {maxSizeMB}MB each
              </span>
            </>
          )}
        </label>
      </div>

      {/* Add Link Button */}
      <div className="link-section">
        {showLinkForm ? (
          <div className="link-form">
            <input
              type="url"
              placeholder="https://example.com/resource"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="link-input"
            />
            <input
              type="text"
              placeholder="Link title"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              className="link-input"
            />
            <div className="link-form-actions">
              <button
                type="button"
                onClick={handleAddLink}
                disabled={uploading}
                className="add-link-btn"
              >
                Add Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLinkForm(false);
                  setLinkUrl('');
                  setLinkTitle('');
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLinkForm(true)}
            className="show-link-form-btn"
          >
            🔗 Add Link
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* Attachment List */}
      {existingAttachments.length > 0 && (
        <div className="attachments-list">
          <h4>Attachments ({existingAttachments.length}/{maxFiles})</h4>
          <ul>
            {existingAttachments.map((attachment) => (
              <li key={attachment.id} className="attachment-item">
                <span className="attachment-icon">{getFileIcon(attachment.fileType)}</span>
                <div className="attachment-info">
                  <a
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="attachment-name"
                  >
                    {attachment.fileName}
                  </a>
                  <span className="attachment-meta">
                    {attachment.fileType}
                    {attachment.fileSize && ` • ${formatFileSize(attachment.fileSize)}`}
                  </span>
                </div>
                {onAttachmentRemoved && (
                  <button
                    type="button"
                    onClick={() => onAttachmentRemoved(attachment.id)}
                    className="remove-attachment-btn"
                    title="Remove attachment"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;
