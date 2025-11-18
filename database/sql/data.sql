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
  -- insert more tutors

  ('Student','A','studentA@bughouse.edu','studentpasswordA','Student'),
  ('Student','B','studentB@bughouse.edu','studentpasswordB','Student'),
  ('Student','C','studentC@bughouse.edu','studentpasswordC','Student'),
  ('Student','D','studentD@bughouse.edu','studentpasswordD','Student'),
  ('Student','E','studentE@bughouse.edu','studentpasswordE','Student'),
  ('Student','F','studentF@bughouse.edu','studentpasswordF','Student'),
  ('Student','G','studentG@bughouse.edu','studentpasswordG','Student'),
  ('Student','H','studentH@bughouse.edu','studentpasswordH','Student'),
  ('Student','I','studentI@bughouse.edu','studentpasswordI','Student'),
  ('Student','J','studentJ@bughouse.edu','studentpasswordJ','Student'),
  ('Student','KK','studentKK@bughouse.edu','studentpasswordKK','Student')

  -- insert more students
AS new
ON DUPLICATE KEY UPDATE
  userPassword = new.userPassword,
  userRole     = new.userRole;


  -- UTA CSE courses 
INSERT INTO Academic_Subject (
   subjectCode ,subjectName)
VALUES
('CSE 1106', 'Introduction to Computer Science and Engineering'),
('CSE 1310', 'Introduction to Computers & Programming'),
('CSE 1320', 'Intermediate Programming'),
('CSE 1325', 'Object-Oriented Programming'),
('CSE 2312', 'Computer Organization & Assembly Language Programming'),
('CSE 2315', 'Discrete Structures'),
('CSE 2440', 'Circuit Analysis'),
('CSE 2441', 'Digital Logic Design I'),
('CSE 3302', 'Programming Languages'),
('CSE 3310', 'Fundamentals of Software Engineering'),
('CSE 3311', 'Object-Oriented Software Engineering'),
('CSE 3313', 'Introduction to Signal Processing'),
('CSE 3314', 'Professional Practices'),
('CSE 3315', 'Theoretical Concepts in Computer Science and Engineering'),
('CSE 3318', 'Algorithms & Data Structures'),
('CSE 3320', 'Operating Systems'),
('CSE 3323', 'Electronics'),
('CSE 3330', 'Database Systems and File Structures'),
('CSE 3340', 'Introduction to Human Computer Interaction'),
('CSE 3341', 'Digital Logic Design II'),
('CSE 3380', 'Linear Algebra for CSE'),
('CSE 3442', 'Embedded Systems I'),
('CSE 4303', 'Computer Graphics'),
('CSE 4304', 'Game Design and Development'),
('CSE 4305', 'Compilers for Algorithmic Languages'),
('CSE 4308', 'Artificial Intelligence'),
('CSE 4309', 'Fundamentals of Machine Learning'),
('CSE 4310', 'Fundamentals of Computer Vision'),
('CSE 4311', 'Neural Networks and Deep Learning'),
('CSE 4321', 'Software Testing & Maintenance'),
('CSE 4322', 'Software Project Management'),
('CSE 4323', 'Quantitative Computer Architecture'),
('CSE 4331', 'Database Implementation and Theory'),
('CSE 4333', 'Cloud Computing Fundamentals and Applications'),
('CSE 4334', 'Data Mining'),
('CSE 4342', 'Embedded Systems II'),
('CSE 4344', 'Computer Network Organization'),
('CSE 4345', 'Computational Methods'),
('CSE 4351', 'Parallel Processing'),
('CSE 4352', 'IoT and Networking')
AS new
ON DUPLICATE KEY UPDATE subjectName = new.subjectName;



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
-- not sure this data is going to



-- =====================================================
INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals)
SELECT userID, NULL, NULL FROM System_User WHERE userRole = 'Student';

-- =====================================================
INSERT INTO Administrator (System_User_userID, accessLevel)
SELECT userID, 1 FROM System_User WHERE userEmail IN ('adminA@bughouse.edu', 'adminB@bughouse.edu', 'adminC@bughouse.edu');

-- =====================================================
-- 5) Daily Schedule and Timeslot
INSERT INTO Daily_Schedule (Administrator_System_User_userID, scheduleDate)
SELECT su.userID, '2025-11-12'
FROM System_User su WHERE su.userEmail = 'adminA@bughouse.edu';

-- Restore Timeslot for each session (subject, tutor, schedule, times)
INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, timeslotStartTime, timeslotEndTime)
SELECT ds.scheduleID, subj.subjectID, t.userID, '08:00:00', '09:00:00'
FROM Daily_Schedule ds
JOIN Academic_Subject subj ON subj.subjectName = 'Introduction to Computers & Programming'
JOIN System_User t ON t.userEmail = 'tutorA@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12';

INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, timeslotStartTime, timeslotEndTime)
SELECT ds.scheduleID, subj.subjectID, t.userID, '10:00:00', '11:00:00'
FROM Daily_Schedule ds
JOIN Academic_Subject subj ON subj.subjectName = 'Circuit Analysis'
JOIN System_User t ON t.userEmail = 'tutorB@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12';

INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, timeslotStartTime, timeslotEndTime)
SELECT ds.scheduleID, subj.subjectID, t.userID, '12:00:00', '13:00:00'
FROM Daily_Schedule ds
JOIN Academic_Subject subj ON subj.subjectName = 'Linear Algebra for CSE'
JOIN System_User t ON t.userEmail = 'tutorC@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12';

INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, timeslotStartTime, timeslotEndTime)
SELECT ds.scheduleID, subj.subjectID, t.userID, '13:00:00', '14:00:00'
FROM Daily_Schedule ds
JOIN Academic_Subject subj ON subj.subjectName = 'Electronics'
JOIN System_User t ON t.userEmail = 'tutorD@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12';

INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, timeslotStartTime, timeslotEndTime)
SELECT ds.scheduleID, subj.subjectID, t.userID, '15:00:00', '16:00:00'
FROM Daily_Schedule ds
JOIN Academic_Subject subj ON subj.subjectName = 'Algorithms & Data Structures'
JOIN System_User t ON t.userEmail = 'tutorE@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12';

-- =====================================================
 -- =====================================================
-- Safe Tutor_Session inserts (one row per student/session)
-- =====================================================

-- 11/12 — Introduction to Computers & Programming
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
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
       '2025-11-12 08:00:00', '2025-11-12 09:00:00',
       'Good focus today.', 5, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentD@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Introduction to Computers & Programming'
LIMIT 1;

-- 11/12 — Circuit Analysis
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
       '2025-11-12 10:00:00', '2025-11-12 11:00:00',
       'Great explanations.', 4, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentE@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Circuit Analysis'
LIMIT 1;

-- 11/12 — Linear Algebra for CSE
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
       '2025-11-12 12:00:00', '2025-11-12 13:00:00',
       'Clear and helpful.', 5, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentF@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Linear Algebra for CSE'
LIMIT 1;

-- 11/12 — Electronics
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
       '2025-11-12 13:00:00', '2025-11-12 14:00:00',
       'Challenging but good.', 4, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentG@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Electronics'
LIMIT 1;

-- 11/12 — Algorithms & Data Structures
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
       '2025-11-12 15:00:00', '2025-11-12 16:00:00',
       'Great writing improvements.', 5, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentH@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Algorithms & Data Structures'
LIMIT 1;


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