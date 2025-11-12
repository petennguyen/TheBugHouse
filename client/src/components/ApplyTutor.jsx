import React, { useRef, useState } from 'react';
import api from '../api';

export default function ApplyToTutor() {
  const [cover, setCover] = useState('');
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [msg, setMsg] = useState(''); // NEW: centralized message box
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [applicationID, setApplicationID] = useState(null);
  const [submittedAt, setSubmittedAt] = useState(null); // NEW: date when submitted
  const [appStatus, setAppStatus] = useState(null);     // NEW: application status (Pending/Approved/Rejected)
  const fileInputRef = useRef(null);

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
    setOk('');
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
    setOk('');
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
      setOk('Application submitted successfully');
      setMsg('Application submitted successfully');

      // Prefer server-provided values if present, otherwise default
      const data = res?.data || {};
      if (data.applicationID) setApplicationID(data.applicationID);
      if (data.status) setAppStatus(typeof data.status === 'string' ? (data.status.charAt(0).toUpperCase() + data.status.slice(1)) : data.status);
      else setAppStatus('Pending');
      if (data.createdAt) setSubmittedAt(new Date(data.createdAt));
      else setSubmittedAt(new Date());

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
    setOk('');
    setMsg('');
    setApplicationID(null);
    setProgress(0);
    setSubmittedAt(null);
    setAppStatus(null);
  };

  return (
    // increased vertical rhythm between sections
    <div className="space-y-10 max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-sm">
      <header>
        <h2 className="text-2xl font-semibold mb-1">Apply to be a Tutor</h2>
        <p className="text-sm text-gray-600">
          Submit your resume and an optional cover note. We review applications and will notify you by email.
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
          textAlign: 'center' // center message text
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
            // increased padding for larger drop target and breathing room
            className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded p-8 cursor-pointer hover:bg-gray-50"
            role="button"
            tabIndex={0}
            onClick={openFilePicker}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openFilePicker(); }}
            aria-label="Drop resume PDF here or click to select"
          >
            <div className="text-center">
              <div className="text-sm text-gray-500">Drop PDF here or</div>
              <div className="mt-2 text-sm">
                <button type="button" onClick={openFilePicker} className="text-blue-600 underline">Choose a file</button>
              </div>
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
            <div className="mt-4 flex items-center justify-between bg-gray-50 p-4 rounded">
              <div>
                <div className="font-medium">{file.name}</div>
                <div className="text-xs text-gray-500">{fmtBytes(file.size)} • {file.type}</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onFile(null)} className="text-sm text-red-600">Remove</button>
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
            className={`px-5 py-3 rounded text-white ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {uploading ? `Uploading ${progress}%` : 'Apply to be a Tutor'}
          </button>

          <button type="button" onClick={clearForm} className="px-4 py-2 rounded border text-sm">Clear</button>
        </div>
      </form>

      {/* Application status card (shown after submit) with more spacing */}
      {(appStatus || submittedAt || applicationID) && (
        <div className="mt-6 p-6 bg-gray-50 rounded border border-gray-100">
          <div className="text-sm text-gray-600 mb-2">Status: <span className="font-medium text-gray-800">{appStatus || 'Pending'}</span></div>
          <div className="text-sm text-gray-600 mb-2">Submitted: <span className="font-medium text-gray-800">{submittedAt ? submittedAt.toLocaleDateString() : ''}</span></div>
          {applicationID && <div className="text-sm text-gray-600">Application ID: <span className="font-medium text-gray-800">{applicationID}</span></div>}
        </div>
      )}

    </div>
  );
}