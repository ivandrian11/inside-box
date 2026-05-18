@echo off
title Rua Rasa Booth Launcher
color 0e

echo ========================================================
echo        RUA RASA BOOTH - SMART LAUNCHER (SSH TUNNEL)
echo ========================================================
echo.

:: 1. Cek & Setup SSH Key (Auto Generate)
if not exist "%USERPROFILE%\.ssh\id_rsa" (
    echo [SETUP] SSH Key tidak ditemukan. Membuat SSH Key baru...
    if not exist "%USERPROFILE%\.ssh" mkdir "%USERPROFILE%\.ssh"
    ssh-keygen -t rsa -b 4096 -N "" -f "%USERPROFILE%\.ssh\id_rsa"
    echo [SETUP] SSH Key berhasil dibuat.
)

:: 2. Cek Koneksi ke Server (Tanpa Password)
echo [CHECK] Memeriksa koneksi ke Server (rusa@165.101.18.158)...
ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no rusa@165.101.18.158 "echo Connection OK" >nul 2>&1

if %errorlevel% equ 0 goto ssh_ok

echo.
echo [SETUP] Passwordless SSH belum aktif.
echo         Sistem akan mendaftarkan komputer ini ke server.
echo         SILAKAN MASUKKAN PASSWORD VPS 'rusa' SATU KALI SAJA DI BAWAH INI:
echo.

type "%USERPROFILE%\.ssh\id_rsa.pub" | ssh -o StrictHostKeyChecking=no rusa@165.101.18.158 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Gagal mendaftarkan key. Password mungkin salah atau server down.
    echo         Silakan coba jalankan ulang script ini.
    pause
    exit /b
)

echo.
echo [SUCCESS] Passwordless login berhasil diaktifkan!
goto ssh_done

:ssh_ok
echo [CHECK] Koneksi aman (Passwordless ready).

:ssh_done

echo.
echo [1/2] Membuka Aplikasi (Tauri Dev) di latar belakang...
start /B "Rua Rasa App" cmd /c "pnpm tauri dev"

echo.
echo [2/2] Menunggu aplikasi mulai di-build (30 detik)...
timeout /t 30

echo.
echo [3/3] Menyalakan SSH Tunnel Auto-Reconnect...
echo ========================================================
echo  SEMUA PROSES BERJALAN DI JENDELA INI. (JANGAN DITUTUP)
echo ========================================================

:Loop
echo.
echo [TUNNEL] Mencoba menghubungkan SSH Port Forwarding...
ssh -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -N -R 3847:127.0.0.1:3847 rusa@165.101.18.158

echo.
echo [TUNNEL] Koneksi terputus atau port nyangkut!
echo [TUNNEL] Membersihkan (kill) port 3847 di VPS...
ssh -o ConnectTimeout=10 rusa@165.101.18.158 "fuser -k 3847/tcp 2>/dev/null || kill -9 $(lsof -t -i:3847 2>/dev/null) 2>/dev/null || true"

echo [TUNNEL] Menunggu 3 detik sebelum menyambung ulang...
timeout /t 3 /nobreak >nul
goto Loop
