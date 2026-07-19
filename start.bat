@echo off
setlocal enabledelayedexpansion
title BSDesign Live Preview

:: Check if a file was passed as argument
if not "%~1"=="" (
    set "BSFILE=%~1"
    goto :start_server
)

:: No argument - show file picker via PowerShell
echo Select a .bsdesign file...
for /f "usebackq delims=" %%f in (`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Filter = 'Bootstrap Studio Files (*.bsdesign)|*.bsdesign'; $f.Title = 'Select a .bsdesign file'; if ($f.ShowDialog() -eq 'OK') { $f.FileName } else { Write-Output 'CANCEL' }"`) do set "BSFILE=%%f"

if "!BSFILE!"=="CANCEL" (
    echo No file selected. Starting without a file...
    set "BSFILE="
    goto :start_server
)

:start_server
echo.
echo   BSDesign Live Preview
echo   ---------------------
echo.

:: Get the directory of this batch file
cd /d "%~dp0"

:: Start the server
if defined BSFILE (
    echo   File: !BSFILE!
    start "" http://localhost:4400
    node dist\index.js "!BSFILE!"
) else (
    start "" http://localhost:4400
    node dist\index.js
)

pause
