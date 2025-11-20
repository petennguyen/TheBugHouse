-- =====================================================
-- 2) System users (bulk upsert without VALUES() function)
-- =====================================================
INSERT INTO System_User (userFirstName, userLastName, userEmail, userPassword, userRole)
VALUES
  ('Admin','A','adminA@bughouse.edu','adminpasswordA','Admin'),
  ('Admin','B','adminB@bughouse.edu','adminpasswordB','Admin'),
  ('Admin','C','adminC@bughouse.edu','adminpasswordC','Admin'),

  ('John','Doe','tutorA@bughouse.edu','tutorpasswordA','Tutor'),
  ('Jane','Smith','tutorB@bughouse.edu','tutorpasswordB','Tutor'),
  ('John','Wick','tutorC@bughouse.edu','tutorpasswordC','Tutor'),
  ('Alice','Johnson','tutorD@bughouse.edu','tutorpasswordD','Tutor'),
  ('Robert','Brown','tutorE@bughouse.edu','tutorpasswordE','Tutor'),
  ('Emily','Davis','tutorF@bughouse.edu','tutorpasswordF','Tutor'),
  ('Michael','Clark','tutorG@bughouse.edu','tutorpasswordG','Tutor'),
  ('Sarah','Miller','tutorH@bughouse.edu','tutorpasswordH','Tutor'),
  ('David','Wilson','tutorI@bughouse.edu','tutorpasswordI','Tutor'),
  ('Sophia','Moore','tutorJ@bughouse.edu','tutorpasswordJ','Tutor'),
  ('James','Taylor','tutorK@bughouse.edu','tutorpasswordK','Tutor'),
  ('Olivia','Anderson','tutorL@bughouse.edu','tutorpasswordL','Tutor'),
  ('William','Thomas','tutorM@bughouse.edu','tutorpasswordM','Tutor'),
  ('Emma','Jackson','tutorN@bughouse.edu','tutorpasswordN','Tutor'),
  ('Benjamin','White','tutorO@bughouse.edu','tutorpasswordO','Tutor'),
  ('Lucas','Harris','tutorP@bughouse.edu','tutorpasswordP','Tutor'),

  ('Liam','Walker','studentA@bughouse.edu','studentpasswordA','Student'),
  ('Noah','Young','studentB@bughouse.edu','studentpasswordB','Student'),
  ('Emma','King','studentC@bughouse.edu','studentpasswordC','Student'),
  ('Olivia','Scott','studentD@bughouse.edu','studentpasswordD','Student'),
  ('Ava','Green','studentE@bughouse.edu','studentpasswordE','Student'),
  ('Sophia','Baker','studentF@bughouse.edu','studentpasswordF','Student'),
  ('Isabella','Adams','studentG@bughouse.edu','studentpasswordG','Student'),
  ('Mason','Nelson','studentH@bughouse.edu','studentpasswordH','Student'),
  ('Lucas','Carter','studentI@bughouse.edu','studentpasswordI','Student'),
  ('Mia','Mitchell','studentJ@bughouse.edu','studentpasswordJ','Student'),
  ('Ella','Reed','studentK@bughouse.edu','studentpasswordK','Student'),
  ('Jack','Parker','studentL@bughouse.edu','studentpasswordL','Student'),
  ('Amelia','Evans','studentM@bughouse.edu','studentpasswordM','Student'),
  ('Ethan','Turner','studentN@bughouse.edu','studentpasswordN','Student'),
  ('Charlotte','Collins','studentO@bughouse.edu','studentpasswordO','Student'),
  ('Logan','Stewart','studentP@bughouse.edu','studentpasswordP','Student'),
  ('Harper','Sanchez','studentQ@bughouse.edu','studentpasswordQ','Student'),
  ('Alexander','Morris','studentR@bughouse.edu','studentpasswordR','Student'),
  ('Avery','Rogers','studentS@bughouse.edu','studentpasswordS','Student'),
  ('Evelyn','Cook','studentT@bughouse.edu','studentpasswordT','Student'),
  ('Daniel','Morgan','studentU@bughouse.edu','studentpasswordU','Student'),
  ('Abigail','Peterson','studentV@bughouse.edu','studentpasswordV','Student'),
  ('Matthew','Bailey','studentW@bughouse.edu','studentpasswordW','Student'),
  ('Scarlett','Rivera','studentX@bughouse.edu','studentpasswordX','Student'),
  ('Jackson','Cooper','studentY@bughouse.edu','studentpasswordY','Student'),
  ('Grace','Richardson','studentZ@bughouse.edu','studentpasswordZ','Student'),
  ('Carter','Wood','studentAA@bughouse.edu','studentpasswordAA','Student'),
  ('Chloe','Ward','studentBB@bughouse.edu','studentpasswordBB','Student'),
  ('Sebastian','Brooks','studentCC@bughouse.edu','studentpasswordCC','Student'),
  ('Penelope','Bennett','studentDD@bughouse.edu','studentpasswordDD','Student')

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
      '2025-11-12 08:02:00', '2025-11-12 09:00:00',
      'Arrived a bit late, but focused.', 5, 'Late'
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
      '2025-11-12 10:05:00', '2025-11-12 11:00:00',
      'Started late, but good explanations.', 4, 'Late'
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
      '2025-11-12 12:00:00', '2025-11-12 12:55:00',
      'Left a bit early, but clear and helpful.', 5, 'Early'
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
      '2025-11-12 13:00:00', '2025-11-12 14:10:00',
      'Stayed late for extra help. Challenging but good.', 4, 'Late'
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
      '2025-11-12 15:00:00', '2025-11-12 15:50:00',
      'Session ended early, but productive.', 5, 'Early'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentH@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Algorithms & Data Structures'
LIMIT 1;

-- Additional sessions for demo/test coverage (20 more for total of 25)
-- 6
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 08:10:00', '2025-11-12 09:00:00',
      'Late start, but very helpful.', 5, 'Late'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentI@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Introduction to Computers & Programming'
LIMIT 1;

-- 7
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 10:00:00', '2025-11-12 10:55:00',
      'Session ended early, learned a lot.', 4, 'Early'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentJ@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Circuit Analysis'
LIMIT 1;

-- 8
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 12:03:00', '2025-11-12 13:00:00',
      'Started a few minutes late, but great session.', 5, 'Late'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentK@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Linear Algebra for CSE'
LIMIT 1;

-- 9
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 13:00:00', '2025-11-12 14:00:00',
      'Tough material, but tutor explained well.', 4, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentL@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Electronics'
LIMIT 1;

-- 10
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 15:00:00', '2025-11-12 16:00:00',
      'Session was engaging.', 5, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentM@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Algorithms & Data Structures'
LIMIT 1;

-- 11
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 08:00:00', '2025-11-12 09:00:00',
      'Tutor was patient.', 4, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentN@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Introduction to Computers & Programming'
LIMIT 1;

-- 12
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 10:00:00', '2025-11-12 11:00:00',
      'Good review session.', 5, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentO@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Circuit Analysis'
LIMIT 1;

-- 13
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 12:00:00', '2025-11-12 13:00:00',
      'Very clear explanations.', 5, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentP@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Linear Algebra for CSE'
LIMIT 1;

-- 14
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 13:00:00', '2025-11-12 14:00:00',
      'Enjoyed the session.', 4, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentQ@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Electronics'
LIMIT 1;

-- 15
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 15:00:00', '2025-11-12 16:00:00',
      'Tutor was knowledgeable.', 5, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentR@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Algorithms & Data Structures'
LIMIT 1;

-- 16
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 08:00:00', '2025-11-12 09:00:00',
      'Session was fun.', 4, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentS@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Introduction to Computers & Programming'
LIMIT 1;

-- 17
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 10:00:00', '2025-11-12 11:00:00',
      'Good session.', 5, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentT@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Circuit Analysis'
LIMIT 1;

-- 18
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 12:00:00', '2025-11-12 13:00:00',
      'Very informative.', 5, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentU@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Linear Algebra for CSE'
LIMIT 1;

-- 19
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 13:00:00', '2025-11-12 14:00:00',
      'Session was okay.', 4, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentV@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Electronics'
LIMIT 1;

-- 20
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 15:00:00', '2025-11-12 16:00:00',
      'Great session.', 5, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentW@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Algorithms & Data Structures'
LIMIT 1;

-- 21
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 08:00:00', '2025-11-12 09:00:00',
      'Session was helpful.', 4, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentX@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Introduction to Computers & Programming'
LIMIT 1;

-- 22
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 10:00:00', '2025-11-12 11:00:00',
      'Good explanations.', 5, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentY@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Circuit Analysis'
LIMIT 1;

-- 23
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 12:00:00', '2025-11-12 13:00:00',
      'Very good session.', 5, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentZ@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Linear Algebra for CSE'
LIMIT 1;

-- 24
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 13:00:00', '2025-11-12 14:00:00',
      'Session was interesting.', 4, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentAA@bughouse.edu'
WHERE ds.scheduleDate = '2025-11-12'
  AND subj.subjectName = 'Electronics'
LIMIT 1;

-- 25
INSERT INTO Tutor_Session (
    Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
    Tutor_System_User_userID, Student_System_User_userID,
    sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating, sessionStatus
)
SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID, tl.Tutor_System_User_userID,
       stu.userID,
      '2025-11-12 15:00:00', '2025-11-12 16:00:00',
      'Excellent session.', 5, 'Completed'
FROM Timeslot tl
JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
JOIN System_User stu ON stu.userEmail = 'studentBB@bughouse.edu'
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