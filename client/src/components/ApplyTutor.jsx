import React, { useRef, useState } from 'react';
import api from '../api';
import { useSyncTutorAppStatus } from '../hooks/useSyncTutorAppStatus';

export default function ApplyToTutor() {
  const [cover, setCover] = useState('');
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [applicationID, setApplicationID] = useState(null);
  const [submittedAt, setSubmittedAt] = useState(() => {
    const stored = localStorage.getItem('tutorAppSubmittedAt');
    return stored ? new Date(stored) : null;
  });
  const [appStatus, setAppStatus] = useState(() => {
    return localStorage.getItem('tutorAppStatus') || null;
  });
  const fileInputRef = useRef(null);

  useSyncTutorAppStatus(setAppStatus, setSubmittedAt);

  const MAX_BYTES = 10 * 1024 * 1024;

  const fmtBytes = (b) => {
    if (!b) return '0 B';
    const units = ['B','KB','MB','GB'];
    let i = 0, val = b;
    while (val >= 1024 && i < units.length-1) { val /= 1024; i++; }
    return `${val.toFixed(val >= 100 ? 0 : 1)} ${units[i]}`;
  };

  const onFile = (f) => {
    setErr('');
    setMsg('');
    setApplicationID(null);
    if (!f) { setFile(null); return; }
    if (f.size > MAX_BYTES) { setErr('File too large (max 10MB)'); setMsg('File too large (max 10MB)'); setFile(null); return; }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (f) onFile(f);
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    setApplicationID(null);
    if (!file) { setErr('Please attach a PDF resume'); setMsg('Please attach a PDF resume'); return; }

    const fd = new FormData();
    fd.append('resume', file);
    fd.append('cover', cover);

    try {
      setUploading(true);
      setProgress(0);
      // Let axios set the Content-Type (with boundary) automatically for multipart/form-data
      const res = await api.post('/api/tutor-applications', fd, {
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded * 100) / ev.total));
        },
      });
      setMsg('Application submitted successfully');

      // Prefer server-provided values if present, otherwise default
      const data = res?.data || {};
      if (data.applicationID) setApplicationID(data.applicationID);
      if (data.status) {
        const status = typeof data.status === 'string' ? (data.status.charAt(0).toUpperCase() + data.status.slice(1)) : data.status;
        setAppStatus(status);
        localStorage.setItem('tutorAppStatus', status);
      } else {
        setAppStatus('Pending');
        localStorage.setItem('tutorAppStatus', 'Pending');
      }
      if (data.createdAt) {
        setSubmittedAt(new Date(data.createdAt));
        localStorage.setItem('tutorAppSubmittedAt', data.createdAt);
      } else {
        const now = new Date();
        setSubmittedAt(now);
        localStorage.setItem('tutorAppSubmittedAt', now.toISOString());
      }

      setCover('');
      setFile(null);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Submission failed');
      setMsg(e?.response?.data?.message || 'Submission failed');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  const clearForm = () => {
    setCover('');
    setFile(null);
    setErr('');
    setMsg('');
    setApplicationID(null);
    setProgress(0);
    setSubmittedAt(null);
    localStorage.removeItem('tutorAppSubmittedAt');
    setAppStatus(null);
    localStorage.removeItem('tutorAppStatus');
  };

  return (
    // increased vertical rhythm between sections
    <div className="space-y-10 max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-sm">
      <header>
        <h2 className="text-2xl font-semibold mb-1">Apply to be a Tutor</h2>
        <p className="text-sm text-gray-600">
          Submit your resume and an optional cover note. We review applications and will notify you shortly.
        </p>
      </header>

      {msg && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 8,
          marginBottom: 20,
          background: msg.toLowerCase().includes('error') ? '#fee2e2' : '#dcfce7',
          color: msg.toLowerCase().includes('error') ? '#dc2626' : '#166534',
          border: `1px solid ${msg.toLowerCase().includes('error') ? '#fecaca' : '#bbf7d0'}`,
          fontSize: 14,
          textAlign: 'center'
        }}>
          {msg}
        </div>
      )}

      {/* slightly larger spacing between form rows */}
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cover note (optional)</label>
          <textarea
            value={cover}
            onChange={e => setCover(e.target.value)}
            placeholder="Write a short note about your experience or availability..."
            className="w-full p-4 border rounded resize-vertical min-h-[96px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Resume (PDF)</label>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-8 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            role="button"
            tabIndex={0}
            onClick={openFilePicker}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openFilePicker(); }}
            aria-label="Drop resume PDF here or click to select"
          >
            <div className="text-center">
              <div className="text-sm text-gray-500">Drop PDF here or click to select</div>
              <div className="mt-4 text-xs text-gray-400">
                Allowed: PDF only • Max size: {fmtBytes(MAX_BYTES)}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between bg-gray-50 p-4 rounded-md shadow-sm">
              <div>
                <div className="font-medium">{file.name}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onFile(null)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-200 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}

        {uploading && (
          <div className="w-full bg-gray-100 rounded h-2 overflow-hidden">
            <div style={{ width: `${progress}%` }} className="h-2 bg-blue-600 transition-all" />
          </div>
        )}

        {/* slightly bigger gap between action buttons and larger hit areas */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={uploading}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-white font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              uploading ? 'bg-blue-400 cursor-not-allowed opacity-80' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {uploading ? `Uploading ${progress}%` : 'Apply to be a Tutor'}
          </button>

          <button
            type="button"
            onClick={clearForm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-200 shadow-sm"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Application status card (shown after submit) with more spacing */}
      {(appStatus || submittedAt || applicationID) && (
        <div className="mt-6 p-6 bg-gray-50 rounded border border-gray-100">
          <div className="text-sm text-gray-600 mb-2">Status: <span className="font-medium text-gray-800">{appStatus || 'Pending'}</span></div>
          <div className="text-sm text-gray-600 mb-2">Submitted: <span className="font-medium text-gray-800">{submittedAt ? submittedAt.toLocaleDateString() : ''}</span></div>
          {appStatus === 'Rejected' ? (
            <div>
              <h1 className="text-red-700 font-semibold mb-2">We're sorry, your application was not approved this time.</h1>
              <p className="text-gray-700">Thank you for your interest in becoming a tutor. Please feel free to apply again in 30 days. We encourage you to keep learning and growing!</p>
            </div>
          ) : appStatus === 'Approved' ? (
            <div>
              <h1 className="text-green-700 font-semibold mb-2">Congratulations! Your application has been approved.</h1>
              <p className="text-gray-700">You now have access to the Tutor Dashboard. Please log out and log back in to see your new dashboard and start tutoring!</p>
            </div>
          ) : (
            <h1>Your application is currently being reviewed, please check back later.</h1>
          )}
          {/* {applicationID && <div className="text-sm text-gray-600">Application ID: <span className="font-medium text-gray-800">{applicationID}</span></div>} */}
        </div>
      )}

    </div>
  );
}