SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema BugHouse
-- -----------------------------------------------------
DROP SCHEMA IF EXISTS `BugHouse` ;

-- -----------------------------------------------------
-- Schema BugHouse
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `BugHouse` DEFAULT CHARACTER SET utf8 ;
USE `BugHouse` ;

-- -----------------------------------------------------
-- Table `BugHouse`.`System_User`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `BugHouse`.`System_User` ;

CREATE TABLE IF NOT EXISTS `BugHouse`.`System_User` (
  `userID` INT NOT NULL AUTO_INCREMENT,
  `userFirstName` VARCHAR(50) NOT NULL,
  `userLastName` VARCHAR(50) NOT NULL,
  `userEmail` VARCHAR(255) NOT NULL,
  `userPassword` VARCHAR(255) NOT NULL,
  `userRole` ENUM('Admin', 'Tutor', 'Student') NOT NULL,
  `firebaseUID` VARCHAR(128),
  PRIMARY KEY (`userID`),
  UNIQUE INDEX `userEmail_UNIQUE` (`userEmail` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `BugHouse`.`Administrator`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `BugHouse`.`Administrator` ;

CREATE TABLE IF NOT EXISTS `BugHouse`.`Administrator` (
  `System_User_userID` INT NOT NULL,
  `accessLevel` INT NOT NULL,
  PRIMARY KEY (`System_User_userID`),
  CONSTRAINT `fk_Administrator_System_User1`
    FOREIGN KEY (`System_User_userID`)
    REFERENCES `BugHouse`.`System_User` (`userID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `BugHouse`.`Student`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `BugHouse`.`Student` ;

CREATE TABLE IF NOT EXISTS `BugHouse`.`Student` (
  `System_User_userID` INT NOT NULL,
  `studentIDCard` VARCHAR(255) NULL,
  `studentLearningGoals` VARCHAR(255) NULL,
  PRIMARY KEY (`System_User_userID`),
  CONSTRAINT `fk_Student_System_User1`
    FOREIGN KEY (`System_User_userID`)
    REFERENCES `BugHouse`.`System_User` (`userID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `BugHouse`.`Tutor`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `BugHouse`.`Tutor` ;

CREATE TABLE IF NOT EXISTS `BugHouse`.`Tutor` (
  `System_User_userID` INT NOT NULL,
  `tutorBiography` VARCHAR(255) NULL,
  `tutorQualifications` VARCHAR(255) NULL,
  PRIMARY KEY (`System_User_userID`),
  CONSTRAINT `fk_Tutor_System_User1`
    FOREIGN KEY (`System_User_userID`)
    REFERENCES `BugHouse`.`System_User` (`userID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `BugHouse`.`Daily_Schedule`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `BugHouse`.`Daily_Schedule` ;

CREATE TABLE IF NOT EXISTS `BugHouse`.`Daily_Schedule` (
  `scheduleID` INT NOT NULL,
  `Administrator_System_User_userID` INT NOT NULL,
  `scheduleDate` DATE NOT NULL,
  PRIMARY KEY (`scheduleID`),
  INDEX `fk_Daily_Schedule_Administrator1_idx` (`Administrator_System_User_userID` ASC) VISIBLE,
  CONSTRAINT `fk_Daily_Schedule_Administrator1`
    FOREIGN KEY (`Administrator_System_User_userID`)
    REFERENCES `BugHouse`.`Administrator` (`System_User_userID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `BugHouse`.`Academic_Subject`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `BugHouse`.`Academic_Subject` ;

CREATE TABLE IF NOT EXISTS `BugHouse`.`Academic_Subject` (
  `subjectID` INT NOT NULL AUTO_INCREMENT,
  `subjectName` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`subjectID`),
  UNIQUE INDEX `subjectName_UNIQUE` (`subjectName` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `BugHouse`.`Timeslot`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `BugHouse`.`Timeslot` ;

CREATE TABLE IF NOT EXISTS `BugHouse`.`Timeslot` (
  `timeslotID` INT NOT NULL,
  `Daily_Schedule_scheduleID` INT NOT NULL,
  `Academic_Subject_subjectID` INT NOT NULL,
  `Tutor_System_User_userID` INT NOT NULL,
  PRIMARY KEY (`timeslotID`, `Daily_Schedule_scheduleID`),
  INDEX `fk_Timeslot_Schedule1_idx` (`Daily_Schedule_scheduleID` ASC) VISIBLE,
  INDEX `fk_Timeslot_Academic_Subject1_idx` (`Academic_Subject_subjectID` ASC) VISIBLE,
  INDEX `fk_Timeslot_Tutor1_idx` (`Tutor_System_User_userID` ASC) VISIBLE,
  CONSTRAINT `fk_Timeslot_Schedule1`
    FOREIGN KEY (`Daily_Schedule_scheduleID`)
    REFERENCES `BugHouse`.`Daily_Schedule` (`scheduleID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Timeslot_Academic_Subject1`
    FOREIGN KEY (`Academic_Subject_subjectID`)
    REFERENCES `BugHouse`.`Academic_Subject` (`subjectID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Timeslot_Tutor1`
    FOREIGN KEY (`Tutor_System_User_userID`)
    REFERENCES `BugHouse`.`Tutor` (`System_User_userID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `BugHouse`.`Tutor_Session`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `BugHouse`.`Tutor_Session` ;

CREATE TABLE IF NOT EXISTS `BugHouse`.`Tutor_Session` (
  `sessionID` INT NOT NULL,
  `Timeslot_timeslotID` INT NOT NULL,
  `Timeslot_Daily_Schedule_scheduleID` INT NOT NULL,
  `Academic_Subject_subjectID` INT NOT NULL,
  `Tutor_System_User_userID` INT NOT NULL,
  `Student_System_User_userID` INT NOT NULL,
  `sessionSignInTime` DATETIME(3) NULL,
  `sessionSignOutTime` DATETIME(3) NULL,
  `sessionFeedback` VARCHAR(255) NULL,
  `sessionRating` INT NULL,
  PRIMARY KEY (`sessionID`, `Timeslot_timeslotID`, `Timeslot_Daily_Schedule_scheduleID`),
  INDEX `fk_Session_Timeslot1_idx` (`Timeslot_timeslotID` ASC, `Timeslot_Daily_Schedule_scheduleID` ASC) VISIBLE,
  INDEX `fk_Tutor_Session_Tutor1_idx` (`Tutor_System_User_userID` ASC) VISIBLE,
  INDEX `fk_Tutor_Session_Student1_idx` (`Student_System_User_userID` ASC) VISIBLE,
  INDEX `fk_Tutor_Session_Academic_Subject1_idx` (`Academic_Subject_subjectID` ASC) VISIBLE,
  CONSTRAINT `fk_Session_Timeslot1`
    FOREIGN KEY (`Timeslot_timeslotID` , `Timeslot_Daily_Schedule_scheduleID`)
    REFERENCES `BugHouse`.`Timeslot` (`timeslotID` , `Daily_Schedule_scheduleID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Tutor_Session_Tutor1`
    FOREIGN KEY (`Tutor_System_User_userID`)
    REFERENCES `BugHouse`.`Tutor` (`System_User_userID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Tutor_Session_Student1`
    FOREIGN KEY (`Student_System_User_userID`)
    REFERENCES `BugHouse`.`Student` (`System_User_userID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Tutor_Session_Academic_Subject1`
    FOREIGN KEY (`Academic_Subject_subjectID`)
    REFERENCES `BugHouse`.`Academic_Subject` (`subjectID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `BugHouse`.`Tutor_Availability`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `BugHouse`.`Tutor_Availability` ;

CREATE TABLE IF NOT EXISTS `BugHouse`.`Tutor_Availability` (
  `availabilityID` INT NOT NULL AUTO_INCREMENT,
  `Tutor_System_User_userID` INT NOT NULL,
  `dayOfWeek` ENUM('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun') NOT NULL,
  `startTime` TIME NOT NULL,
  `endTime` TIME NOT NULL,
  PRIMARY KEY (`availabilityID`, `Tutor_System_User_userID`),
  INDEX `fk_Tutor_Availability_Tutor1_idx` (`Tutor_System_User_userID` ASC) VISIBLE,
  CONSTRAINT `fk_Tutor_Availability_Tutor1`
    FOREIGN KEY (`Tutor_System_User_userID`)
    REFERENCES `BugHouse`.`Tutor` (`System_User_userID`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
