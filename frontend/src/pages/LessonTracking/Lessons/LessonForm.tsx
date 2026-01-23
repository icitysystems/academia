import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CREATE_LESSON,
  UPDATE_LESSON,
  GET_LESSON,
  GET_MY_CLASSES,
} from '../../../graphql/lessons/queries';

const LessonForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    classId: searchParams.get('classId') || '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    topic: '',
    description: '',
    studentsPresent: 0,
    studentsAbsent: 0,
    materials: '',
    homework: '',
  });

  const { data: classesData } = useQuery(GET_MY_CLASSES);
  const { loading: loadingLesson } = useQuery(GET_LESSON, {
    variables: { id },
    skip: !isEdit,
    onCompleted: (data) => {
      if (data?.lesson) {
        const lesson = data.lesson;
        setFormData({
          classId: lesson.class.id,
          date: lesson.date,
          startTime: lesson.startTime || '',
          endTime: lesson.endTime || '',
          topic: lesson.topic,
          description: lesson.description || '',
          studentsPresent: lesson.studentsPresent,
          studentsAbsent: lesson.studentsAbsent,
          materials: lesson.materials || '',
          homework: lesson.homework || '',
        });
      }
    },
  });

  const [createLesson, { loading: creating }] = useMutation(CREATE_LESSON);
  const [updateLesson, { loading: updating }] = useMutation(UPDATE_LESSON);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.classId || !formData.date || !formData.topic) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const input = {
        ...formData,
        studentsPresent: parseInt(formData.studentsPresent.toString()),
        studentsAbsent: parseInt(formData.studentsAbsent.toString()),
      };

      if (isEdit) {
        await updateLesson({ variables: { id, input } });
      } else {
        await createLesson({ variables: { input } });
      }
      navigate('/lessons/lessons');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const classes = classesData?.myClasses || [];

  if (loadingLesson) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0 }}>{isEdit ? 'Edit Lesson' : 'Record New Lesson'}</h1>
          <button onClick={() => navigate('/lessons/lessons')} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Class <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                required
                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
              >
                <option value="">Select Class</option>
                {classes.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.school.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Topic <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="Main topic covered"
                required
                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed notes about the lesson"
                rows={4}
                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Students Present
                </label>
                <input
                  type="number"
                  value={formData.studentsPresent}
                  onChange={(e) => setFormData({ ...formData, studentsPresent: parseInt(e.target.value) || 0 })}
                  min="0"
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Students Absent
                </label>
                <input
                  type="number"
                  value={formData.studentsAbsent}
                  onChange={(e) => setFormData({ ...formData, studentsAbsent: parseInt(e.target.value) || 0 })}
                  min="0"
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Materials Used
              </label>
              <textarea
                value={formData.materials}
                onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                placeholder="Textbooks, handouts, videos, etc."
                rows={2}
                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem', fontFamily: 'inherit' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Homework Assigned
              </label>
              <textarea
                value={formData.homework}
                onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                placeholder="Assignment details"
                rows={2}
                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <button
              type="button"
              onClick={() => navigate('/lessons/lessons')}
              style={{ padding: '0.625rem 1.25rem', borderRadius: '6px', border: 'none', background: '#f3f4f6', color: '#374151', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || updating}
              style={{ padding: '0.625rem 1.25rem', borderRadius: '6px', border: 'none', background: '#6366f1', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: (creating || updating) ? 0.6 : 1 }}
            >
              {creating || updating ? 'Saving...' : isEdit ? 'Update Lesson' : 'Create Lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LessonForm;
