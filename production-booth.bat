@echo off
title Inside Studio Launcher
color 0b

if exist .env for /f "eol=# tokens=*" %%i in (.env) do set %%i
if "%VITE_BACKEND_PORT%"=="" set VITE_BACKEND_PORT=3847

echo ========================================================
echo        INSIDE STUDIO - LAUNCHER
echo ========================================================
echo.

echo [1/2] Menjalankan Aplikasi (Development Mode)...
start "Inside Studio App" cmd /k "pnpm tauri dev"

echo.
echo Menunggu aplikasi siap (3 detik)...
timeout /t 3

echo.
echo [2/2] Menyalakan SSH Tunnel ke VPS (Statis)...
echo       Menghubungkan port lokal %VITE_BACKEND_PORT% ke port 3847 di VPS ivan@165.101.18.20
start "Inside Studio SSH Tunnel" cmd /k "ssh -o ServerAliveInterval=60 -N -R 3847:127.0.0.1:%VITE_BACKEND_PORT% ivan@165.101.18.20"

echo.
echo ========================================================
echo  SEMUA BERJALAN.
echo  - Jendela 1: Aplikasi Photo Booth (pnpm tauri dev)
echo  - Jendela 2: SSH Tunnel ke VPS (Jangan ditutup)
echo ========================================================
pause
