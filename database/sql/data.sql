USE BugHouse;
-- Administrators
INSERT INTO Administrator (adminID, Name, Email) VALUES
(1, 'Alice Johnson', 'alice.johnson@bughouse.edu'),
(2, 'Bob Smith', 'bob.smith@bughouse.edu'),
(3, 'Carol Lee', 'carol.lee@bughouse.edu');

-- Tutors (Qualifications now match subjects they will be assigned to)
INSERT INTO Tutor (tutorID, tutorName, tutorEmail, tutorBiography, tutorQualifications, Administrator_adminID) VALUES
(1, 'Tutor One', 'tutor1@bughouse.edu', 'Bio 1', 'Calculus I', 1),
(2, 'Tutor Two', 'tutor2@bughouse.edu', 'Bio 2', 'Calculus II', 1),
(3, 'Tutor Three', 'tutor3@bughouse.edu', 'Bio 3', 'Calculus III', 2),
(4, 'Tutor Four', 'tutor4@bughouse.edu', 'Bio 4', 'Physics I', 2),
(5, 'Tutor Five', 'tutor5@bughouse.edu', 'Bio 5', 'Algorithms & Datastructures', 2),
(6, 'Tutor Six', 'tutor6@bughouse.edu', 'Bio 6', 'Organic Chemistry', 3),
(7, 'Tutor Seven', 'tutor7@bughouse.edu', 'Bio 7', 'Art History', 3),
(8, 'Tutor Eight', 'tutor8@bughouse.edu', 'Bio 8', 'Statistics', 1),
(9, 'Tutor Nine', 'tutor9@bughouse.edu', 'Bio 9', 'Algorithms & Datastructures', 2),
(10, 'Tutor Ten', 'tutor10@bughouse.edu', 'Bio 10', 'Calculus I', 3);

INSERT INTO Tutor_Availability (availabilityID, Tutor_tutorID, dayOfWeek, startTime, endTime) VALUES
-- Tutor 1
(1, 1, 1, '09:00:00', '11:00:00'),
(2, 1, 3, '14:00:00', '16:00:00'),

-- Tutor 2
(3, 2, 2, '10:00:00', '12:00:00'),
(4, 2, 3, '13:00:00', '15:00:00'),

-- Tutor 3
(5, 3, 4, '11:00:00', '13:00:00'),
(6, 3, 5, '15:00:00', '17:00:00'),

-- Tutor 4
(7, 4, 2, '09:00:00', '11:00:00'),
(8, 4, 3, '14:00:00', '16:00:00'),

-- Tutor 5
(9, 5, 4, '10:00:00', '12:00:00'),
(10, 5, 6, '13:00:00', '15:00:00'),

-- Tutor 6
(11, 6, 6, '11:00:00', '13:00:00'),
(12, 6, 7, '15:00:00', '17:00:00'),

-- Tutor 7
(13, 7, 2, '09:00:00', '11:00:00'),
(14, 7, 5, '14:00:00', '16:00:00'),

-- Tutor 8
(15, 8, 2, '10:00:00', '12:00:00'),
(16, 8, 3, '13:00:00', '15:00:00'),

-- Tutor 9
(17, 9, 1, '11:00:00', '13:00:00'),
(18, 9, 4, '15:00:00', '17:00:00'),

-- Tutor 10
(19, 10, 1, '09:00:00', '11:00:00'),
(20, 10, 2, '14:00:00', '16:00:00');

-- Students (Learning goals now match actual subject names)
INSERT INTO Student (studentID, studentName, studentEmail, Administrator_adminID, studentID_Card, studentLearning_Goals) VALUES
(1, 'Student A', 'studentA@bughouse.edu', 1, 'ID001', 'Calculus I'),
(2, 'Student B', 'studentB@bughouse.edu', 1, 'ID002', 'Physics I'),
(3, 'Student C', 'studentC@bughouse.edu', 1, 'ID003', 'Calculus III'),
(4, 'Student D', 'studentD@bughouse.edu', 2, 'ID004', 'Algorithms & Datastructures'),
(5, 'Student E', 'studentE@bughouse.edu', 2, 'ID005', 'Art History'),
(6, 'Student F', 'studentF@bughouse.edu', 2, 'ID006', 'Calculus II'),
(7, 'Student G', 'studentG@bughouse.edu', 3, 'ID007', 'Statistics'),
(8, 'Student H', 'studentH@bughouse.edu', 3, 'ID008', 'Organic Chemistry'),
(9, 'Student I', 'studentI@bughouse.edu', 3, 'ID009', 'Physics I'),
(10, 'Student J', 'studentJ@bughouse.edu', 1, 'ID010', 'Calculus I');

-- Subjects (updated full subject list)
INSERT INTO Academic_Subject (subjectID, subjectName) VALUES
(1, 'Calculus I'),
(2, 'Calculus II'),
(3, 'Calculus III'),
(4, 'Physics I'),
(5, 'Algorithms & Datastructures'),
(6, 'Organic Chemistry'),
(7, 'Art History'),
(8, 'Statistics');

-- Schedule
INSERT INTO Daily_Schedule (scheduleID, scheduleDate, Administrator_adminID) VALUES
(1, '2025-08-01', 1);

INSERT INTO Timeslot (timeslotID, Daily_Schedule_scheduleID, Tutor_tutorID, Academic_Subject_subjectID) VALUES
(1, 1, 1, 1),
(2, 1, 10, 1),
(3, 1, 1, 1),
(4, 1, 10, 1),
(5, 1, 10, 1),
(6, 1, 10, 1),
(7, 1, 10, 1),
(8, 1, 10, 1),
(9, 1, 2, 2),
(10, 1, 2, 2),
(11, 1, 2, 2),
(12, 1, 2, 2),
(13, 1, 2, 2),
(14, 1, 2, 2),
(15, 1, 2, 2),
(16, 1, 2, 2),
(17, 1, 3, 3),
(18, 1, 3, 3),
(19, 1, 3, 3),
(20, 1, 3, 3),
(21, 1, 3, 3),
(22, 1, 3, 3),
(23, 1, 3, 3),
(24, 1, 3, 3),
(25, 1, 4, 4),
(26, 1, 4, 4),
(27, 1, 4, 4),
(28, 1, 4, 4),
(29, 1, 4, 4),
(30, 1, 4, 4),
(31, 1, 4, 4),
(32, 1, 4, 4),
(33, 1, 9, 5),
(34, 1, 5, 5),
(35, 1, 5, 5),
(36, 1, 5, 5),
(37, 1, 9, 5),
(38, 1, 5, 5),
(39, 1, 5, 5),
(40, 1, 9, 5),
(41, 1, 6, 6),
(42, 1, 6, 6),
(43, 1, 6, 6),
(44, 1, 6, 6),
(45, 1, 6, 6),
(46, 1, 6, 6),
(47, 1, 6, 6),
(48, 1, 6, 6),
(49, 1, 7, 7),
(50, 1, 7, 7),
(51, 1, 7, 7),
(52, 1, 7, 7),
(53, 1, 7, 7),
(54, 1, 7, 7),
(55, 1, 7, 7),
(56, 1, 7, 7),
(57, 1, 8, 8),
(58, 1, 8, 8),
(59, 1, 8, 8),
(60, 1, 8, 8),
(61, 1, 8, 8),
(62, 1, 8, 8),
(63, 1, 8, 8),
(64, 1, 8, 8);

INSERT INTO Tutor_Session (sessionID, Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Tutor_tutorID, Student_studentID, sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating) VALUES
(1, 1, 1, 1, 5, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'Session on Calculus I', 5),
(2, 3, 1, 1, 7, '2025-08-01 10:00:00', '2025-08-01 10:50:00', 'Session on Calculus I', 4),
(3, 5, 1, 10, 9, '2025-08-01 12:00:00', '2025-08-01 12:50:00', 'Session on Calculus I', 5),
(4, 7, 1, 10, 7, '2025-08-01 14:00:00', '2025-08-01 14:50:00', 'Session on Calculus I', 4),
(5, 9, 1, 2, 3, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'Session on Calculus II', 4),
(6, 11, 1, 2, 1, '2025-08-01 10:00:00', '2025-08-01 10:50:00', 'Session on Calculus II', 5),
(7, 13, 1, 2, 10, '2025-08-01 12:00:00', '2025-08-01 12:50:00', 'Session on Calculus II', 5),
(8, 15, 1, 2, 4, '2025-08-01 14:00:00', '2025-08-01 14:50:00', 'Session on Calculus II', 3),
(9, 17, 1, 3, 8, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'Session on Calculus III', 4),
(10, 19, 1, 3, 5, '2025-08-01 10:00:00', '2025-08-01 10:50:00', 'Session on Calculus III', 3),
(11, 21, 1, 3, 7, '2025-08-01 12:00:00', '2025-08-01 12:50:00', 'Session on Calculus III', 4),
(12, 23, 1, 3, 9, '2025-08-01 14:00:00', '2025-08-01 14:50:00', 'Session on Calculus III', 4),
(13, 25, 1, 4, 1, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'Session on Physics I', 5),
(14, 27, 1, 4, 1, '2025-08-01 10:00:00', '2025-08-01 10:50:00', 'Session on Physics I', 4),
(15, 29, 1, 4, 9, '2025-08-01 12:00:00', '2025-08-01 12:50:00', 'Session on Physics I', 5),
(16, 31, 1, 4, 8, '2025-08-01 14:00:00', '2025-08-01 14:50:00', 'Session on Physics I', 3),
(17, 33, 1, 9, 6, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'Session on Algorithms & Datastructures', 5),
(18, 35, 1, 5, 2, '2025-08-01 10:00:00', '2025-08-01 10:50:00', 'Session on Algorithms & Datastructures', 5),
(19, 37, 1, 9, 5, '2025-08-01 12:00:00', '2025-08-01 12:50:00', 'Session on Algorithms & Datastructures', 3),
(20, 39, 1, 5, 7, '2025-08-01 14:00:00', '2025-08-01 14:50:00', 'Session on Algorithms & Datastructures', 5),
(21, 41, 1, 6, 1, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'Session on Organic Chemistry', 4),
(22, 43, 1, 6, 4, '2025-08-01 10:00:00', '2025-08-01 10:50:00', 'Session on Organic Chemistry', 3),
(23, 45, 1, 6, 4, '2025-08-01 12:00:00', '2025-08-01 12:50:00', 'Session on Organic Chemistry', 4),
(24, 47, 1, 6, 7, '2025-08-01 14:00:00', '2025-08-01 14:50:00', 'Session on Organic Chemistry', 5),
(25, 49, 1, 7, 8, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'Session on Art History', 4),
(26, 51, 1, 7, 4, '2025-08-01 10:00:00', '2025-08-01 10:50:00', 'Session on Art History', 4),
(27, 53, 1, 7, 4, '2025-08-01 12:00:00', '2025-08-01 12:50:00', 'Session on Art History', 5),
(28, 55, 1, 7, 4, '2025-08-01 14:00:00', '2025-08-01 14:50:00', 'Session on Art History', 4),
(29, 57, 1, 8, 10, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'Session on Statistics', 4),
(30, 59, 1, 8, 2, '2025-08-01 10:00:00', '2025-08-01 10:50:00', 'Session on Statistics', 5),
(31, 61, 1, 8, 9, '2025-08-01 12:00:00', '2025-08-01 12:50:00', 'Session on Statistics', 5),
(32, 63, 1, 8, 6, '2025-08-01 14:00:00', '2025-08-01 14:50:00', 'Session on Statistics', 4);