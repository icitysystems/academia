import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Link, useSearchParams } from 'react-router-dom';
import { GET_MY_CLASSES, GET_SYLLABI } from '../../../graphql/lessons/queries';

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

interface Syllabus {
  id: string;
  title: string;
  description?: string;
  totalHours: number;
  completedHours: number;
  units: Unit[];
  classSubject: {
    id: string;
    class: { id: string; name: string };
    subject: { id: string; name: string };
  };
  createdAt: string;
}

const SyllabusList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const classSubjectId = searchParams.get('classSubjectId');
  
  const [selectedClassId, setSelectedClassId] = useState<string>(classSubjectId || '');

  const { data: classesData } = useQuery(GET_MY_CLASSES);
  const { data: syllabiData, loading } = useQuery(GET_SYLLABI, {
    variables: { classSubjectId: selectedClassId || undefined },
    skip: false,
  });

  const classes = classesData?.myClasses || [];
  const syllabi: Syllabus[] = syllabiData?.syllabi || [];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>Syllabus Management</h1>
        <Link
          to="/lessons/syllabus/new"
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '6px',
            background: '#6366f1',
            color: 'white',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          + Create Syllabus
        </Link>
      </div>

      {/* Filter */}
      <div
        style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
        }}
      >
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
          Filter by Class
        </label>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '0.625rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
          }}
        >
          <option value="">All Classes</option>
          {classes.map((cls: any) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} - {cls.school?.name}
            </option>
          ))}
        </select>
      </div>

      {/* Syllabi List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading syllabi...</div>
      ) : syllabi.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>📋</div>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>No Syllabi Found</h2>
          <p style={{ margin: '0 0 2rem 0', color: '#6b7280' }}>
            Create your first syllabus to start tracking curriculum progress
          </p>
          <Link
            to="/lessons/syllabus/new"
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
            Create First Syllabus
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {syllabi.map((syllabus) => {
            const progress = syllabus.totalHours > 0 
              ? Math.round((syllabus.completedHours / syllabus.totalHours) * 100) 
              : 0;
            const topicsCount = syllabus.units?.reduce((sum, u) => sum + (u.topics?.length || 0), 0) || 0;

            return (
              <div
                key={syllabus.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', color: '#111827' }}>
                        {syllabus.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                        {syllabus.classSubject?.subject?.name} - {syllabus.classSubject?.class?.name}
                      </p>
                    </div>
                    <div
                      style={{
                        padding: '0.25rem 0.75rem',
                        background: progress === 100 ? '#d1fae5' : progress > 50 ? '#dbeafe' : '#fef3c7',
                        color: progress === 100 ? '#059669' : progress > 50 ? '#1e40af' : '#92400e',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {progress}%
                    </div>
                  </div>

                  {syllabus.description && (
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>
                      {syllabus.description.length > 100 
                        ? syllabus.description.substring(0, 100) + '...' 
                        : syllabus.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      <span>{syllabus.completedHours}h completed</span>
                      <span>{syllabus.totalHours}h total</span>
                    </div>
                    <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${progress}%`,
                          background: progress === 100 ? '#10b981' : '#6366f1',
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    <span>📚 {syllabus.units?.length || 0} units</span>
                    <span>📝 {topicsCount} topics</span>
                  </div>
                </div>

                <div
                  style={{
                    padding: '1rem 1.5rem',
                    background: '#f9fafb',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Created {new Date(syllabus.createdAt).toLocaleDateString()}
                  </span>
                  <Link
                    to={`/lessons/syllabus/${syllabus.id}`}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      background: '#6366f1',
                      color: 'white',
                      textDecoration: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SyllabusList;
