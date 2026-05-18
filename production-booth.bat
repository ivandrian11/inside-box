@echo off
title Rua Rasa Booth Production Launcher
color 0b

echo ========================================================
echo        RUA RASA BOOTH - PRODUCTION LAUNCHER
echo ========================================================
echo.

echo [1/3] Menjalankan Aplikasi Build...
start "Rua Rasa App" "src-tauri\target\release\ruarasa-booth.exe"

echo.
echo [2/3] Menunggu aplikasi siap (5 detik)...
timeout /t 5

echo.
echo [3/3] Menyalakan SSH Tunnel...
echo       Jendela baru akan terbuka.
echo       Silakan masukkan password VPS 'rusa' di jendela tersebut jika diminta.
start "Rua Rasa Tunnel" cmd /c "ssh -o ServerAliveInterval=60 -N -R 3847:127.0.0.1:3847 rusa@165.101.18.158 && pause"

echo.
echo ========================================================
echo  SEMUA BERJALAN.
echo  - Jendela 1: Aplikasi Tauri
echo  - Jendela 2: SSH Tunnel (Jangan ditutup)
echo ========================================================
pause
