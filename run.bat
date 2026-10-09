@echo off
echo ========================================================
echo  Starting CleanSheet AI (Full-Stack Application)
echo ========================================================
echo.
cd /d "%~dp0backend"
echo Launching CleanSheet AI on http://127.0.0.1:8000 ...
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
