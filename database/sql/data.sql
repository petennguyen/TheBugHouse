USE BugHouse;

-- =====================================================
-- 1) Subjects (no deprecated VALUES() in UPDATE)
-- =====================================================
INSERT INTO Academic_Subject (subjectName)
VALUES
  ('Calculus I'), ('Calculus II'), ('Calculus III'),
  ('Physics I'), ('Algorithms & Datastructures'),
  ('Organic Chemistry'), ('Art History'), ('Statistics')
AS new
ON DUPLICATE KEY UPDATE subjectName = new.subjectName;

-- =====================================================
-- 2) System users (bulk upsert without VALUES() function)
-- =====================================================
INSERT INTO System_User (userFirstName, userLastName, userEmail, userPassword, userRole)
VALUES
  ('Admin','A','adminA@bughouse.edu','adminpasswordA','Admin'),
  ('Admin','B','adminB@bughouse.edu','adminpasswordB','Admin'),
  ('Admin','C','adminC@bughouse.edu','adminpasswordC','Admin'),

  ('Tutor','A','tutorA@bughouse.edu','tutorpasswordA','Tutor'),
  ('Tutor','B','tutorB@bughouse.edu','tutorpasswordB','Tutor'),
  ('Tutor','C','tutorC@bughouse.edu','tutorpasswordC','Tutor'),
  ('Tutor','D','tutorD@bughouse.edu','tutorpasswordD','Tutor'),
  ('Tutor','E','tutorE@bughouse.edu','tutorpasswordE','Tutor'),
  ('Tutor','F','tutorF@bughouse.edu','tutorpasswordF','Tutor'),
  ('Tutor','G','tutorG@bughouse.edu','tutorpasswordG','Tutor'),
  ('Tutor','H','tutorH@bughouse.edu','tutorpasswordH','Tutor'),
  ('Tutor','I','tutorI@bughouse.edu','tutorpasswordI','Tutor'),
  ('Tutor','J','tutorJ@bughouse.edu','tutorpasswordJ','Tutor'),

  ('Student','A','studentA@bughouse.edu','studentpasswordA','Student'),
  ('Student','B','studentB@bughouse.edu','studentpasswordB','Student'),
  ('Student','C','studentC@bughouse.edu','studentpasswordC','Student'),
  ('Student','D','studentD@bughouse.edu','studentpasswordD','Student'),
  ('Student','E','studentE@bughouse.edu','studentpasswordE','Student'),
  ('Student','F','studentF@bughouse.edu','studentpasswordF','Student'),
  ('Student','G','studentG@bughouse.edu','studentpasswordG','Student'),
  ('Student','H','studentH@bughouse.edu','studentpasswordH','Student'),
  ('Student','I','studentI@bughouse.edu','studentpasswordI','Student'),
  ('Student','J','studentJ@bughouse.edu','studentpasswordJ','Student')
AS new
ON DUPLICATE KEY UPDATE
  userPassword = new.userPassword,
  userRole     = new.userRole;

-- =====================================================
-- 3) Role tables (use derived table alias `new` for upsert)
-- =====================================================
-- Admins
INSERT INTO Administrator (System_User_userID, accessLevel)
SELECT * FROM (
  SELECT su.userID AS System_User_userID, 1 AS accessLevel
  FROM System_User su
  WHERE su.userEmail IN ('adminA@bughouse.edu','adminB@bughouse.edu','adminC@bughouse.edu')
) AS new
ON DUPLICATE KEY UPDATE accessLevel = new.accessLevel;

-- Tutors (batched with UNION ALL)
INSERT INTO Tutor (System_User_userID, tutorBiography, tutorQualifications)
SELECT * FROM (
  SELECT su.userID, 'Experienced in teaching' AS tutorBiography, 'Calculus I'  AS tutorQualifications
    FROM System_User su WHERE su.userEmail='tutorA@bughouse.edu'
  UNION ALL
  SELECT su.userID, 'Experienced in teaching', 'Calculus II' FROM System_User su WHERE su.userEmail='tutorB@bughouse.edu'
  UNION ALL
  SELECT su.userID, 'Experienced in teaching', 'Calculus III' FROM System_User su WHERE su.userEmail='tutorC@bughouse.edu'
  UNION ALL
  SELECT su.userID, 'Experienced in teaching', 'Physics I'   FROM System_User su WHERE su.userEmail='tutorD@bughouse.edu'
  UNION ALL
  SELECT su.userID, 'Experienced in teaching', 'Algorithms & Datastructures' FROM System_User su WHERE su.userEmail='tutorE@bughouse.edu'
  UNION ALL
  SELECT su.userID, 'Experienced in teaching', 'Organic Chemistry' FROM System_User su WHERE su.userEmail='tutorF@bughouse.edu'
  UNION ALL
  SELECT su.userID, 'Experienced in teaching', 'Art History' FROM System_User su WHERE su.userEmail='tutorG@bughouse.edu'
  UNION ALL
  SELECT su.userID, 'Experienced in teaching', 'Statistics'  FROM System_User su WHERE su.userEmail='tutorH@bughouse.edu'
  UNION ALL
  SELECT su.userID, 'Experienced in teaching', 'Algorithms & Datastructures' FROM System_User su WHERE su.userEmail='tutorI@bughouse.edu'
  UNION ALL
  SELECT su.userID, 'Experienced in teaching', 'Calculus I'  FROM System_User su WHERE su.userEmail='tutorJ@bughouse.edu'
) AS new
ON DUPLICATE KEY UPDATE
  tutorBiography     = new.tutorBiography,
  tutorQualifications = new.tutorQualifications;

-- Students (batched)
INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals)
SELECT * FROM (
  SELECT su.userID, 'ID001' AS studentIDCard, 'Calculus I'                     AS studentLearningGoals FROM System_User su WHERE su.userEmail='studentA@bughouse.edu'
  UNION ALL SELECT su.userID, 'ID002', 'Physics I'           FROM System_User su WHERE su.userEmail='studentB@bughouse.edu'
  UNION ALL SELECT su.userID, 'ID003', 'Calculus III'        FROM System_User su WHERE su.userEmail='studentC@bughouse.edu'
  UNION ALL SELECT su.userID, 'ID004', 'Algorithms & Datastructures' FROM System_User su WHERE su.userEmail='studentD@bughouse.edu'
  UNION ALL SELECT su.userID, 'ID005', 'Art History'         FROM System_User su WHERE su.userEmail='studentE@bughouse.edu'
  UNION ALL SELECT su.userID, 'ID006', 'Calculus II'         FROM System_User su WHERE su.userEmail='studentF@bughouse.edu'
  UNION ALL SELECT su.userID, 'ID007', 'Statistics'          FROM System_User su WHERE su.userEmail='studentG@bughouse.edu'
  UNION ALL SELECT su.userID, 'ID008', 'Organic Chemistry'   FROM System_User su WHERE su.userEmail='studentH@bughouse.edu'
  UNION ALL SELECT su.userID, 'ID009', 'Physics I'           FROM System_User su WHERE su.userEmail='studentI@bughouse.edu'
  UNION ALL SELECT su.userID, 'ID010', 'Calculus I'          FROM System_User su WHERE su.userEmail='studentJ@bughouse.edu'
) AS new
ON DUPLICATE KEY UPDATE
  studentIDCard       = new.studentIDCard,
  studentLearningGoals = new.studentLearningGoals;

-- =====================================================
-- 4) Schedules
-- =====================================================
INSERT INTO Daily_Schedule (Administrator_System_User_userID, scheduleDate)
SELECT * FROM (
  SELECT su.userID, DATE '2025-11-12' FROM System_User su WHERE su.userEmail='adminA@bughouse.edu'
  UNION ALL
  SELECT su.userID, DATE '2025-11-13' FROM System_User su WHERE su.userEmail='adminB@bughouse.edu'
) AS new;


INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, timeslotStartTime, timeslotEndTime)
SELECT * FROM (
  SELECT ds.scheduleID, subj.subjectID, tutor.userID, '08:00:00', '09:00:00'
  FROM Daily_Schedule ds
  JOIN Academic_Subject subj ON subj.subjectName='Calculus I'
  JOIN System_User tutor ON tutor.userEmail='tutorA@bughouse.edu'
  WHERE ds.scheduleDate='2025-11-12'

  UNION ALL

  SELECT ds.scheduleID, subj.subjectID, tutor.userID, '10:00:00', '11:00:00'
  FROM Daily_Schedule ds
  JOIN Academic_Subject subj ON subj.subjectName='Physics I'
  JOIN System_User tutor ON tutor.userEmail='tutorB@bughouse.edu'
  WHERE ds.scheduleDate='2025-11-12'

  UNION ALL

  SELECT ds.scheduleID, subj.subjectID, tutor.userID, '12:00:00', '13:00:00'
  FROM Daily_Schedule ds
  JOIN Academic_Subject subj ON subj.subjectName='Statistics'
  JOIN System_User tutor ON tutor.userEmail='tutorC@bughouse.edu'
  WHERE ds.scheduleDate='2025-11-12'

  UNION ALL

  SELECT ds.scheduleID, subj.subjectID, tutor.userID, '13:00:00', '14:00:00'
  FROM Daily_Schedule ds
  JOIN Academic_Subject subj ON subj.subjectName='Organic Chemistry'
  JOIN System_User tutor ON tutor.userEmail='tutorD@bughouse.edu'
  WHERE ds.scheduleDate='2025-11-12'

  UNION ALL

  SELECT ds.scheduleID, subj.subjectID, tutor.userID, '15:00:00', '16:00:00'
  FROM Daily_Schedule ds
  JOIN Academic_Subject subj ON subj.subjectName='Algorithms & Datastructures'
  JOIN System_User tutor ON tutor.userEmail='tutorE@bughouse.edu'
  WHERE ds.scheduleDate='2025-11-12'

  UNION ALL

  SELECT ds.scheduleID, subj.subjectID, tutor.userID, '16:00:00', '17:00:00'
  FROM Daily_Schedule ds
  JOIN Academic_Subject subj ON subj.subjectName='Calculus II'
  JOIN System_User tutor ON tutor.userEmail='tutorF@bughouse.edu'
  WHERE ds.scheduleDate='2025-11-12'

  UNION ALL
  
  SELECT ds.scheduleID, subj.subjectID, tutor.userID, '08:00:00', '09:00:00'
  FROM Daily_Schedule ds
  JOIN Academic_Subject subj ON subj.subjectName='Calculus I'
  JOIN System_User tutor ON tutor.userEmail='tutorG@bughouse.edu'
  WHERE ds.scheduleDate='2025-11-13'

  UNION ALL
  
  SELECT ds.scheduleID, subj.subjectID, tutor.userID, '09:00:00', '10:00:00'
  FROM Daily_Schedule ds
  JOIN Academic_Subject subj ON subj.subjectName='Physics I'
  JOIN System_User tutor ON tutor.userEmail='tutorH@bughouse.edu'
  WHERE ds.scheduleDate='2025-11-13'

  UNION ALL
  
  SELECT ds.scheduleID, subj.subjectID, tutor.userID, '11:00:00', '12:00:00'
  FROM Daily_Schedule ds
  JOIN Academic_Subject subj ON subj.subjectName='Calculus II'
  JOIN System_User tutor ON tutor.userEmail='tutorJ@bughouse.edu'
  WHERE ds.scheduleDate='2025-11-13'

  UNION ALL
  
  SELECT ds.scheduleID, subj.subjectID, tutor.userID, '12:00:00', '13:00:00'
  FROM Daily_Schedule ds
  JOIN Academic_Subject subj ON subj.subjectName='Calculus III'
  JOIN System_User tutor ON tutor.userEmail='tutorA@bughouse.edu'
  WHERE ds.scheduleDate='2025-11-13'

  UNION ALL
  
  SELECT ds.scheduleID, subj.subjectID, tutor.userID, '13:00:00', '14:00:00'
  FROM Daily_Schedule ds
  JOIN Academic_Subject subj ON subj.subjectName='Organic Chemistry'
  JOIN System_User tutor ON tutor.userEmail='tutorB@bughouse.edu'
  WHERE ds.scheduleDate='2025-11-13'

) AS new;

-- =====================================================
-- 6) Sessions (pick the first matching timeslot via MIN)
-- =====================================================
INSERT INTO Tutor_Session (
  Timeslot_timeslotID,
  Timeslot_Daily_Schedule_scheduleID,
  Academic_Subject_subjectID,
  Tutor_System_User_userID,
  Student_System_User_userID,
  sessionSignInTime,
  sessionSignOutTime,
  sessionFeedback,
  sessionRating,
  sessionStatus
)
SELECT
  tl.timeslotID,
  tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID,
  tl.Tutor_System_User_userID,
  stu.userID,
  '2025-11-12 08:00:00','2025-11-12 09:00:00',
  'Good focus today.', 5, 'Completed'
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID=tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID=tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-11-12' AND subj2.subjectName='Calculus I'
) pick ON pick.min_ts = tl.timeslotID
JOIN System_User stu ON stu.userEmail='studentD@bughouse.edu'

UNION ALL

SELECT
  tl.timeslotID, tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
  stu.userID,
  '2025-11-12 10:00:00','2025-11-12 11:00:00',
  'Great explanations.', 4, 'Completed'
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID=tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID=tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-11-12' AND subj2.subjectName='Physics I'
) pick ON pick.min_ts = tl.timeslotID
JOIN System_User stu ON stu.userEmail='studentE@bughouse.edu'

UNION ALL

SELECT
  tl.timeslotID, tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
  stu.userID,
  '2025-11-12 12:00:00','2025-11-12 13:00:00',
  'Clear and helpful.', 5, 'Completed'
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID=tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID=tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-11-12' AND subj2.subjectName='Statistics'
) pick ON pick.min_ts = tl.timeslotID
JOIN System_User stu ON stu.userEmail='studentF@bughouse.edu'

UNION ALL

SELECT
  tl.timeslotID, tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
  stu.userID,
  '2025-11-12 13:00:00','2025-11-12 14:00:00',
  'Challenging but good.', 4, 'Completed'
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID=tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID=tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-11-12' AND subj2.subjectName='Organic Chemistry'
) pick ON pick.min_ts = tl.timeslotID
JOIN System_User stu ON stu.userEmail='studentG@bughouse.edu'

UNION ALL

SELECT
  tl.timeslotID, tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
  stu.userID,
  '2025-11-12 15:00:00','2025-11-12 16:00:00',
  'Great writing improvements.', 5, 'Completed'
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID=tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID=tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-11-12' AND subj2.subjectName='Algorithms & Datastructures'
) pick ON pick.min_ts = tl.timeslotID
JOIN System_User stu ON stu.userEmail='studentH@bughouse.edu'

UNION ALL

SELECT
  tl.timeslotID, tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
  stu.userID,
  '2025-11-12 16:00:00','2025-11-12 17:00:00',
  'Solved many problems.', 4, 'Completed'
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID=tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID=tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-11-12' AND subj2.subjectName='Calculus II'
) pick ON pick.min_ts = tl.timeslotID
JOIN System_User stu ON stu.userEmail='studentI@bughouse.edu'

UNION ALL

SELECT
  tl.timeslotID, tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
  stu.userID,
  '2025-11-13 08:00:00','2025-11-13 09:00:00',
  'Good session.', 5, 'Completed'
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID=tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID=tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-11-13' AND subj2.subjectName='Calculus I'
) pick ON pick.min_ts = tl.timeslotID
JOIN System_User stu ON stu.userEmail='studentA@bughouse.edu'

UNION ALL

SELECT
  tl.timeslotID, tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
  stu.userID,
  '2025-11-13 09:00:00','2025-11-13 10:00:00',
  'Solid understanding.', 4, 'Completed'
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID=tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID=tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-11-13' AND subj2.subjectName='Physics I'
) pick ON pick.min_ts = tl.timeslotID
JOIN System_User stu ON stu.userEmail='studentB@bughouse.edu'

UNION ALL

SELECT
  tl.timeslotID, tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
  stu.userID,
  '2025-11-13 11:00:00','2025-11-13 12:00:00',
  'Improved understanding.', 4, 'Completed'
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID=tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID=tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-11-13' AND subj2.subjectName='Calculus II'
) pick ON pick.min_ts = tl.timeslotID
JOIN System_User stu ON stu.userEmail='studentD@bughouse.edu'

UNION ALL

SELECT
  tl.timeslotID, tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
  stu.userID,
  '2025-11-13 12:00:00','2025-11-13 13:00:00',
  'Writing improved a lot.', 5, 'Completed'
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID=tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID=tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-11-13' AND subj2.subjectName='Calculus III'
) pick ON pick.min_ts = tl.timeslotID
JOIN System_User stu ON stu.userEmail='studentE@bughouse.edu'

UNION ALL

SELECT
  tl.timeslotID, tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
  stu.userID,
  '2025-11-13 13:00:00','2025-11-13 14:00:00',
  'Great effort today.', 4, 'Completed'
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID=tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID=tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-11-13' AND subj2.subjectName='Organic Chemistry'
) pick ON pick.min_ts = tl.timeslotID
JOIN System_User stu ON stu.userEmail='studentF@bughouse.edu';



-- =====================================================
-- 7) Tutor Availability (unique per tutor+day; no deprecated VALUES())
-- =====================================================
INSERT INTO Tutor_Availability (Tutor_System_User_userID, dayOfWeek, startTime, endTime)
SELECT * FROM (
  SELECT su.userID, 'Mon' AS dayOfWeek, TIME '09:00:00' AS startTime, TIME '12:00:00' AS endTime
    FROM System_User su WHERE su.userEmail='tutorA@bughouse.edu'
  UNION ALL
  SELECT su.userID, 'Wed', TIME '13:00:00', TIME '16:00:00'
    FROM System_User su WHERE su.userEmail='tutorB@bughouse.edu'
  UNION ALL
  SELECT su.userID, 'Fri', TIME '10:00:00', TIME '12:00:00'
    FROM System_User su WHERE su.userEmail='tutorC@bughouse.edu'
) AS new
ON DUPLICATE KEY UPDATE
  startTime = new.startTime,
  endTime   = new.endTime;