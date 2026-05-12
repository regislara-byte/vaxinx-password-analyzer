@echo off
title VAXINX Password Analyzer UI Git Push

echo.
echo ================================
echo      VAXINX QUICK PUSH
echo ================================
echo.

git add .

set /p msg=Enter commit message: 
git commit -m "%msg%"

git push

echo.
echo Push complete.
pause