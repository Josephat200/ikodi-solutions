@echo off
REM Start local PostgreSQL from project folder
setlocal enabledelayedexpansion

set PROJECT_ROOT=%~dp0..
set PG_HOME=%PROJECT_ROOT%\.local\pg-runtime
set PG_DATA=%PROJECT_ROOT%\.local\postgres-data
set PG_LOG=%PROJECT_ROOT%\.local\postgres.log
set PG_BIN=%PG_HOME%\bin

REM Create data directory if it doesn't exist
if not exist "%PG_DATA%" (
    echo Creating PostgreSQL data directory...
    mkdir "%PG_DATA%"
    echo Initializing database...
    "%PG_BIN%\initdb.exe" -D "%PG_DATA%" -U postgres -A trust --encoding=UTF8 -E utf8 --locale=en_US.UTF-8
)

echo.
echo Starting PostgreSQL server...
echo Data directory: %PG_DATA%
echo Log file: %PG_LOG%
echo.

tasklist /FI "IMAGENAME eq postgres.exe" | find /I "postgres.exe" >nul
if %ERRORLEVEL% EQU 0 (
    echo PostgreSQL already appears to be running.
    exit /b 0
)

start "PostgreSQL Server" "%PG_BIN%\postgres.exe" -D "%PG_DATA%" -p 5432 > "%PG_LOG%" 2>&1
echo PostgreSQL started in background on localhost:5432

exit /b 0
