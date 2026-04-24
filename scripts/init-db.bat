@echo off
REM Initialize PostgreSQL database with required user and database
setlocal enabledelayedexpansion

set PROJECT_ROOT=%~dp0..
set PG_HOME=%PROJECT_ROOT%\.local\pg-runtime
set PSQL=%PG_HOME%\bin\psql.exe

if not exist "%PSQL%" (
	echo ERROR: psql.exe was not found at "%PSQL%"
	exit /b 1
)

echo Connecting to PostgreSQL on localhost:5432...
echo.
echo Creating ikodi database and user...
echo.

REM Create database and user
"%PSQL%" -U postgres -h localhost -p 5432 -d postgres -c "CREATE USER ikodi WITH PASSWORD 'ikodi_dev_password';" >nul 2>&1
"%PSQL%" -U postgres -h localhost -p 5432 -d postgres -c "ALTER ROLE ikodi CREATEDB;" >nul 2>&1
"%PSQL%" -U postgres -h localhost -p 5432 -d postgres -c "CREATE DATABASE ikodi_db OWNER ikodi;" >nul 2>&1
"%PSQL%" -U postgres -h localhost -p 5432 -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE ikodi_db TO ikodi;" >nul 2>&1

echo.
echo Database setup complete!
echo You can now run: pnpm run db:push
echo.
exit /b 0
