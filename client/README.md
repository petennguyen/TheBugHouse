 

run both client/app.js and server/server.js together


Service use for sending verification link: firebase 

download mysql on machine

database password: bughouse123

link schema.sql with database
mysql -u root -p BugHouse < Path: \BugHouse\TheBugHouse\database\sql\schema.sql

Import data
mysql -u root -p BugHouse <  path: \BugHouse\TheBugHouse\database\sql\data.sql



test: http://localhost:8000/test-db
should be {"message":"Database connected successfully!"}"





# new server/.env file (for dockerfile 8/28)
DB_HOST=db
DB_PORT=3306
DB_USER=appuser
DB_PASS=bughouse123
DB_NAME=BugHouse

# Dockerfile instructions:
1/ install docker:
https://www.docker.com/products/docker-desktop

2/ verify install:
docker --version

3/ open docker

4/ *might need to verify if schema/data is imported (this works for me on MAC OS)
docker compose exec -T db sh -c 'mysql -uroot -p"bughouse123" BugHouse' < database/sql/schema.sql\n
docker compose exec -T db sh -c 'mysql -uroot -p"bughouse123" BugHouse' < database/sql/data.sql
verify properly imported:
docker compose exec db mysql -uroot -p"bughouse123" -e "SHOW TABLES IN BugHouse\G"


or open shell inside the container to import schema/data (Windows method)
docker compose exec db sh
mysql -uroot -p"bughouse123" BugHouse < /docker-entrypoint-initdb.d/schema.sql
mysql -uroot -p"bughouse123" BugHouse < /docker-entrypoint-initdb.d/data.sql
verify:
docker compose exec db mysql -uroot -p"bughouse123" -e "SELECT * FROM BugHouse.System_User LIMIT 5;"

After Docker is running, from repo root run:
docker compose up --build -d


visit http://localhost:3000/login
and web should be running





*if error on connecting http://localhost:8000/test-db
try creating/checking a database user and its privileges so the server can connect safely:
# from repo root
docker compose exec db mysql -uroot -p'bughouse123' -e "\
CREATE USER IF NOT EXISTS 'appuser'@'%' IDENTIFIED BY 'bughouse123'; \
CREATE USER IF NOT EXISTS 'appuser'@'localhost' IDENTIFIED BY 'bughouse123'; \
GRANT ALL PRIVILEGES ON BugHouse.* TO 'appuser'@'%'; \
GRANT ALL PRIVILEGES ON BugHouse.* TO 'appuser'@'localhost'; \
FLUSH PRIVILEGES;"

verify user & grants:
docker compose exec db mysql -uroot -p'bughouse123' -e "SELECT User,Host FROM mysql.user WHERE User='appuser'; SHOW GRANTS FOR 'appuser'@'%';"




# reset docker desktop
kill docker:
pkill -f Docker || true

