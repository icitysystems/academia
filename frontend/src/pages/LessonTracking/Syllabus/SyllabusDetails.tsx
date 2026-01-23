import React from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GET_SYLLABUS, DELETE_SYLLABUS, UPDATE_TOPIC_STATUS } from '../../../graphql/lessons/queries';

interface Topic {
  id: string;
  title: string;
  description?: string;
  duration: number;
  status: string;
  order: number;
}

interface Unit {
  id: string;
  title: string;
  description?: string;
  order: number;
  topics: Topic[];
}

const SyllabusDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useQuery(GET_SYLLABUS, {
    variables: { id },
  });

  const [deleteSyllabus] = useMutation(DELETE_SYLLABUS);
  const [updateTopicStatus] = useMutation(UPDATE_TOPIC_STATUS);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this syllabus?')) {
      return;
    }

    try {
      await deleteSyllabus({ variables: { id } });
      navigate('/lessons/syllabus');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleTopicStatusChange = async (topicId: string, status: string) => {
    try {
      await updateTopicStatus({ variables: { topicId, status } });
      refetch();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading syllabus...</div>;
  }

  if (error) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>Error: {error.message}</div>;
  }

  if (!data?.syllabus) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Syllabus not found</div>;
  }

  const syllabus = data.syllabus;
  const units: Unit[] = syllabus.units || [];
  const totalTopics = units.reduce((sum, u) => sum + (u.topics?.length || 0), 0);
  const completedTopics = units.reduce((sum, u) => sum + (u.topics?.filter((t: Topic) => t.status === 'COMPLETED').length || 0), 0);
  const progress = syllabus.totalHours > 0 ? Math.round((syllabus.completedHours / syllabus.totalHours) * 100) : 0;

  const statusOptions = [
    { value: 'NOT_STARTED', label: 'Not Started', color: '#6b7280', bg: '#f3f4f6' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: '#d97706', bg: '#fef3c7' },
    { value: 'COMPLETED', label: 'Completed', color: '#059669', bg: '#d1fae5' },
    { value: 'SKIPPED', label: 'Skipped', color: '#dc2626', bg: '#fee2e2' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/lessons/syllabus')}
        style={{
          background: 'none',
          border: 'none',
          color: '#6366f1',
          cursor: 'pointer',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}
      >
        ← Back to Syllabi
      </button>

      {/* Header Card */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '2rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', color: '#111827' }}>
                {syllabus.title}
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                {syllabus.classSubject?.subject?.name} - {syllabus.classSubject?.class?.name}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link
                to={`/lessons/syllabus/${id}/edit`}
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

          {syllabus.description && (
            <p style={{ margin: '1rem 0 0 0', fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>
              {syllabus.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1px',
            background: '#e5e7eb',
          }}
        >
          <div style={{ background: 'white', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#6366f1' }}>{progress}%</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Progress</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>{units.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Units</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>{completedTopics}/{totalTopics}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Topics Done</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>{syllabus.totalHours}h</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Hours</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ padding: '1rem 2rem', background: '#f9fafb' }}>
          <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      </div>

      {/* Units & Topics */}
      {units.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>No Units Yet</h3>
          <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280' }}>Add units and topics to this syllabus</p>
          <Link
            to={`/lessons/syllabus/${id}/edit`}
            style={{
              display: 'inline-block',
              padding: '0.625rem 1.25rem',
              borderRadius: '6px',
              background: '#6366f1',
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Add Units
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {units.sort((a, b) => a.order - b.order).map((unit, unitIndex) => {
            const unitTopics = unit.topics || [];
            const unitCompleted = unitTopics.filter(t => t.status === 'COMPLETED').length;
            const unitProgress = unitTopics.length > 0 ? Math.round((unitCompleted / unitTopics.length) * 100) : 0;

            return (
              <div
                key={unit.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                }}
              >
                {/* Unit Header */}
                <div
                  style={{
                    padding: '1rem 1.5rem',
                    background: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#6366f1',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      {unitIndex + 1}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{unit.title}</h3>
                      {unit.description && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>{unit.description}</p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {unitCompleted}/{unitTopics.length} topics
                    </span>
                    <div
                      style={{
                        width: '100px',
                        height: '6px',
                        background: '#e5e7eb',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${unitProgress}%`,
                          background: unitProgress === 100 ? '#10b981' : '#6366f1',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Topics List */}
                {unitTopics.length > 0 && (
                  <div style={{ padding: '0.5rem' }}>
                    {unitTopics.sort((a, b) => a.order - b.order).map((topic, topicIndex) => {
                      const statusConfig = statusOptions.find(s => s.value === topic.status) || statusOptions[0];

                      return (
                        <div
                          key={topic.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem 1rem',
                            borderRadius: '6px',
                            transition: 'background 0.2s',
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af', width: '30px' }}>
                            {unitIndex + 1}.{topicIndex + 1}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                              {topic.title}
                            </div>
                            {topic.description && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                                {topic.description}
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {topic.duration}h
                          </span>
                          <select
                            value={topic.status}
                            onChange={(e) => handleTopicStatusChange(topic.id, e.target.value)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              borderRadius: '6px',
                              border: 'none',
                              background: statusConfig.bg,
                              color: statusConfig.color,
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            {statusOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SyllabusDetails;
