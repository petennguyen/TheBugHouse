This directory contains the SQL scripts to set up a MySQL database for managing tutor sessions, schedules, students, and administrators.

REQUIREMENTS:
Download MySQL from here: https://dev.mysql.com/downloads/installer/
- MySQL Server (version 8.0.43) <----- We can change this if needed, but this version works with the Workbench which made setting this up a lot easier.
- Your operating system
- *** HIGHLY RECOMMEND downloading MySQL Workbench when it prompts you ***

IF USING MySQL Workbench:

1. Starting from application homepage: click '+' sign next to MySQL connections to create a new database. To start just change the connection name to 'BugHouse' and press OK.
2. Once you've created the connection open it and navigate to the Server Tab > Data Import.
3. In the Data Import box, check the 'Import from self-contained file' circle and select the schema.sql file first then click 'Start Import'. Do the same for the views.sql and then data.sql. **Schema must be first**
4. Then go to the 'Navigator' box on the left and click the 'Schema' tab at the bottom. Refresh and the database should be there. You can right click one of the views and click 'Select rows- Limit 1000' to see.