import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CREATE_SYLLABUS,
  UPDATE_SYLLABUS,
  GET_SYLLABUS,
  GET_MY_CLASSES,
} from '../../../graphql/lessons/queries';

interface TopicInput {
  id?: string;
  title: string;
  description: string;
  duration: number;
  order: number;
}

interface UnitInput {
  id?: string;
  title: string;
  description: string;
  order: number;
  topics: TopicInput[];
}

const SyllabusForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classSubjectId: searchParams.get('classSubjectId') || '',
  });

  const [units, setUnits] = useState<UnitInput[]>([]);

  const { data: classesData } = useQuery(GET_MY_CLASSES);
  const { loading: loadingSyllabus } = useQuery(GET_SYLLABUS, {
    variables: { id },
    skip: !isEdit,
    onCompleted: (data) => {
      if (data?.syllabus) {
        const s = data.syllabus;
        setFormData({
          title: s.title,
          description: s.description || '',
          classSubjectId: s.classSubject?.id || '',
        });
        setUnits(
          (s.units || []).map((u: any) => ({
            id: u.id,
            title: u.title,
            description: u.description || '',
            order: u.order,
            topics: (u.topics || []).map((t: any) => ({
              id: t.id,
              title: t.title,
              description: t.description || '',
              duration: t.duration,
              order: t.order,
            })),
          }))
        );
      }
    },
  });

  const [createSyllabus, { loading: creating }] = useMutation(CREATE_SYLLABUS);
  const [updateSyllabus, { loading: updating }] = useMutation(UPDATE_SYLLABUS);

  // Get class subjects from classes
  const classes = classesData?.myClasses || [];
  const classSubjects = classes.flatMap((cls: any) =>
    (cls.subjects || []).map((cs: any) => ({
      id: cs.id,
      label: `${cs.subject?.name || 'Unknown'} - ${cls.name}`,
      className: cls.name,
      subjectName: cs.subject?.name,
    }))
  );

  const addUnit = () => {
    setUnits([
      ...units,
      {
        title: '',
        description: '',
        order: units.length + 1,
        topics: [],
      },
    ]);
  };

  const removeUnit = (index: number) => {
    const newUnits = units.filter((_, i) => i !== index);
    setUnits(newUnits.map((u, i) => ({ ...u, order: i + 1 })));
  };

  const updateUnit = (index: number, field: keyof UnitInput, value: any) => {
    const newUnits = [...units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setUnits(newUnits);
  };

  const addTopic = (unitIndex: number) => {
    const newUnits = [...units];
    newUnits[unitIndex].topics.push({
      title: '',
      description: '',
      duration: 1,
      order: newUnits[unitIndex].topics.length + 1,
    });
    setUnits(newUnits);
  };

  const removeTopic = (unitIndex: number, topicIndex: number) => {
    const newUnits = [...units];
    newUnits[unitIndex].topics = newUnits[unitIndex].topics
      .filter((_, i) => i !== topicIndex)
      .map((t, i) => ({ ...t, order: i + 1 }));
    setUnits(newUnits);
  };

  const updateTopic = (unitIndex: number, topicIndex: number, field: keyof TopicInput, value: any) => {
    const newUnits = [...units];
    newUnits[unitIndex].topics[topicIndex] = {
      ...newUnits[unitIndex].topics[topicIndex],
      [field]: value,
    };
    setUnits(newUnits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Please enter a syllabus title');
      return;
    }

    if (!formData.classSubjectId) {
      alert('Please select a class and subject');
      return;
    }

    const input = {
      title: formData.title,
      description: formData.description || undefined,
      classSubjectId: formData.classSubjectId,
      units: units.map(u => ({
        ...(u.id ? { id: u.id } : {}),
        title: u.title,
        description: u.description || undefined,
        order: u.order,
        topics: u.topics.map(t => ({
          ...(t.id ? { id: t.id } : {}),
          title: t.title,
          description: t.description || undefined,
          duration: t.duration,
          order: t.order,
        })),
      })),
    };

    try {
      if (isEdit) {
        await updateSyllabus({ variables: { id, input } });
      } else {
        await createSyllabus({ variables: { input } });
      }
      navigate('/lessons/syllabus');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loadingSyllabus) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
  }

  const totalHours = units.reduce(
    (sum, u) => sum + u.topics.reduce((tSum, t) => tSum + (t.duration || 0), 0),
    0
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
            {isEdit ? 'Edit Syllabus' : 'Create New Syllabus'}
          </h1>
          <button
            onClick={() => navigate('/lessons/syllabus')}
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
          <div style={{ padding: '2rem' }}>
            {/* Basic Info */}
            <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Syllabus Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Mathematics Grade 10 - Complete Syllabus"
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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Class & Subject <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={formData.classSubjectId}
                  onChange={(e) => setFormData({ ...formData, classSubjectId: e.target.value })}
                  required
                  disabled={isEdit}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    background: isEdit ? '#f9fafb' : 'white',
                  }}
                >
                  <option value="">Select class and subject</option>
                  {classSubjects.map((cs: any) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this syllabus"
                  rows={3}
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

            {/* Summary */}
            <div
              style={{
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '8px',
                marginBottom: '2rem',
                display: 'flex',
                gap: '2rem',
                fontSize: '0.875rem',
              }}
            >
              <span>📚 {units.length} unit{units.length !== 1 ? 's' : ''}</span>
              <span>📝 {units.reduce((sum, u) => sum + u.topics.length, 0)} topic{units.reduce((sum, u) => sum + u.topics.length, 0) !== 1 ? 's' : ''}</span>
              <span>⏱️ {totalHours} total hour{totalHours !== 1 ? 's' : ''}</span>
            </div>

            {/* Units Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Units & Topics</h2>
                <button
                  type="button"
                  onClick={addUnit}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  + Add Unit
                </button>
              </div>

              {units.length === 0 ? (
                <div
                  style={{
                    padding: '3rem',
                    textAlign: 'center',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '2px dashed #e5e7eb',
                  }}
                >
                  <p style={{ margin: 0, color: '#6b7280' }}>No units yet. Click "Add Unit" to get started.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {units.map((unit, unitIndex) => (
                    <div
                      key={unitIndex}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Unit Header */}
                      <div
                        style={{
                          padding: '1rem',
                          background: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          display: 'flex',
                          gap: '1rem',
                          alignItems: 'start',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: '#6366f1',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            flexShrink: 0,
                          }}
                        >
                          {unitIndex + 1}
                        </div>
                        <div style={{ flex: 1, display: 'grid', gap: '0.75rem' }}>
                          <input
                            type="text"
                            value={unit.title}
                            onChange={(e) => updateUnit(unitIndex, 'title', e.target.value)}
                            placeholder="Unit title"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                            }}
                          />
                          <input
                            type="text"
                            value={unit.description}
                            onChange={(e) => updateUnit(unitIndex, 'description', e.target.value)}
                            placeholder="Unit description (optional)"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              fontSize: '0.75rem',
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUnit(unitIndex)}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '6px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          🗑️
                        </button>
                      </div>

                      {/* Topics */}
                      <div style={{ padding: '1rem' }}>
                        {unit.topics.map((topic, topicIndex) => (
                          <div
                            key={topicIndex}
                            style={{
                              display: 'flex',
                              gap: '0.75rem',
                              alignItems: 'center',
                              padding: '0.5rem 0',
                              borderBottom: topicIndex < unit.topics.length - 1 ? '1px solid #f3f4f6' : 'none',
                            }}
                          >
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', width: '30px' }}>
                              {unitIndex + 1}.{topicIndex + 1}
                            </span>
                            <input
                              type="text"
                              value={topic.title}
                              onChange={(e) => updateTopic(unitIndex, topicIndex, 'title', e.target.value)}
                              placeholder="Topic title"
                              style={{
                                flex: 1,
                                padding: '0.375rem 0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb',
                                fontSize: '0.875rem',
                              }}
                            />
                            <input
                              type="number"
                              value={topic.duration}
                              onChange={(e) => updateTopic(unitIndex, topicIndex, 'duration', parseFloat(e.target.value) || 0)}
                              min="0.5"
                              step="0.5"
                              style={{
                                width: '70px',
                                padding: '0.375rem 0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb',
                                fontSize: '0.75rem',
                                textAlign: 'center',
                              }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>hrs</span>
                            <button
                              type="button"
                              onClick={() => removeTopic(unitIndex, topicIndex)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                background: 'transparent',
                                color: '#dc2626',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addTopic(unitIndex)}
                          style={{
                            marginTop: '0.75rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            background: '#f3f4f6',
                            color: '#374151',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                          }}
                        >
                          + Add Topic
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '1.5rem 2rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/lessons/syllabus')}
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
              {creating || updating ? 'Saving...' : isEdit ? 'Update Syllabus' : 'Create Syllabus'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SyllabusForm;
