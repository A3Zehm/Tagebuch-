@echo off
rem Startet den Test-Server und oeffnet die App im Browser.
start "" http://localhost:8080
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
