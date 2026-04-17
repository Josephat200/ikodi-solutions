@echo off
REM Stop local PostgreSQL server
echo Stopping PostgreSQL server...
taskkill /IM postgres.exe /F
echo PostgreSQL stopped.
pause
