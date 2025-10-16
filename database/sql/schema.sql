-- ======================================================================
-- BugHouse schema (fixed)
-- ======================================================================
SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

DROP SCHEMA IF EXISTS `BugHouse`;
CREATE SCHEMA IF NOT EXISTS `BugHouse` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `BugHouse`;

-- ----------------------------------------------------------------------
-- Users
-- ----------------------------------------------------------------------
DROP TABLE IF EXISTS `System_User`;
CREATE TABLE `System_User` (
  `userID` INT NOT NULL AUTO_INCREMENT,
  `userFirstName` VARCHAR(50) NOT NULL,
  `userLastName`  VARCHAR(50) NOT NULL,
  `userEmail`     VARCHAR(255) NOT NULL,
  `userPassword`  VARCHAR(255) NOT NULL,
  `userRole`      ENUM('Admin','Tutor','Student') NOT NULL,
  `firebaseUID`   VARCHAR(128) NULL,

  `bio` TEXT,
  `profilePicture` TEXT,
  `specialties` JSON,
  `experience` TEXT,

  PRIMARY KEY (`userID`),
  UNIQUE KEY `userEmail_UNIQUE` (`userEmail`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------
-- Role tables
-- ----------------------------------------------------------------------
DROP TABLE IF EXISTS `Administrator`;
CREATE TABLE `Administrator` (
  `System_User_userID` INT NOT NULL,
  `accessLevel` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`System_User_userID`),
  CONSTRAINT `fk_Admin_User`
    FOREIGN KEY (`System_User_userID`) REFERENCES `System_User`(`userID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Student`;
CREATE TABLE `Student` (
  `System_User_userID` INT NOT NULL,
  `studentIDCard` VARCHAR(255) NULL,
  `studentLearningGoals` VARCHAR(255) NULL,
  PRIMARY KEY (`System_User_userID`),
  CONSTRAINT `fk_Student_User`
    FOREIGN KEY (`System_User_userID`) REFERENCES `System_User`(`userID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Tutor`;
CREATE TABLE `Tutor` (
  `System_User_userID` INT NOT NULL,
  `tutorBiography` VARCHAR(255) NULL,
  `tutorQualifications` VARCHAR(255) NULL,
  PRIMARY KEY (`System_User_userID`),
  CONSTRAINT `fk_Tutor_User`
    FOREIGN KEY (`System_User_userID`) REFERENCES `System_User`(`userID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------
-- Scheduling
-- ----------------------------------------------------------------------
DROP TABLE IF EXISTS `Daily_Schedule`;
CREATE TABLE `Daily_Schedule` (
  `scheduleID` INT NOT NULL AUTO_INCREMENT,
  `Administrator_System_User_userID` INT NOT NULL,
  `scheduleDate` DATE NOT NULL,
  PRIMARY KEY (`scheduleID`),
  KEY `idx_DailySchedule_Admin` (`Administrator_System_User_userID`),
  CONSTRAINT `fk_DailySchedule_Admin`
    FOREIGN KEY (`Administrator_System_User_userID`)
    REFERENCES `Administrator`(`System_User_userID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Academic_Subject`;
CREATE TABLE `Academic_Subject` (
  `subjectID` INT NOT NULL AUTO_INCREMENT,
  `subjectName` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`subjectID`),
  UNIQUE KEY `subjectName_UNIQUE` (`subjectName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Timeslot`;
CREATE TABLE `Timeslot` (
  `timeslotID` INT NOT NULL AUTO_INCREMENT,
  `Daily_Schedule_scheduleID` INT NOT NULL,
  `Academic_Subject_subjectID` INT NOT NULL,
  `Tutor_System_User_userID` INT NOT NULL,
  `timeslotStartTime` TIME NOT NULL,
  `timeslotEndTime` TIME NOT NULL,
  PRIMARY KEY (`timeslotID`, `Daily_Schedule_scheduleID`),
  KEY `idx_Timeslot_Schedule` (`Daily_Schedule_scheduleID`),
  KEY `idx_Timeslot_Subject` (`Academic_Subject_subjectID`),
  KEY `idx_Timeslot_Tutor`   (`Tutor_System_User_userID`),
  CONSTRAINT `fk_Timeslot_Schedule`
    FOREIGN KEY (`Daily_Schedule_scheduleID`)
    REFERENCES `Daily_Schedule`(`scheduleID`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_Timeslot_Subject`
    FOREIGN KEY (`Academic_Subject_subjectID`)
    REFERENCES `Academic_Subject`(`subjectID`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_Timeslot_Tutor`
    FOREIGN KEY (`Tutor_System_User_userID`)
    REFERENCES `Tutor`(`System_User_userID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Tutor_Session`;
CREATE TABLE `Tutor_Session` (
  `sessionID` INT NOT NULL AUTO_INCREMENT,
  `Timeslot_timeslotID` INT NOT NULL,
  `Timeslot_Daily_Schedule_scheduleID` INT NOT NULL,
  `Academic_Subject_subjectID` INT NOT NULL,
  `Tutor_System_User_userID` INT NOT NULL,
  `Student_System_User_userID` INT NOT NULL,
  `sessionSignInTime`  DATETIME(3) NULL,
  `sessionSignOutTime` DATETIME(3) NULL,
  `sessionFeedback`    VARCHAR(255) NULL,
  `sessionRating`      INT NULL,
  PRIMARY KEY (`sessionID`, `Timeslot_timeslotID`, `Timeslot_Daily_Schedule_scheduleID`),
  KEY `idx_Session_Timeslot` (`Timeslot_timeslotID`,`Timeslot_Daily_Schedule_scheduleID`),
  KEY `idx_Session_Tutor` (`Tutor_System_User_userID`),
  KEY `idx_Session_Student` (`Student_System_User_userID`),
  KEY `idx_Session_Subject` (`Academic_Subject_subjectID`),
  CONSTRAINT `fk_Session_Timeslot`
    FOREIGN KEY (`Timeslot_timeslotID`,`Timeslot_Daily_Schedule_scheduleID`)
    REFERENCES `Timeslot`(`timeslotID`,`Daily_Schedule_scheduleID`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_Session_Tutor`
    FOREIGN KEY (`Tutor_System_User_userID`)
    REFERENCES `Tutor`(`System_User_userID`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_Session_Student`
    FOREIGN KEY (`Student_System_User_userID`)
    REFERENCES `Student`(`System_User_userID`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_Session_Subject`
    FOREIGN KEY (`Academic_Subject_subjectID`)
    REFERENCES `Academic_Subject`(`subjectID`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Tutor_Availability`;
CREATE TABLE `Tutor_Availability` (
  `availabilityID` INT NOT NULL AUTO_INCREMENT,
  `Tutor_System_User_userID` INT NOT NULL,
  `dayOfWeek` ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
  `startTime` TIME NOT NULL,
  `endTime`   TIME NOT NULL,
  PRIMARY KEY (`availabilityID`),
  KEY `idx_Availability_Tutor` (`Tutor_System_User_userID`),
  -- Unique per tutor+day (so your upsert by day works)
  CONSTRAINT `fk_Availability_Tutor`
    FOREIGN KEY (`Tutor_System_User_userID`)
    REFERENCES `Tutor`(`System_User_userID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
