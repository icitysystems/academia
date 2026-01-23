import React from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  GET_CLASS,
  ARCHIVE_CLASS,
  DELETE_CLASS,
  GET_LESSONS,
} from '../../../graphql/lessons/queries';

const ClassDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, loading, error } = useQuery(GET_CLASS, {
    variables: { id },
  });

  const { data: lessonsData } = useQuery(GET_LESSONS, {
    variables: { filters: { classId: id, limit: 5 } },
  });

  const [archiveClass] = useMutation(ARCHIVE_CLASS);
  const [deleteClass] = useMutation(DELETE_CLASS);

  const handleArchive = async () => {
    if (window.confirm('Archive this class? You can restore it later.')) {
      try {
        await archiveClass({ variables: { id } });
        navigate('/lessons/classes');
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Permanently delete this class? This cannot be undone.')) {
      try {
        await deleteClass({ variables: { id } });
        navigate('/lessons/classes');
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>Error: {error.message}</div>;
  if (!data?.class) return <div style={{ padding: '3rem', textAlign: 'center' }}>Class not found</div>;

  const cls = data.class;
  const recentLessons = lessonsData?.lessons || [];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={() => navigate('/lessons/classes')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.875rem' }}>
        ← Back to Classes
      </button>

      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>{cls.name}</h1>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              <span>Grade {cls.grade}</span>
              {cls.section && <span>• Section {cls.section}</span>}
              <span>• {cls.academicYear}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to={`/lessons/classes/${id}/edit`} style={{ padding: '0.625rem 1.25rem', borderRadius: '6px', background: '#f3f4f6', color: '#374151', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
              Edit
            </Link>
            <button onClick={handleArchive} style={{ padding: '0.625rem 1.25rem', borderRadius: '6px', background: '#fef3c7', color: '#92400e', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
              Archive
            </button>
            <button onClick={handleDelete} style={{ padding: '0.625rem 1.25rem', borderRadius: '6px', background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
              Delete
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>School</div>
            <div style={{ fontSize: '0.875rem', color: '#111827' }}>{cls.school.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>Students</div>
            <div style={{ fontSize: '0.875rem', color: '#111827' }}>{cls.studentCount}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>Subjects</div>
            <div style={{ fontSize: '0.875rem', color: '#111827' }}>{cls.subjectCount}</div>
          </div>
          {cls.schedule && (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>Schedule</div>
              <div style={{ fontSize: '0.875rem', color: '#111827' }}>{cls.schedule}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Subjects ({cls.subjects?.length || 0})</h2>
            <Link to={`/lessons/classes/${id}/subjects`} style={{ fontSize: '0.875rem', color: '#6366f1', textDecoration: 'none' }}>
              Manage →
            </Link>
          </div>
          {cls.subjects && cls.subjects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {cls.subjects.slice(0, 5).map((subject: any) => (
                <div key={subject.id} style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{subject.subject.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{subject.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>No subjects assigned yet</p>
          )}
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Recent Lessons</h2>
            <Link to={`/lessons/lessons/new?classId=${id}`} style={{ fontSize: '0.875rem', color: '#6366f1', textDecoration: 'none' }}>
              Add Lesson →
            </Link>
          </div>
          {recentLessons.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentLessons.map((lesson: any) => (
                <Link key={lesson.id} to={`/lessons/lessons/${lesson.id}`} style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>{lesson.topic}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{new Date(lesson.date).toLocaleDateString()}</div>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>No lessons recorded yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassDetails;
