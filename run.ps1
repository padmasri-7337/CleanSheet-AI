Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting CleanSheet AI (Full-Stack Application) " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\backend"
Write-Host "Application is live at: http://127.0.0.1:8000" -ForegroundColor Yellow
& .\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
