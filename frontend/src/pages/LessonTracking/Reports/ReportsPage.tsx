import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_PROGRESS_SUMMARY, GET_MY_CLASSES } from '../../../graphql/lessons/queries';

const ReportsPage: React.FC = () => {
  const [filters, setFilters] = useState({
    classId: '',
    startDate: '',
    endDate: '',
  });

  const { data: classesData } = useQuery(GET_MY_CLASSES);
  const { data, loading } = useQuery(GET_PROGRESS_SUMMARY, {
    variables: { filters },
    skip: !filters.classId,
  });

  const classes = classesData?.myClasses || [];
  const summary = data?.progressSummary;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Progress Reports</h1>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>Filters</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Class <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={filters.classId}
              onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
            >
              <option value="">Select a class</option>
              {classes.map((cls: any) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.school.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>
        </div>
      </div>

      {!filters.classId ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>📊</div>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>Select a Class</h2>
          <p style={{ margin: 0, color: '#6b7280' }}>Choose a class to view progress reports</p>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          Loading report...
        </div>
      ) : summary ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 500 }}>Total Lessons</div>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: '#6366f1' }}>{summary.totalLessons}</div>
            </div>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 500 }}>Completion Rate</div>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: '#10b981' }}>{summary.completionRate.toFixed(1)}%</div>
            </div>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 500 }}>Topics Covered</div>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: '#8b5cf6' }}>{summary.topicsCovered}</div>
            </div>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 500 }}>Avg Attendance</div>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: '#f59e0b' }}>{summary.averageAttendance.toFixed(1)}%</div>
            </div>
          </div>

          {summary.weeklyProgress && summary.weeklyProgress.length > 0 && (
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>Weekly Progress</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {summary.weeklyProgress.map((week: any) => (
                  <div key={week.weekStart} style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        Week of {new Date(week.weekStart).toLocaleDateString()}
                      </span>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {week.lessonsCount} lessons
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${week.completionRate}%`, height: '100%', background: '#10b981', transition: 'width 0.3s' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.topicProgress && summary.topicProgress.length > 0 && (
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>Topic Progress</h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {summary.topicProgress.slice(0, 10).map((topic: any) => (
                  <div key={topic.topicId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{topic.topicName}</span>
                    <span style={{ padding: '0.25rem 0.75rem', background: topic.status === 'COMPLETED' ? '#d1fae5' : '#dbeafe', color: topic.status === 'COMPLETED' ? '#059669' : '#1e40af', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 }}>
                      {topic.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ReportsPage;
