export const STATUS_COLORS = {
  cancelled: '#ef4444', 
  no_show: '#f59e0b',   
  completed: '#22c55e',
  ongoing: '#3b82f6',  
  upcoming: '#6b7280', 
};

export function decorateStatus(event) {
  const status = event.extendedProps?.sessionStatus || event.extendedProps?.status;
  if (status === 'cancelled' || status === 'no_show' || status === 'completed') return status;
  const now = new Date();
  const start = new Date(event.start);
  const end = new Date(event.end);
  if (now >= start && now <= end) return 'ongoing';
  if (now < start) return 'upcoming';
  return 'completed';
}
