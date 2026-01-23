import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  GET_CLASS,
  GET_SUBJECTS,
  ASSIGN_SUBJECT_TO_CLASS,
  REMOVE_SUBJECT_FROM_CLASS,
} from '../../../graphql/lessons/queries';

interface Subject {
  id: string;
  name: string;
  code?: string;
  description?: string;
}

interface ClassSubject {
  id: string;
  subject: Subject;
  totalHours: number;
  weeklyHours: number;
  startDate?: string;
  endDate?: string;
  status: string;
}

const SubjectsManagement: React.FC = () => {
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    subjectId: '',
    totalHours: 40,
    weeklyHours: 4,
    startDate: '',
    endDate: '',
  });

  const { data: classData, loading: loadingClass, refetch } = useQuery(GET_CLASS, {
    variables: { id: classId },
  });

  const { data: subjectsData, loading: loadingSubjects } = useQuery(GET_SUBJECTS, {
    variables: { search: searchTerm },
  });

  const [assignSubject, { loading: assigning }] = useMutation(ASSIGN_SUBJECT_TO_CLASS);
  const [removeSubject] = useMutation(REMOVE_SUBJECT_FROM_CLASS);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subjectId) {
      alert('Please select a subject');
      return;
    }

    try {
      await assignSubject({
        variables: {
          input: {
            classId,
            subjectId: formData.subjectId,
            totalHours: formData.totalHours,
            weeklyHours: formData.weeklyHours,
            startDate: formData.startDate || undefined,
            endDate: formData.endDate || undefined,
          },
        },
      });
      
      setShowAddForm(false);
      setFormData({
        subjectId: '',
        totalHours: 40,
        weeklyHours: 4,
        startDate: '',
        endDate: '',
      });
      refetch();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRemove = async (classSubjectId: string, subjectName: string) => {
    if (!window.confirm(`Remove ${subjectName} from this class?`)) {
      return;
    }

    try {
      await removeSubject({ variables: { classSubjectId } });
      refetch();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loadingClass) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
  }

  const cls = classData?.class;
  const classSubjects: ClassSubject[] = cls?.subjects || [];
  const availableSubjects: Subject[] = subjectsData?.subjects || [];
  
  // Filter out already assigned subjects
  const assignedSubjectIds = classSubjects.map(cs => cs.subject.id);
  const unassignedSubjects = availableSubjects.filter(s => !assignedSubjectIds.includes(s.id));

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <button
        onClick={() => navigate(`/lessons/classes/${classId}`)}
        style={{
          background: 'none',
          border: 'none',
          color: '#6366f1',
          cursor: 'pointer',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}
      >
        ← Back to Class
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.75rem' }}>Manage Subjects</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
            {cls?.name} - {cls?.school?.name}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '6px',
            background: showAddForm ? '#f3f4f6' : '#6366f1',
            color: showAddForm ? '#374151' : 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add Subject'}
        </button>
      </div>

      {/* Add Subject Form */}
      {showAddForm && (
        <div
          style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.125rem' }}>Add Subject to Class</h2>
          
          <form onSubmit={handleAssign}>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Subject <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '0.625rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="">Select a subject</option>
                    {unassignedSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} {subject.code ? `(${subject.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <Link
                    to="/lessons/subjects/new"
                    style={{
                      padding: '0.625rem 1rem',
                      borderRadius: '6px',
                      background: '#f3f4f6',
                      color: '#374151',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    + New
                  </Link>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                    Total Hours
                  </label>
                  <input
                    type="number"
                    value={formData.totalHours}
                    onChange={(e) => setFormData({ ...formData, totalHours: parseInt(e.target.value) || 0 })}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                    Weekly Hours
                  </label>
                  <input
                    type="number"
                    value={formData.weeklyHours}
                    onChange={(e) => setFormData({ ...formData, weeklyHours: parseInt(e.target.value) || 0 })}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#f3f4f6',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigning}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#6366f1',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  opacity: assigning ? 0.6 : 1,
                }}
              >
                {assigning ? 'Adding...' : 'Add Subject'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assigned Subjects */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem' }}>
            Assigned Subjects ({classSubjects.length})
          </h2>
        </div>

        {classSubjects.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No Subjects Assigned</h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
              Click "Add Subject" to assign subjects to this class
            </p>
          </div>
        ) : (
          <div style={{ padding: '1rem' }}>
            {classSubjects.map((cs) => (
              <div
                key={cs.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: '8px',
                  background: '#f9fafb',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{cs.subject.name}</h3>
                    {cs.subject.code && (
                      <span
                        style={{
                          padding: '0.125rem 0.5rem',
                          background: '#e5e7eb',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          color: '#6b7280',
                        }}
                      >
                        {cs.subject.code}
                      </span>
                    )}
                    <span
                      style={{
                        padding: '0.125rem 0.5rem',
                        background: cs.status === 'ACTIVE' ? '#d1fae5' : '#f3f4f6',
                        color: cs.status === 'ACTIVE' ? '#059669' : '#6b7280',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      {cs.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    <span>📅 {cs.totalHours} total hours</span>
                    <span>📆 {cs.weeklyHours} hours/week</span>
                    {cs.startDate && <span>🗓 {new Date(cs.startDate).toLocaleDateString()} - {cs.endDate ? new Date(cs.endDate).toLocaleDateString() : 'Ongoing'}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link
                    to={`/lessons/syllabus?classSubjectId=${cs.id}`}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      background: '#dbeafe',
                      color: '#1e40af',
                      textDecoration: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    Syllabus
                  </Link>
                  <Link
                    to={`/lessons/lessons?classId=${classId}&subjectId=${cs.subject.id}`}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      background: '#f3f4f6',
                      color: '#374151',
                      textDecoration: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    Lessons
                  </Link>
                  <button
                    onClick={() => handleRemove(cs.id, cs.subject.name)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectsManagement;
