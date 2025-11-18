import { useEffect } from 'react';
import api from '../api';

export function useSyncTutorAppStatus(setAppStatus, setSubmittedAt) {
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/api/tutor/my-application');
        const data = res.data || {};
        if (data.status) {
          const status = typeof data.status === 'string' ? (data.status.charAt(0).toUpperCase() + data.status.slice(1)) : data.status;
          setAppStatus(status);
          localStorage.setItem('tutorAppStatus', status);
        }
        if (data.createdAt) {
          setSubmittedAt(new Date(data.createdAt));
          localStorage.setItem('tutorAppSubmittedAt', data.createdAt);
        }
      } catch (e) {
      }
    };
    fetchStatus();
  }, [setAppStatus, setSubmittedAt]);
}
