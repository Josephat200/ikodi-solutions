@echo off
REM Initialize PostgreSQL database with required user and database
setlocal enabledelayedexpansion

set PROJECT_ROOT=%~dp0..
set PG_HOME=%PROJECT_ROOT%\.local\pg-runtime

echo Connecting to PostgreSQL on localhost:5432...
echo.
echo Creating ikodi database and user...
echo.

REM Create database and user
"%PG_HOME%\bin\psql.exe" -U postgres -h localhost -p 5432 -c "CREATE DATABASE ikodi_db;" 2>/dev/null
"%PG_HOME%\bin\psql.exe" -U postgres -h localhost -p 5432 -c "CREATE USER ikodi WITH PASSWORD 'ikodi_dev_password';" 2>/dev/null
"%PG_HOME%\bin\psql.exe" -U postgres -h localhost -p 5432 -c "ALTER ROLE ikodi CREATEDB;" 2>/dev/null
"%PG_HOME%\bin\psql.exe" -U postgres -h localhost -p 5432 -c "GRANT ALL PRIVILEGES ON DATABASE ikodi_db TO ikodi;" 2>/dev/null

echo.
echo Database setup complete!
echo You can now run: pnpm run db:push
echo.
pause
