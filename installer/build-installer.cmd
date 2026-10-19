@echo off
setlocal EnableExtensions
 title Pantheon Realms - build the Windows installer
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-installer.ps1" %*
set "BUILD_EXIT=%ERRORLEVEL%"
if /i not "%~1"=="--no-pause" if /i not "%~2"=="--no-pause" pause
exit /b %BUILD_EXIT%
