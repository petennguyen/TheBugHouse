SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema BugHouse
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema BugHouse
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `BugHouse` DEFAULT CHARACTER SET utf8 ;
USE `BugHouse` ;
USE `BugHouse` ;

-- -----------------------------------------------------
-- View `BugHouse`.`student_session_count`
-- -----------------------------------------------------
USE `BugHouse`;
CREATE  OR REPLACE VIEW `student_session_count` AS
SELECT
    su.userID,
    su.userFirstName,
    su.userLastName,
    COUNT(ts.sessionID) AS session_count
FROM
    System_User su
JOIN 
	Student s ON s.System_User_userID = su.userID
LEFT JOIN 
	Tutor_Session ts ON ts.Student_System_User_userID = su.userID
WHERE
    su.userRole = 'Student'
GROUP BY
    su.userID, su.userFirstName, su.userLastName;

-- -----------------------------------------------------
-- View `BugHouse`.`tutor_session_count`
-- -----------------------------------------------------
USE `BugHouse`;
CREATE  OR REPLACE VIEW `tutor_session_count` AS
SELECT
    su.userID,
    su.userFirstName,
    su.userLastName,
    COUNT(ts.sessionID) AS session_count
FROM
    System_User su
JOIN 
	Tutor t ON t.System_User_userID = su.userID
LEFT JOIN 
	Tutor_Session ts ON ts.Tutor_System_User_userID = su.userID
WHERE
    su.userRole = 'Tutor'
GROUP BY
    su.userID, su.userFirstName, su.userLastName;

-- -----------------------------------------------------
-- View `BugHouse`.`tutor_average_ratings`
-- -----------------------------------------------------
USE `BugHouse`;
CREATE  OR REPLACE VIEW `tutor_average_ratings` AS
SELECT
    su.userID,
    su.userFirstName,
    su.userLastName,
    AVG(ts.sessionRating) AS avg_session_rating
FROM
    System_User su
JOIN 
	Tutor t ON t.System_User_userID = su.userID
LEFT JOIN 
	Tutor_Session ts ON ts.Tutor_System_User_userID = su.userID
WHERE
    su.userRole = 'Tutor'
GROUP BY
    su.userID, su.userFirstName, su.userLastName;

-- -----------------------------------------------------
-- View `BugHouse`.`view_schedule`
-- -----------------------------------------------------
USE `BugHouse`;
CREATE  OR REPLACE VIEW `view_schedule` AS
SELECT 
    su_student.userFirstName AS studentFirstName,
    su_student.userLastName AS studentLastName,
    su_tutor.userFirstName AS tutorFirstName,
    su_tutor.userLastName AS tutorLastName,

    ts.timeslotID,
    ds.scheduleID,
    ds.scheduleDate,
    subj.subjectID,
    subj.subjectName,

    sess.sessionID,
    sess.sessionSignInTime,
    sess.sessionSignOutTime
FROM 
    Timeslot ts
JOIN 
    Daily_Schedule ds ON ts.Daily_Schedule_scheduleID = ds.scheduleID
JOIN 
    Academic_Subject subj ON ts.Academic_Subject_subjectID = subj.subjectID

JOIN 
    Tutor t ON ts.Tutor_System_User_userID = t.System_User_userID
JOIN 
    System_User su_tutor ON t.System_User_userID = su_tutor.userID

LEFT JOIN 
    Tutor_Session sess ON ts.timeslotID = sess.Timeslot_timeslotID AND ts.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
LEFT JOIN 
    Student s ON sess.Student_System_User_userID = s.System_User_userID
LEFT JOIN 
    System_User su_student ON s.System_User_userID = su_student.userID;

-- -----------------------------------------------------
-- View `BugHouse`.`tutor_view_availability`
-- -----------------------------------------------------
USE `BugHouse`;
CREATE  OR REPLACE VIEW `tutor_view_availability` AS
SELECT
    su.userID,
    su.userFirstName,
    su.userLastName,
    ta.dayOfWeek,
    ta.startTime,
    ta.endTime
FROM
    Tutor t
JOIN 
	System_User su ON t.System_User_userID = su.userID
JOIN 
	Tutor_Availability ta ON ta.Tutor_System_User_userID = t.System_User_userID;

-- -----------------------------------------------------
-- View `BugHouse`.`view_available_timeslots`
-- -----------------------------------------------------
USE `BugHouse`;
CREATE  OR REPLACE VIEW `view_available_timeslots` AS
SELECT 
    su_tutor.userID AS tutorID,
    su_tutor.userFirstName AS tutorFirstName,
    su_tutor.userLastName AS tutorLastName,

    ts.timeslotID,
    sched.scheduleID,
    sched.scheduleDate,
    subj.subjectID,
    subj.subjectName,

    sess.sessionID,
    sess.sessionSignInTime,
    sess.sessionSignOutTime,

    su_student.userFirstName AS studentFirstName,
    su_student.userLastName AS studentLastName

FROM 
    Timeslot ts
JOIN 
	Tutor t ON ts.Tutor_System_User_userID = t.System_User_userID
JOIN 
	System_User su_tutor ON t.System_User_userID = su_tutor.userID

JOIN 
	Daily_Schedule sched ON ts.Daily_Schedule_scheduleID = sched.scheduleID
JOIN 
	Academic_Subject subj ON ts.Academic_Subject_subjectID = subj.subjectID

LEFT JOIN 
	Tutor_Session sess ON ts.timeslotID = sess.Timeslot_timeslotID AND ts.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID

LEFT JOIN 
	Student s ON sess.Student_System_User_userID = s.System_User_userID
LEFT JOIN 
	System_User su_student ON s.System_User_userID = su_student.userID

WHERE sess.sessionID IS NULL;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
