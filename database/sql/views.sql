USE BugHouse;

-- Sessions per student
DROP VIEW IF EXISTS student_session_count;
CREATE VIEW student_session_count AS
SELECT
  su.userID AS studentUserID,
  su.userFirstName,
  su.userLastName,
  COUNT(tsn.sessionID) AS sessionCount
FROM Student s
JOIN System_User su ON su.userID = s.System_User_userID
LEFT JOIN Tutor_Session tsn ON tsn.Student_System_User_userID = su.userID
GROUP BY su.userID, su.userFirstName, su.userLastName;

-- Sessions per tutor
DROP VIEW IF EXISTS tutor_session_count;
CREATE VIEW tutor_session_count AS
SELECT
  su.userID AS tutorUserID,
  su.userFirstName,
  su.userLastName,
  COUNT(tsn.sessionID) AS sessionCount
FROM Tutor t
JOIN System_User su ON su.userID = t.System_User_userID
LEFT JOIN Tutor_Session tsn ON tsn.Tutor_System_User_userID = su.userID
GROUP BY su.userID, su.userFirstName, su.userLastName;

-- Average ratings per tutor
DROP VIEW IF EXISTS tutor_average_ratings;
CREATE VIEW tutor_average_ratings AS
SELECT
  su.userID AS tutorUserID,
  su.userFirstName,
  su.userLastName,
  AVG(tsn.sessionRating) AS averageRating,
  COUNT(tsn.sessionID) AS ratingsCount
FROM Tutor t
JOIN System_User su ON su.userID = t.System_User_userID
LEFT JOIN Tutor_Session tsn ON tsn.Tutor_System_User_userID = su.userID
GROUP BY su.userID, su.userFirstName, su.userLastName;

-- Human-friendly schedule view
DROP VIEW IF EXISTS view_schedule;
CREATE VIEW view_schedule AS
SELECT
  ds.scheduleID,
  ds.scheduleDate,
  a.System_User_userID AS adminUserID,
  sa.userFirstName AS adminFirstName,
  sa.userLastName  AS adminLastName,
  tl.timeslotID,
  subj.subjectName,
  tt.System_User_userID AS tutorUserID,
  st.userFirstName  AS tutorFirstName,
  st.userLastName   AS tutorLastName,
  sess.sessionID,
  sess.sessionSignInTime,
  sess.sessionSignOutTime,
  sess.sessionFeedback,
  sess.sessionRating
FROM Daily_Schedule ds
JOIN Administrator a ON a.System_User_userID = ds.Administrator_System_User_userID
JOIN System_User sa ON sa.userID = a.System_User_userID
LEFT JOIN Timeslot tl ON tl.Daily_Schedule_scheduleID = ds.scheduleID
LEFT JOIN Tutor tt ON tt.System_User_userID = tl.Tutor_System_User_userID
LEFT JOIN System_User st ON st.userID = tt.System_User_userID
LEFT JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
LEFT JOIN Tutor_Session sess
  ON sess.Timeslot_timeslotID = tl.timeslotID
 AND sess.Timeslot_Daily_Schedule_scheduleID = tl.Daily_Schedule_scheduleID;

-- Tutor availability view
DROP VIEW IF EXISTS tutor_view_availability;
CREATE VIEW tutor_view_availability AS
SELECT
  t.System_User_userID AS tutorUserID,
  su.userFirstName,
  su.userLastName,
  ta.dayOfWeek,
  ta.startTime,
  ta.endTime
FROM Tutor t
JOIN System_User su ON su.userID = t.System_User_userID
JOIN Tutor_Availability ta ON ta.Tutor_System_User_userID = t.System_User_userID
ORDER BY su.userLastName, su.userFirstName, FIELD(ta.dayOfWeek,'Mon','Tue','Wed','Thu','Fri','Sat','Sun'), ta.startTime;

-- Open timeslots (no assigned student)
DROP VIEW IF EXISTS view_available_timeslots;
CREATE VIEW view_available_timeslots AS
SELECT
  ds.scheduleDate,
  tl.Daily_Schedule_scheduleID AS scheduleID,
  tl.timeslotID,
  subj.subjectName,
  su.userFirstName AS tutorFirstName,
  su.userLastName  AS tutorLastName
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN Tutor t ON t.System_User_userID = tl.Tutor_System_User_userID
JOIN System_User su ON su.userID = t.System_User_userID
LEFT JOIN Tutor_Session sess
  ON sess.Timeslot_timeslotID = tl.timeslotID
 AND sess.Timeslot_Daily_Schedule_scheduleID = tl.Daily_Schedule_scheduleID
WHERE sess.sessionID IS NULL;