import SharedCalendar from './SharedCalendar';
export default function StudentCalendar() {
  return <SharedCalendar fetchUrl="/api/student/calendar" roleLabel="Tutor" />;
}
