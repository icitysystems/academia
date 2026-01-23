import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { CREATE_SUBJECT, UPDATE_SUBJECT, GET_SUBJECT } from '../../../graphql/lessons/queries';

const SubjectForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  const { loading: loadingSubject } = useQuery(GET_SUBJECT, {
    variables: { id },
    skip: !isEdit,
    onCompleted: (data) => {
      if (data?.subject) {
        setFormData({
          name: data.subject.name,
          code: data.subject.code || '',
          description: data.subject.description || '',
        });
      }
    },
  });

  const [createSubject, { loading: creating }] = useMutation(CREATE_SUBJECT);
  const [updateSubject, { loading: updating }] = useMutation(UPDATE_SUBJECT);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Subject name is required');
      return;
    }

    try {
      if (isEdit) {
        await updateSubject({ variables: { id, input: formData } });
      } else {
        await createSubject({ variables: { input: formData } });
      }
      navigate(-1); // Go back
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loadingSubject) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <div
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
            {isEdit ? 'Edit Subject' : 'Create New Subject'}
          </h1>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                Subject Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Mathematics, Physics, English"
                required
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
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                Subject Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., MATH101, PHY201"
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
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the subject"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end',
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
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
              disabled={creating || updating}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                background: '#6366f1',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                opacity: creating || updating ? 0.6 : 1,
              }}
            >
              {creating || updating ? 'Saving...' : isEdit ? 'Update Subject' : 'Create Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectForm;
