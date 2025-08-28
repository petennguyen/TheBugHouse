USE BugHouse;

-- =====================================================
-- 1) Subjects
-- =====================================================
INSERT INTO Academic_Subject (subjectName) VALUES
('Calculus I'), ('Calculus II'), ('Calculus III'),
('Physics I'), ('Algorithms & Datastructures'),
('Organic Chemistry'), ('Art History'), ('Statistics') , ('Robotics')
ON DUPLICATE KEY UPDATE subjectName = VALUES(subjectName);

-- =====================================================
-- 2) System users (no explicit IDs)
-- =====================================================
INSERT INTO System_User (userFirstName, userLastName, userEmail, userPassword, userRole) VALUES
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

('Student','B','studentB@bughouse.edu','studentpasswordB','Student'),
('Student','C','studentC@bughouse.edu','studentpasswordC','Student'),
('Student','D','studentD@bughouse.edu','studentpasswordD','Student'),
('Student','E','studentE@bughouse.edu','studentpasswordE','Student'),
('Student','F','studentF@bughouse.edu','studentpasswordF','Student'),
('Student','G','studentG@bughouse.edu','studentpasswordG','Student'),
('Student','H','studentH@bughouse.edu','studentpasswordH','Student'),
('Student','I','studentI@bughouse.edu','studentpasswordI','Student'),
('Student','J','studentJ@bughouse.edu','studentpasswordJ','Student')
ON DUPLICATE KEY UPDATE userPassword = VALUES(userPassword), userRole = VALUES(userRole);

-- =====================================================
-- 3) Role tables
-- =====================================================
-- Admins
INSERT INTO Administrator (System_User_userID, accessLevel)
SELECT userID, 1 FROM System_User WHERE userEmail IN ('adminA@bughouse.edu','adminB@bughouse.edu','adminC@bughouse.edu')
ON DUPLICATE KEY UPDATE accessLevel = VALUES(accessLevel);

-- Tutors
INSERT INTO Tutor (System_User_userID, tutorBiography, tutorQualifications)
SELECT userID, 'Experienced in teaching', 'Calculus I'  FROM System_User WHERE userEmail = 'tutorA@bughouse.edu'
ON DUPLICATE KEY UPDATE tutorBiography=VALUES(tutorBiography), tutorQualifications=VALUES(tutorQualifications);
INSERT INTO Tutor (System_User_userID, tutorBiography, tutorQualifications)
SELECT userID, 'Experienced in teaching', 'Calculus II' FROM System_User WHERE userEmail = 'tutorB@bughouse.edu'
ON DUPLICATE KEY UPDATE tutorBiography=VALUES(tutorBiography), tutorQualifications=VALUES(tutorQualifications);
INSERT INTO Tutor (System_User_userID, tutorBiography, tutorQualifications)
SELECT userID, 'Experienced in teaching', 'Calculus III' FROM System_User WHERE userEmail = 'tutorC@bughouse.edu'
ON DUPLICATE KEY UPDATE tutorBiography=VALUES(tutorBiography), tutorQualifications=VALUES(tutorQualifications);
INSERT INTO Tutor (System_User_userID, tutorBiography, tutorQualifications)
SELECT userID, 'Experienced in teaching', 'Physics I' FROM System_User WHERE userEmail = 'tutorD@bughouse.edu'
ON DUPLICATE KEY UPDATE tutorBiography=VALUES(tutorBiography), tutorQualifications=VALUES(tutorQualifications);
INSERT INTO Tutor (System_User_userID, tutorBiography, tutorQualifications)
SELECT userID, 'Experienced in teaching', 'Algorithms & Datastructures' FROM System_User WHERE userEmail = 'tutorE@bughouse.edu'
ON DUPLICATE KEY UPDATE tutorBiography=VALUES(tutorBiography), tutorQualifications=VALUES(tutorQualifications);
INSERT INTO Tutor (System_User_userID, tutorBiography, tutorQualifications)
SELECT userID, 'Experienced in teaching', 'Organic Chemistry' FROM System_User WHERE userEmail = 'tutorF@bughouse.edu'
ON DUPLICATE KEY UPDATE tutorBiography=VALUES(tutorBiography), tutorQualifications=VALUES(tutorQualifications);
INSERT INTO Tutor (System_User_userID, tutorBiography, tutorQualifications)
SELECT userID, 'Experienced in teaching', 'Art History' FROM System_User WHERE userEmail = 'tutorG@bughouse.edu'
ON DUPLICATE KEY UPDATE tutorBiography=VALUES(tutorBiography), tutorQualifications=VALUES(tutorQualifications);
INSERT INTO Tutor (System_User_userID, tutorBiography, tutorQualifications)
SELECT userID, 'Experienced in teaching', 'Statistics' FROM System_User WHERE userEmail = 'tutorH@bughouse.edu'
ON DUPLICATE KEY UPDATE tutorBiography=VALUES(tutorBiography), tutorQualifications=VALUES(tutorQualifications);
INSERT INTO Tutor (System_User_userID, tutorBiography, tutorQualifications)
SELECT userID, 'Experienced in teaching', 'Algorithms & Datastructures' FROM System_User WHERE userEmail = 'tutorI@bughouse.edu'
ON DUPLICATE KEY UPDATE tutorBiography=VALUES(tutorBiography), tutorQualifications=VALUES(tutorQualifications);
INSERT INTO Tutor (System_User_userID, tutorBiography, tutorQualifications)
SELECT userID, 'Experienced in teaching', 'Calculus I' FROM System_User WHERE userEmail = 'tutorJ@bughouse.edu'
ON DUPLICATE KEY UPDATE tutorBiography=VALUES(tutorBiography), tutorQualifications=VALUES(tutorQualifications);

-- Students
INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals)
SELECT userID, 'ID001', 'Calculus I' FROM System_User WHERE userEmail = 'studentA@bughouse.edu'
ON DUPLICATE KEY UPDATE studentIDCard=VALUES(studentIDCard), studentLearningGoals=VALUES(studentLearningGoals);
INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals)
SELECT userID, 'ID002', 'Physics I' FROM System_User WHERE userEmail = 'studentB@bughouse.edu'
ON DUPLICATE KEY UPDATE studentIDCard=VALUES(studentIDCard), studentLearningGoals=VALUES(studentLearningGoals);
INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals)
SELECT userID, 'ID003', 'Calculus III' FROM System_User WHERE userEmail = 'studentC@bughouse.edu'
ON DUPLICATE KEY UPDATE studentIDCard=VALUES(studentIDCard), studentLearningGoals=VALUES(studentLearningGoals);
INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals)
SELECT userID, 'ID004', 'Algorithms & Datastructures' FROM System_User WHERE userEmail = 'studentD@bughouse.edu'
ON DUPLICATE KEY UPDATE studentIDCard=VALUES(studentIDCard), studentLearningGoals=VALUES(studentLearningGoals);
INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals)
SELECT userID, 'ID005', 'Art History' FROM System_User WHERE userEmail = 'studentE@bughouse.edu'
ON DUPLICATE KEY UPDATE studentIDCard=VALUES(studentIDCard), studentLearningGoals=VALUES(studentLearningGoals);
INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals)
SELECT userID, 'ID006', 'Calculus II' FROM System_User WHERE userEmail = 'studentF@bughouse.edu'
ON DUPLICATE KEY UPDATE studentIDCard=VALUES(studentIDCard), studentLearningGoals=VALUES(studentLearningGoals);
INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals)
SELECT userID, 'ID007', 'Statistics' FROM System_User WHERE userEmail = 'studentG@bughouse.edu'
ON DUPLICATE KEY UPDATE studentIDCard=VALUES(studentIDCard), studentLearningGoals=VALUES(studentLearningGoals);
INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals)
SELECT userID, 'ID008', 'Organic Chemistry' FROM System_User WHERE userEmail = 'studentH@bughouse.edu'
ON DUPLICATE KEY UPDATE studentIDCard=VALUES(studentIDCard), studentLearningGoals=VALUES(studentLearningGoals);
INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals)
SELECT userID, 'ID009', 'Physics I' FROM System_User WHERE userEmail = 'studentI@bughouse.edu'
ON DUPLICATE KEY UPDATE studentIDCard=VALUES(studentIDCard), studentLearningGoals=VALUES(studentLearningGoals);
INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals)
SELECT userID, 'ID010', 'Calculus I' FROM System_User WHERE userEmail = 'studentJ@bughouse.edu'
ON DUPLICATE KEY UPDATE studentIDCard=VALUES(studentIDCard), studentLearningGoals=VALUES(studentLearningGoals);

-- =====================================================
-- 4) Schedules (AUTO_INCREMENT IDs)
-- =====================================================
INSERT INTO Daily_Schedule (Administrator_System_User_userID, scheduleDate)
SELECT userID, '2025-08-01' FROM System_User WHERE userEmail='adminA@bughouse.edu';
INSERT INTO Daily_Schedule (Administrator_System_User_userID, scheduleDate)
SELECT userID, '2025-08-02' FROM System_User WHERE userEmail='adminB@bughouse.edu';
INSERT INTO Daily_Schedule (Administrator_System_User_userID, scheduleDate)
SELECT userID, '2025-08-03' FROM System_User WHERE userEmail='adminC@bughouse.edu';

-- =====================================================
-- 5) Timeslots (AUTO_INCREMENT first column; composite PK kept)
--    We reference schedules by date to grab their IDs.
-- =====================================================
-- helper to fetch IDs
-- (no stored variables needed; use inline SELECTs)

INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID)
SELECT ds.scheduleID, s.subjectID, t.userID
FROM Daily_Schedule ds
JOIN Academic_Subject s ON s.subjectName='Calculus I'
JOIN System_User t ON t.userEmail='tutorA@bughouse.edu'
WHERE ds.scheduleDate='2025-08-01';

INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID)
SELECT ds.scheduleID, s.subjectID, t.userID
FROM Daily_Schedule ds
JOIN Academic_Subject s ON s.subjectName='Physics I'
JOIN System_User t ON t.userEmail='tutorB@bughouse.edu'
WHERE ds.scheduleDate='2025-08-01';

INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID)
SELECT ds.scheduleID, s.subjectID, t.userID
FROM Daily_Schedule ds
JOIN Academic_Subject s ON s.subjectName='Statistics'
JOIN System_User t ON t.userEmail='tutorC@bughouse.edu'
WHERE ds.scheduleDate='2025-08-02';

-- =====================================================
-- 6) Sessions (AUTO_INCREMENT sessionID; references composite timeslot)
-- =====================================================
-- Session 1: Calculus I with tutorA and studentA on 2025-08-01 (uses the first timeslot of that day)
INSERT INTO Tutor_Session (
  Timeslot_timeslotID,
  Timeslot_Daily_Schedule_scheduleID,
  Academic_Subject_subjectID,
  Tutor_System_User_userID,
  Student_System_User_userID,
  sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating
)
SELECT
  tl.timeslotID,
  tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID,
  tl.Tutor_System_User_userID,
  stu.userID,
  '2025-08-01 09:00:00', '2025-08-01 10:00:00', 'Great session!', 5
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN System_User stu ON stu.userEmail='studentA@bughouse.edu'
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
WHERE ds.scheduleDate='2025-08-01' AND subj.subjectName='Calculus I'
LIMIT 1;

-- Session 2: Physics I with tutorB and studentB on 2025-08-01
INSERT INTO Tutor_Session (
  Timeslot_timeslotID,
  Timeslot_Daily_Schedule_scheduleID,
  Academic_Subject_subjectID,
  Tutor_System_User_userID,
  Student_System_User_userID,
  sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating
)
SELECT
  tl.timeslotID,
  tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID,
  tl.Tutor_System_User_userID,
  stu.userID,
  '2025-08-01 11:00:00', '2025-08-01 12:00:00', 'Helpful session.', 4
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN System_User stu ON stu.userEmail='studentB@bughouse.edu'
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
WHERE ds.scheduleDate='2025-08-01' AND subj.subjectName='Physics I'
LIMIT 1;

-- Session 3: Statistics with tutorC and studentC on 2025-08-02
INSERT INTO Tutor_Session (
  Timeslot_timeslotID,
  Timeslot_Daily_Schedule_scheduleID,
  Academic_Subject_subjectID,
  Tutor_System_User_userID,
  Student_System_User_userID,
  sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating
)
SELECT
  tl.timeslotID,
  tl.Daily_Schedule_scheduleID,
  tl.Academic_Subject_subjectID,
  tl.Tutor_System_User_userID,
  stu.userID,
  '2025-08-02 14:00:00', '2025-08-02 15:00:00', 'Very informative.', 5
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN System_User stu ON stu.userEmail='studentC@bughouse.edu'
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
WHERE ds.scheduleDate='2025-08-02' AND subj.subjectName='Statistics'
LIMIT 1;

-- =====================================================
-- 7) Tutor Availability (examples)
-- =====================================================
INSERT INTO Tutor_Availability (Tutor_System_User_userID, dayOfWeek, startTime, endTime)
SELECT userID, 'Mon', '09:00:00', '12:00:00' FROM System_User WHERE userEmail='tutorA@bughouse.edu'
ON DUPLICATE KEY UPDATE startTime=VALUES(startTime), endTime=VALUES(endTime);

INSERT INTO Tutor_Availability (Tutor_System_User_userID, dayOfWeek, startTime, endTime)
SELECT userID, 'Wed', '13:00:00', '16:00:00' FROM System_User WHERE userEmail='tutorB@bughouse.edu'
ON DUPLICATE KEY UPDATE startTime=VALUES(startTime), endTime=VALUES(endTime);

INSERT INTO Tutor_Availability (Tutor_System_User_userID, dayOfWeek, startTime, endTime)
SELECT userID, 'Fri', '10:00:00', '12:00:00' FROM System_User WHERE userEmail='tutorC@bughouse.edu'
ON DUPLICATE KEY UPDATE startTime=VALUES(startTime), endTime=VALUES(endTime);
