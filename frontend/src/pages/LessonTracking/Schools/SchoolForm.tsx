import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { CREATE_SCHOOL, UPDATE_SCHOOL, GET_SCHOOL } from '../../../graphql/lessons/queries';
import './SchoolForm.css';

interface SchoolFormData {
  name: string;
  location: string;
  address: string;
  phone: string;
  email: string;
}

const SchoolForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<SchoolFormData>({
    name: '',
    location: '',
    address: '',
    phone: '',
    email: '',
  });

  const [errors, setErrors] = useState<Partial<SchoolFormData>>({});

  const { data, loading: loadingSchool } = useQuery(GET_SCHOOL, {
    variables: { id },
    skip: !isEdit,
    onCompleted: (data) => {
      if (data?.school) {
        setFormData({
          name: data.school.name,
          location: data.school.location || '',
          address: data.school.address || '',
          phone: data.school.phone || '',
          email: data.school.email || '',
        });
      }
    },
  });

  const [createSchool, { loading: creating }] = useMutation(CREATE_SCHOOL);
  const [updateSchool, { loading: updating }] = useMutation(UPDATE_SCHOOL);

  const validate = (): boolean => {
    const newErrors: Partial<SchoolFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'School name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      if (isEdit) {
        await updateSchool({
          variables: { id, input: formData },
        });
      } else {
        await createSchool({
          variables: { input: formData },
        });
      }
      navigate('/lessons/schools');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleChange = (field: keyof SchoolFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  if (loadingSchool) {
    return <div className="loading">Loading school...</div>;
  }

  return (
    <div className="school-form-page">
      <div className="form-container">
        <div className="form-header">
          <h1>{isEdit ? 'Edit School' : 'Add New School'}</h1>
          <button onClick={() => navigate('/lessons/schools')} className="btn-close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="school-form">
          <div className="form-group">
            <label htmlFor="name">
              School Name <span className="required">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? 'error' : ''}
              placeholder="Enter school name"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="City, State"
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Full address"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={errors.phone ? 'error' : ''}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={errors.email ? 'error' : ''}
                placeholder="school@example.com"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/lessons/schools')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || updating}
              className="btn btn-primary"
            >
              {creating || updating
                ? 'Saving...'
                : isEdit
                ? 'Update School'
                : 'Create School'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchoolForm;
