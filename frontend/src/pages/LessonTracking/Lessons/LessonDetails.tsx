import React from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GET_LESSON, DELETE_LESSON } from '../../../graphql/lessons/queries';

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface Topic {
  id: string;
  title: string;
  description?: string;
}

const LessonDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, loading, error } = useQuery(GET_LESSON, {
    variables: { id },
  });

  const [deleteLesson] = useMutation(DELETE_LESSON);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) {
      return;
    }

    try {
      await deleteLesson({ variables: { id } });
      navigate('/lessons/lessons');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        Loading lesson details...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>
        Error: {error.message}
      </div>
    );
  }

  if (!data?.lesson) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        Lesson not found
      </div>
    );
  }

  const lesson = data.lesson;
  const formattedDate = new Date(lesson.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const statusColors: Record<string, { bg: string; color: string }> = {
    COMPLETED: { bg: '#d1fae5', color: '#059669' },
    PLANNED: { bg: '#dbeafe', color: '#1e40af' },
    IN_PROGRESS: { bg: '#fef3c7', color: '#92400e' },
    SKIPPED: { bg: '#fee2e2', color: '#dc2626' },
    RESCHEDULED: { bg: '#e0e7ff', color: '#4f46e5' },
  };

  const statusStyle = statusColors[lesson.status] || statusColors.PLANNED;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/lessons/lessons')}
        style={{
          background: 'none',
          border: 'none',
          color: '#6366f1',
          cursor: 'pointer',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        ← Back to Lessons
      </button>

      {/* Main Card */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '2rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#111827' }}>
                {lesson.topic || 'Untitled Lesson'}
              </h1>
              <span
                style={{
                  padding: '0.375rem 1rem',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  background: statusStyle.bg,
                  color: statusStyle.color,
                }}
              >
                {lesson.status.replace('_', ' ')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              <span>📅 {formattedDate}</span>
              {lesson.startTime && <span>🕐 {lesson.startTime} - {lesson.endTime || 'N/A'}</span>}
              {lesson.duration && <span>⏱️ {lesson.duration} hour{lesson.duration !== 1 ? 's' : ''}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link
              to={`/lessons/lessons/${id}/edit`}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                background: '#f3f4f6',
                color: '#374151',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem' }}>
          {/* Class & Subject Info */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
              padding: '1.5rem',
              background: '#f9fafb',
              borderRadius: '8px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Class
              </div>
              <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>
                {lesson.class?.name || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>
                School
              </div>
              <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>
                {lesson.class?.school?.name || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Subject
              </div>
              <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>
                {lesson.classSubject?.subject?.name || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Teaching Method
              </div>
              <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>
                {lesson.teachingMethod || 'N/A'}
              </div>
            </div>
          </div>

          {/* Description */}
          {lesson.description && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', color: '#374151', marginBottom: '0.75rem' }}>Description</h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>
                {lesson.description}
              </p>
            </div>
          )}

          {/* Topics Covered */}
          {lesson.topics && lesson.topics.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', color: '#374151', marginBottom: '0.75rem' }}>
                Topics Covered ({lesson.topics.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {lesson.topics.map((topic: Topic) => (
                  <div
                    key={topic.id}
                    style={{
                      padding: '0.75rem 1rem',
                      background: '#f3f4f6',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                      {topic.title}
                    </div>
                    {topic.description && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {topic.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance */}
          {(lesson.attendance || lesson.studentsPresent !== undefined) && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', color: '#374151', marginBottom: '0.75rem' }}>Attendance</h2>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div
                  style={{
                    padding: '1rem 1.5rem',
                    background: '#d1fae5',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#059669' }}>
                    {lesson.studentsPresent ?? lesson.attendance?.present ?? 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#059669' }}>Present</div>
                </div>
                <div
                  style={{
                    padding: '1rem 1.5rem',
                    background: '#fee2e2',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#dc2626' }}>
                    {lesson.studentsAbsent ?? lesson.attendance?.absent ?? 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>Absent</div>
                </div>
              </div>
            </div>
          )}

          {/* Materials Used */}
          {lesson.materialsUsed && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', color: '#374151', marginBottom: '0.75rem' }}>Materials Used</h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>
                {lesson.materialsUsed}
              </p>
            </div>
          )}

          {/* Homework Assigned */}
          {lesson.homeworkAssigned && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', color: '#374151', marginBottom: '0.75rem' }}>Homework Assigned</h2>
              <div
                style={{
                  padding: '1rem',
                  background: '#fef3c7',
                  borderRadius: '8px',
                  borderLeft: '4px solid #f59e0b',
                }}
              >
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e', lineHeight: 1.6 }}>
                  {lesson.homeworkAssigned}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {lesson.notes && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', color: '#374151', marginBottom: '0.75rem' }}>Notes</h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>
                {lesson.notes}
              </p>
            </div>
          )}

          {/* Attachments */}
          {lesson.attachments && lesson.attachments.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', color: '#374151', marginBottom: '0.75rem' }}>
                Attachments ({lesson.attachments.length})
              </h2>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {lesson.attachments.map((attachment: Attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      background: '#f3f4f6',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      color: '#374151',
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>📎</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{attachment.fileName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {attachment.fileType} • {(attachment.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <span style={{ color: '#6366f1', fontSize: '0.875rem' }}>Download</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 2rem',
            background: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#6b7280',
          }}
        >
          <span>Created: {new Date(lesson.createdAt).toLocaleString()}</span>
          {lesson.updatedAt && (
            <span>Last updated: {new Date(lesson.updatedAt).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonDetails;
