import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CREATE_CLASS,
  UPDATE_CLASS,
  GET_CLASS,
  GET_MY_SCHOOLS,
} from '../../../graphql/lessons/queries';

interface ClassFormData {
  name: string;
  schoolId: string;
  grade: string;
  section: string;
  academicYear: string;
  studentCount: number;
  schedule: string;
  startDate: string;
  endDate: string;
}

const ClassForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<ClassFormData>({
    name: '',
    schoolId: searchParams.get('schoolId') || '',
    grade: '',
    section: '',
    academicYear: new Date().getFullYear().toString(),
    studentCount: 0,
    schedule: '',
    startDate: '',
    endDate: '',
  });

  const { data: schoolsData } = useQuery(GET_MY_SCHOOLS);
  const { loading: loadingClass } = useQuery(GET_CLASS, {
    variables: { id },
    skip: !isEdit,
    onCompleted: (data) => {
      if (data?.class) {
        const cls = data.class;
        setFormData({
          name: cls.name,
          schoolId: cls.school.id,
          grade: cls.grade,
          section: cls.section || '',
          academicYear: cls.academicYear,
          studentCount: cls.studentCount,
          schedule: cls.schedule || '',
          startDate: cls.startDate || '',
          endDate: cls.endDate || '',
        });
      }
    },
  });

  const [createClass, { loading: creating }] = useMutation(CREATE_CLASS);
  const [updateClass, { loading: updating }] = useMutation(UPDATE_CLASS);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.schoolId || !formData.grade) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const input = {
        ...formData,
        studentCount: parseInt(formData.studentCount.toString()),
      };

      if (isEdit) {
        await updateClass({ variables: { id, input } });
      } else {
        await createClass({ variables: { input } });
      }
      navigate('/lessons/classes');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const schools = schoolsData?.mySchools || [];

  if (loadingClass) {
    return <div className="loading">Loading class...</div>;
  }

  return (
    <div className="class-form-page" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div className="form-container" style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0 }}>{isEdit ? 'Edit Class' : 'Create New Class'}</h1>
          <button onClick={() => navigate('/lessons/classes')} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Class Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Mathematics Class A"
                required
                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  School <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                >
                  <option value="">Select School</option>
                  {schools.map((school: any) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Grade <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="e.g., 10"
                  required
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Section
                </label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="e.g., A"
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Academic Year <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  placeholder="2024-2025"
                  required
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Number of Students
              </label>
              <input
                type="number"
                value={formData.studentCount}
                onChange={(e) => setFormData({ ...formData, studentCount: parseInt(e.target.value) || 0 })}
                min="0"
                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Schedule
              </label>
              <input
                type="text"
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                placeholder="e.g., Mon, Wed, Fri - 9:00 AM"
                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
              />
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
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
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
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <button
              type="button"
              onClick={() => navigate('/lessons/classes')}
              style={{ padding: '0.625rem 1.25rem', borderRadius: '6px', border: 'none', background: '#f3f4f6', color: '#374151', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || updating}
              style={{ padding: '0.625rem 1.25rem', borderRadius: '6px', border: 'none', background: '#6366f1', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: (creating || updating) ? 0.6 : 1 }}
            >
              {creating || updating ? 'Saving...' : isEdit ? 'Update Class' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassForm;
