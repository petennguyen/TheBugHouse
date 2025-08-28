 

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





Dockerfile instructions:
install docker
https://www.docker.com/products/docker-desktop

verify install:
docker --version


*might need to verify if schema/data is imported
docker compose exec -T db sh -c 'mysql -uroot -p"bughouse123" BugHouse' < database/sql/schema.sql\n
docker compose exec -T db sh -c 'mysql -uroot -p"bughouse123" BugHouse' < database/sql/data.sql
verify properly imported:
docker compose exec db mysql -uroot -p"bughouse123" -e "SHOW TABLES IN BugHouse\G"


After Docker is running, from repo root run:
docker compose up --build -d


visit http://localhost:3000/login
and web should be running




kill docker:
pkill -f Docker || true



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


**new server/.env file:
DB_HOST=db
DB_PORT=3306
DB_USER=appuser
DB_PASS=bughouse123
DB_NAME=BugHouse