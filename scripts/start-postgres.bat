@echo off
REM Start local PostgreSQL from project folder
setlocal enabledelayedexpansion

set PROJECT_ROOT=%~dp0..
set PG_HOME=%PROJECT_ROOT%\.local\pg-runtime
set PG_DATA=%PROJECT_ROOT%\.local\pgdata
set PG_LOG=%PROJECT_ROOT%\.local\postgres.log

REM Create pgdata directory if it doesn't exist
if not exist "%PG_DATA%" (
    echo Creating PostgreSQL data directory...
    mkdir "%PG_DATA%"
    echo Initializing database...
    "%PG_HOME%\bin\initdb.exe" -D "%PG_DATA%" -U ikodi -W --locale=en_US.UTF-8
)

echo.
echo Starting PostgreSQL server...
echo Data directory: %PG_DATA%
echo Log file: %PG_LOG%
echo.

"%PG_HOME%\bin\postgres.exe" -D "%PG_DATA%" -p 5432 > "%PG_LOG%" 2>&1

REM If you want to run in background, use this instead (requires a separate kill-postgres.bat):
REM start "PostgreSQL Server" "%PG_HOME%\bin\postgres.exe" -D "%PG_DATA%" -p 5432
REM echo PostgreSQL started in background. Use kill-postgres.bat to stop it.

pause
