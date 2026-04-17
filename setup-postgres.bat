@echo off
REM Complete PostgreSQL setup script for IKODI project
setlocal enabledelayedexpansion

set PROJECT_ROOT=%~dp0..
set PG_HOME=%PROJECT_ROOT%\.local\pg-runtime
set PG_DATA=%PROJECT_ROOT%\.local\postgres-data
set PG_BIN=%PG_HOME%\bin

echo ========================================
echo PostgreSQL Setup for IKODI Project
echo ========================================
echo.

REM Create data directory if it doesn't exist
if not exist "%PG_DATA%" (
    echo [1/4] Creating PostgreSQL data directory...
    mkdir "%PG_DATA%"
    echo       Done.
) else (
    echo [1/4] PostgreSQL data directory already exists
)

echo.
echo [2/4] Initializing PostgreSQL cluster...
"%PG_BIN%\initdb.exe" -D "%PG_DATA%" -U postgres -A trust --encoding=UTF8 -E utf8 --locale=en_US.UTF-8
if %ERRORLEVEL% NEQ 0 (
    echo       ERROR: Failed to initialize database
    pause
    exit /b 1
)
echo       Done.

echo.
echo [3/4] Modifying PostgreSQL configuration...
REM Allow connections from localhost
powershell -Command "(Get-Content '%PG_DATA%\postgresql.conf') -replace '^#listen_addresses', 'listen_addresses' | Set-Content '%PG_DATA%\postgresql.conf'"

echo.
echo [4/4] Starting PostgreSQL server...
start "PostgreSQL - IKODI Project" "%PG_BIN%\postgres.exe" -D "%PG_DATA%" -p 5432
echo       Server started in background window
echo.
echo ========================================
echo PostgreSQL is ready on localhost:5432
echo ========================================
echo.
pause
