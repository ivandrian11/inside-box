@echo off
title Inside Studio Launcher
color 0b

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
echo [2/2] Menyalakan Cloudflare Tunnel...
echo       Jendela baru akan terbuka dengan URL publik Anda.
start "Inside Studio Tunnel" cmd /k "cloudflared tunnel --url http://localhost:3847"

echo.
echo ========================================================
echo  SEMUA BERJALAN.
echo  - Jendela 1: Aplikasi Photo Booth (pnpm tauri dev)
echo  - Jendela 2: Cloudflare Tunnel (Jangan ditutup)
echo ========================================================
pause
