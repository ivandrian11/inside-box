@echo off
title Rua Rasa Booth Launcher
color 0e

echo ========================================================
echo        RUA RASA BOOTH - LAUNCHER (SSH TUNNEL)
echo ========================================================
echo.

echo [1/2] Membuka Aplikasi (Tauri Dev)...
start "Rua Rasa App" cmd /k "pnpm tauri dev"

echo.
echo [2/2] Menunggu aplikasi siap (15 detik)...
echo       Harap tunggu sampai aplikasi GUI muncul sepenuhnya...
timeout /t 15

echo.
echo [3/3] Menyalakan SSH Tunnel...
echo       Jendela baru akan terbuka.
echo       Silakan masukkan password VPS 'rusa' di jendela tersebut jika diminta.
start "Rua Rasa Tunnel" cmd /c "ssh -o ServerAliveInterval=60 -N -R 3847:127.0.0.1:3847 rusa@165.101.18.158 && pause"

echo.
echo ========================================================
echo  SEMUA BERJALAN.
echo  - Jendela 1: Aplikasi Tauri (Jangan ditutup)
echo  - Jendela 2: SSH Tunnel (Jangan ditutup)
echo ========================================================
pause
