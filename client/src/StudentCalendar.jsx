import SharedCalendar from './SharedCalendar';

export default function StudentCalendarPage() {
  return (
    <SharedCalendar
      fetchUrl="/api/student/calendar"
      roleLabel="Student"
    />
  );
}
