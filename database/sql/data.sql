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
  SELECT su.userID, DATE '2025-08-01' FROM System_User su WHERE su.userEmail='adminA@bughouse.edu'
  UNION ALL
  SELECT su.userID, DATE '2025-08-02' FROM System_User su WHERE su.userEmail='adminB@bughouse.edu'
  UNION ALL
  SELECT su.userID, DATE '2025-08-03' FROM System_User su WHERE su.userEmail='adminC@bughouse.edu'
) AS new;

-- =====================================================
-- 5) Timeslots
-- =====================================================
INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID)
SELECT * FROM (
  SELECT ds.scheduleID, s.subjectID, t.userID
    FROM Daily_Schedule ds
    JOIN Academic_Subject s ON s.subjectName='Calculus I'
    JOIN System_User t ON t.userEmail='tutorA@bughouse.edu'
    WHERE ds.scheduleDate='2025-08-01'
  UNION ALL
  SELECT ds.scheduleID, s.subjectID, t.userID
    FROM Daily_Schedule ds
    JOIN Academic_Subject s ON s.subjectName='Physics I'
    JOIN System_User t ON t.userEmail='tutorB@bughouse.edu'
    WHERE ds.scheduleDate='2025-08-01'
  UNION ALL
  SELECT ds.scheduleID, s.subjectID, t.userID
    FROM Daily_Schedule ds
    JOIN Academic_Subject s ON s.subjectName='Statistics'
    JOIN System_User t ON t.userEmail='tutorC@bughouse.edu'
    WHERE ds.scheduleDate='2025-08-02'
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
  sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating
)
-- Session 1: 2025-08-01 Calculus I (studentA)
SELECT
  tl.timeslotID,
  tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID,
  tl.Tutor_System_User_userID,
  stuA.userID,
  '2025-08-01 09:00:00', '2025-08-01 10:00:00', 'Great session!', 5
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID = tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID = tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-08-01' AND subj2.subjectName='Calculus I'
) pick1 ON pick1.min_ts = tl.timeslotID
JOIN System_User stuA ON stuA.userEmail='studentA@bughouse.edu'

UNION ALL

-- Session 2: 2025-08-01 Physics I (studentB)
SELECT
  tl.timeslotID,
  tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID,
  tl.Tutor_System_User_userID,
  stuB.userID,
  '2025-08-01 11:00:00', '2025-08-01 12:00:00', 'Helpful session.', 4
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID = tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID = tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-08-01' AND subj2.subjectName='Physics I'
) pick2 ON pick2.min_ts = tl.timeslotID
JOIN System_User stuB ON stuB.userEmail='studentB@bughouse.edu'

UNION ALL

-- Session 3: 2025-08-02 Statistics (studentC)
SELECT
  tl.timeslotID,
  tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID,
  tl.Tutor_System_User_userID,
  stuC.userID,
  '2025-08-02 14:00:00', '2025-08-02 15:00:00', 'Very informative.', 5
FROM Timeslot tl
JOIN (
  SELECT MIN(tl2.timeslotID) AS min_ts
  FROM Timeslot tl2
  JOIN Daily_Schedule ds2 ON ds2.scheduleID = tl2.Daily_Schedule_scheduleID
  JOIN Academic_Subject subj2 ON subj2.subjectID = tl2.Academic_Subject_subjectID
  WHERE ds2.scheduleDate='2025-08-02' AND subj2.subjectName='Statistics'
) pick3 ON pick3.min_ts = tl.timeslotID
JOIN System_User stuC ON stuC.userEmail='studentC@bughouse.edu';


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
