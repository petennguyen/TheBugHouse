import React, { useEffect, useState } from 'react';
import api from './api';

export default function TutorAvailability() {
  const [rows, setRows] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [day, setDay] = useState('Mon');
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('18:00');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [msg, setMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/api/availability/mine');
      setRows(data);
    } catch {
      setMsg('Failed to load availability');
    }
  };

  const loadSubjects = async () => {
    try {
      const { data } = await api.get('/api/subjects');
      setSubjects(data);
    } catch {
      setMsg('Failed to load subjects');
    }
  };

  useEffect(() => { 
    load(); 
    loadSubjects();
  }, []);

  const add = async () => {
    if (selectedSubjects.length === 0) {
      setMsg('Please select at least one subject');
      return;
    }

    if (start < '10:00' || end > '18:00') {
      setMsg('Availability must be within center hours: 10:00–18:00 (Mon–Fri).');
      return;
    }
    if (start >= end) {
      setMsg('Start time must be before end time.');
      return;
    }

    try {
      await api.post('/api/availability', { 
        dayOfWeek: day, 
        startTime: start, 
        endTime: end,
        subjects: selectedSubjects 
      });
      setMsg(' Availability added successfully!');
      setSelectedSubjects([]);
      setSearchTerm('');
      load();
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to add availability');
    }
  };

  const removeRow = async (id) => {
    try {
      await api.delete(`/api/availability/${id}`);
      load();
    } catch {
      setMsg('Failed to delete availability');
    }
  };

  const handleSubjectToggle = (subjectId) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const clearAllSubjects = () => {
    setSelectedSubjects([]);
  };

  const selectAllSubjects = () => {
    setSelectedSubjects(filteredSubjects.map(s => s.subjectID));
  };

  // Filter subjects based on search term 
  const filteredSubjects = subjects.filter(subject =>
    (subject.subjectName + ' ' + (subject.subjectCode || '')).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected subject display strings
  const selectedSubjectNames = subjects
    .filter(s => selectedSubjects.includes(s.subjectID))
    .map(s => (s.subjectCode ? `${s.subjectCode} - ${s.subjectName}` : s.subjectName));

  return (
    <div className="grid gap-3">
      <div className="card" style={{ background: 'white', color: '#111' }}>
        <h2 className="h2">Add Availability</h2>
        {msg && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            background: msg.includes('success') || msg.includes('✅') ? '#dcfce7' : '#fee2e2',
            color: msg.includes('success') || msg.includes('✅') ? '#166534' : '#dc2626',
            border: `1px solid ${msg.includes('success') || msg.includes('✅') ? '#bbf7d0' : '#fecaca'}`,
            fontSize: 14
          }}>
            {msg}
          </div>
        )}

        <div className="form-row three">
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            {['Mon','Tue','Wed','Thu','Fri'].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <input 
            type="time" 
            value={start} 
            onChange={(e) => setStart(e.target.value)}
            placeholder="Start time"
          />
          <input 
            type="time" 
            value={end} 
            onChange={(e) => setEnd(e.target.value)}
            placeholder="End time"
          />
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
          Center hours: Mon–Fri 10:00–18:00 • Saturday & Sunday closed
        </div>

        {/* Enhanced Subject Selection */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label className="input-label" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              Select Subjects You Can Tutor
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={selectAllSubjects}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  background: '#e5e7eb',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAllSubjects}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder=" Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14
              }}
            />
          </div>

          {/* Selected Subjects Summary */}
          {selectedSubjects.length > 0 && (
            <div style={{
              padding: 12,
              background: '#dbeafe',
              border: '1px solid #93c5fd',
              borderRadius: 8,
              marginBottom: 12
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e40af', marginBottom: 6 }}>
                Selected Subjects ({selectedSubjects.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedSubjectNames.map((name, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '4px 8px',
                      background: '#2563eb',
                      color: 'white',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Subject Grid */}
          <div style={{
            border: '2px solid #e5e7eb',
            borderRadius: 12,
            background: 'white',
            maxHeight: 300,
            overflowY: 'auto'
          }}>
            {filteredSubjects.length === 0 && searchTerm && (
              <div style={{
                padding: 20,
                textAlign: 'center',
                color: '#6b7280',
                fontSize: 14
              }}>
                No subjects found matching "{searchTerm}"
              </div>
            )}
            
            {filteredSubjects.map((subject, index) => {
              const isSelected = selectedSubjects.includes(subject.subjectID);
              const displayName = subject.subjectCode ? `${subject.subjectCode} - ${subject.subjectName}` : subject.subjectName;
              return (
                <label 
                  key={subject.subjectID} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12,
                    cursor: 'pointer',
                    padding: '12px 16px',
                    borderBottom: index < filteredSubjects.length - 1 ? '1px solid #f3f4f6' : 'none',
                    background: isSelected ? '#f0f9ff' : 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.target.style.background = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.target.style.background = 'transparent';
                  }}
                >
                  <div style={{
                    width: 20,
                    height: 20,
                    border: `2px solid ${isSelected ? '#2563eb' : '#d1d5db'}`,
                    borderRadius: 4,
                    background: isSelected ? '#2563eb' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#1e40af' : '#374151'
                    }}>
                      {displayName}
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div style={{
                      background: '#059669',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: 600
                    }}>
                      SELECTED
                    </div>
                  )}
                  
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSubjectToggle(subject.subjectID)}
                    style={{ display: 'none' }}
                  />
                </label>
              );
            })}
          </div>

          {filteredSubjects.length > 0 && (
            <div style={{ 
              marginTop: 8, 
              fontSize: 12, 
              color: '#6b7280',
              textAlign: 'center'
            }}>
              Showing {filteredSubjects.length} of {subjects.length} subjects
            </div>
          )}
        </div>

        <button 
          className="btn primary" 
          onClick={add}
          disabled={selectedSubjects.length === 0}
          style={{ 
            marginTop: 20,
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 600,
            opacity: selectedSubjects.length === 0 ? 0.5 : 1,
            cursor: selectedSubjects.length === 0 ? 'not-allowed' : 'pointer',
            background: selectedSubjects.length === 0 ? '#9ca3af' : '#2563eb'
          }}
        >
          {selectedSubjects.length === 0 
            ? 'Select subjects to continue' 
            : `Add Availability for ${selectedSubjects.length} Subject${selectedSubjects.length === 1 ? '' : 's'}`
          }
        </button>
      </div>

      <div className="card" style={{ background: 'white', color: '#111' }}>
        <h2 className="h2">My Current Availability</h2>
        <ul className="list">
          {rows.map((r) => (
            <li key={r.availabilityID} className="item">
              <div>
                <div className="font-medium" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: '#2563eb',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    {r.dayOfWeek}
                  </span>
                  <span>{r.startTime} to {r.endTime}</span>
                </div>
                <div style={{ 
                  marginTop: 6,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4
                }}>
                  {r.subjects ? r.subjects.split(',').map((subject, index) => (
                    <span
                      key={index}
                      style={{
                        background: '#dcfce7',
                        color: '#166534',
                        padding: '2px 6px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 500
                      }}
                    >
                      {subject.trim()}
                    </span>
                  )) : (
                    <span style={{
                      background: '#f3f4f6',
                      color: '#6b7280',
                      padding: '2px 6px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontStyle: 'italic'
                    }}>
                      No specific subjects selected
                    </span>
                  )}
                </div>
              </div>
              <button 
                className="btn danger" 
                onClick={() => removeRow(r.availabilityID)}
                style={{ fontSize: 14 }}
              >
                Delete
              </button>
            </li>
          ))}
          {!rows.length && (
            <li style={{
              padding: 20,
              textAlign: 'center',
              color: '#6b7280',
              fontSize: 14,
              fontStyle: 'italic'
            }}>
              No availability set yet. Add your first availability slot above.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
