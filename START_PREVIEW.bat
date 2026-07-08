@echo off
title Creative Impact OS - local preview
echo.
echo  Starting Creative Impact OS on http://localhost:3001 ...
echo  Keep this window open while you use it. Close it to stop.
echo.
cd /d C:\dev\creative-impact-os
start "" http://localhost:3001
call npm run dev
pause
