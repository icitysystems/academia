import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { GET_LESSONS } from '../../../graphql/lessons/queries';

const LessonsList: React.FC = () => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    classId: '',
  });

  const { data, loading, error } = useQuery(GET_LESSONS, {
    variables: { filters },
  });

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>Error: {error.message}</div>;

  const lessons = data?.lessons || [];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>Lessons</h1>
        <Link to="/lessons/lessons/new" style={{ padding: '0.625rem 1.25rem', borderRadius: '6px', background: '#6366f1', color: 'white', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
          + Add Lesson
        </Link>
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => setFilters({ startDate: '', endDate: '', classId: '' })}
              style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>📝</div>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>No Lessons Yet</h2>
          <p style={{ margin: '0 0 2rem 0', color: '#6b7280' }}>Start tracking your lessons</p>
          <Link to="/lessons/lessons/new" style={{ padding: '0.625rem 1.25rem', borderRadius: '6px', background: '#6366f1', color: 'white', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            Create First Lesson
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {lessons.map((lesson: any) => (
            <Link
              key={lesson.id}
              to={`/lessons/lessons/${lesson.id}`}
              style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', color: '#111827' }}>{lesson.topic}</h3>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    <span>📅 {new Date(lesson.date).toLocaleDateString()}</span>
                    <span>🕐 {lesson.startTime} - {lesson.endTime}</span>
                    <span>📚 {lesson.class.name}</span>
                  </div>
                </div>
                <span style={{ padding: '0.25rem 0.75rem', background: '#dbeafe', color: '#1e40af', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 }}>
                  {lesson.status}
                </span>
              </div>
              {lesson.description && (
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>{lesson.description}</p>
              )}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', fontSize: '0.875rem', color: '#6b7280' }}>
                <span>✓ {lesson.studentsPresent} present</span>
                <span>✗ {lesson.studentsAbsent} absent</span>
                {lesson.topicCount > 0 && <span>📖 {lesson.topicCount} topics</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default LessonsList;
