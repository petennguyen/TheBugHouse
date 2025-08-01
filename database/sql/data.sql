USE BugHouse;

INSERT INTO System_User (userID, userFirstname, userLastname, userEmail, userPassword, userRole) VALUES
(1, 'Admin', 'A', 'adminA@bughouse.edu', 'adminpasswordA', 'admin'),
(2, 'Admin', 'B', 'adminB@bughouse.edu', 'adminpasswordB', 'admin'),
(3, 'Admin', 'C', 'adminC@bughouse.edu', 'adminpasswordC', 'admin'),

(4, 'Tutor', 'A', 'tutorA@bughouse.edu', 'tutorpasswordA', 'tutor'),
(5, 'Tutor', 'B', 'tutorB@bughouse.edu', 'tutorpasswordB', 'tutor'),
(6, 'Tutor', 'C', 'tutorC@bughouse.edu', 'tutorpasswordC', 'tutor'),
(7, 'Tutor', 'D', 'tutorD@bughouse.edu', 'tutorpasswordD', 'tutor'),
(8, 'Tutor', 'E', 'tutorE@bughouse.edu', 'tutorpasswordE', 'tutor'),
(9, 'Tutor', 'F', 'tutorF@bughouse.edu', 'tutorpasswordF', 'tutor'),
(10, 'Tutor', 'G', 'tutorG@bughouse.edu', 'tutorpasswordG', 'tutor'),
(11, 'Tutor', 'H', 'tutorH@bughouse.edu', 'tutorpasswordH', 'tutor'),
(12, 'Tutor', 'I', 'tutorI@bughouse.edu', 'tutorpasswordI', 'tutor'),
(13, 'Tutor', 'J', 'tutorJ@bughouse.edu', 'tutorpasswordJ', 'tutor'),

(14, 'Student', 'A', 'studentA@bughouse.edu', 'studentpasswordA', 'student'),
(15, 'Student', 'B', 'studentB@bughouse.edu', 'studentpasswordB', 'student'),
(16, 'Student', 'C', 'studentC@bughouse.edu', 'studentpasswordC', 'student'),
(17, 'Student', 'D', 'studentD@bughouse.edu', 'studentpasswordD', 'student'),
(18, 'Student', 'E', 'studentE@bughouse.edu', 'studentpasswordE', 'student'),
(19, 'Student', 'F', 'studentF@bughouse.edu', 'studentpasswordF', 'student'),
(20, 'Student', 'G', 'studentG@bughouse.edu', 'studentpasswordG', 'student'),
(21, 'Student', 'H', 'studentH@bughouse.edu', 'studentpasswordH', 'student'),
(22, 'Student', 'I', 'studentI@bughouse.edu', 'studentpasswordI', 'student'),
(23, 'Student', 'J', 'studentJ@bughouse.edu', 'studentpasswordJ', 'student');

INSERT INTO Administrator (System_User_userID, accessLevel) VALUES
(1, 1),
(2, 1),
(3, 1);

INSERT INTO Tutor (System_User_userID, tutorBiography, tutorQualifications) VALUES
(4, 'Bio 1', 'Calculus I'),
(5, 'Bio 2', 'Calculus II'),
(6, 'Bio 3', 'Calculus III'),
(7, 'Bio 4', 'Physics I'),
(8, 'Bio 5', 'Algorithms & Datastructures'),
(9, 'Bio 6', 'Organic Chemistry'),
(10, 'Bio 7', 'Art History'),
(11, 'Bio 8', 'Statistics'),
(12, 'Bio 9', 'Algorithms & Datastructures'),
(13, 'Bio 10', 'Calculus I');

INSERT INTO Tutor_Availability (availabilityID, Tutor_System_User_userID, dayOfWeek, startTime, endTime) VALUES
(1, 4, 1, '09:00:00', '11:00:00'),
(2, 4, 3, '14:00:00', '16:00:00'),
(3, 5, 2, '10:00:00', '12:00:00'),
(4, 5, 3, '13:00:00', '15:00:00'),
(5, 6, 4, '11:00:00', '13:00:00'),
(6, 6, 5, '15:00:00', '17:00:00'),
(7, 7, 2, '09:00:00', '11:00:00'),
(8, 7, 3, '14:00:00', '16:00:00'),
(9, 8, 4, '10:00:00', '12:00:00'),
(10, 8, 6, '13:00:00', '15:00:00'),
(11, 9, 6, '11:00:00', '13:00:00'),
(12, 9, 7, '15:00:00', '17:00:00'),
(13, 10, 2, '09:00:00', '11:00:00'),
(14, 10, 5, '14:00:00', '16:00:00'),
(15, 11, 2, '10:00:00', '12:00:00'),
(16, 11, 3, '13:00:00', '15:00:00'),
(17, 12, 1, '11:00:00', '13:00:00'),
(18, 12, 4, '15:00:00', '17:00:00'),
(19, 13, 1, '09:00:00', '11:00:00'),
(20, 13, 2, '14:00:00', '16:00:00');

INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals) VALUES
(14, 'ID001', 'Calculus I'),
(15, 'ID002', 'Physics I'),
(16, 'ID003', 'Calculus III'),
(17, 'ID004', 'Algorithms & Datastructures'),
(18, 'ID005', 'Art History'),
(19, 'ID006', 'Calculus II'),
(20, 'ID007', 'Statistics'),
(21, 'ID008', 'Organic Chemistry'),
(22, 'ID009', 'Physics I'),
(23, 'ID010', 'Calculus I');

INSERT INTO Academic_Subject (subjectID, subjectName) VALUES
(1, 'Calculus I'),
(2, 'Calculus II'),
(3, 'Calculus III'),
(4, 'Physics I'),
(5, 'Algorithms & Datastructures'),
(6, 'Organic Chemistry'),
(7, 'Art History'),
(8, 'Statistics');

INSERT INTO Daily_Schedule (scheduleID, scheduleDate, Administrator_System_User_userID) VALUES
(1, '2025-08-01', 1);

INSERT INTO Timeslot (timeslotID, Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID) VALUES
(1, 1, 8, 4),
(2, 1, 7, 6),
(3, 1, 1, 8),
(4, 1, 7, 8),
(5, 1, 1, 7),
(6, 1, 7, 9),
(7, 1, 1, 4),
(8, 1, 1, 10),
(9, 1, 2, 5),
(10, 1, 2, 5),
(11, 1, 2, 8),
(12, 1, 2, 13),
(13, 1, 2, 12),
(14, 1, 2, 6),
(15, 1, 2, 5),
(16, 1, 2, 8),
(17, 1, 3, 6),
(18, 1, 3, 10),
(19, 1, 3, 11),
(20, 1, 3, 7);


INSERT INTO Tutor_Session (sessionID, Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, Student_System_User_userID, sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating) VALUES
(1, 1, 1, 8, 4, 14, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'Session on Statistics', 5),
(2, 3, 1, 1, 4, 15, '2025-08-01 10:00:00', '2025-08-01 10:50:00', 'Session on Calculus I', 4),
(3, 5, 1, 1, 7, 16, '2025-08-01 12:00:00', '2025-08-01 12:50:00', 'Session on Calculus I', 5),
(4, 7, 1, 1, 4, 17, '2025-08-01 14:00:00', '2025-08-01 14:50:00', 'Session on Calculus I', 4),
(5, 9, 1, 2, 5, 18, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'Session on Calculus II', 4),
(6, 11, 1, 2, 8, 19, '2025-08-01 10:00:00', '2025-08-01 10:50:00', 'Session on Calculus II', 5),
(7, 13, 1, 2, 12, 20, '2025-08-01 12:00:00', '2025-08-01 12:50:00', 'Session on Calculus II', 5),
(8, 15, 1, 2, 5, 21, '2025-08-01 14:00:00', '2025-08-01 14:50:00', 'Session on Calculus II', 3),
(9, 17, 1, 3, 6, 22, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'Session on Calculus III', 4),
(10, 19, 1, 3, 11, 23, '2025-08-01 10:00:00', '2025-08-01 10:50:00', 'Session on Calculus III', 3),
(11, 20, 1, 3, 7, 14, '2025-08-01 12:00:00', '2025-08-01 12:50:00', 'Session on Calculus III', 4),
(12, 18, 1, 3, 10, 15, '2025-08-01 14:00:00', '2025-08-01 14:50:00', 'Session on Calculus III', 4),
(13, 2, 1, 7, 4, 16, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'Session on Art History', 5),
(14, 4, 1, 7, 4, 17, '2025-08-01 10:00:00', '2025-08-01 10:50:00', 'Session on Art History', 4),
(15, 6, 1, 7, 4, 18, '2025-08-01 12:00:00', '2025-08-01 12:50:00', 'Session on Art History', 5);
