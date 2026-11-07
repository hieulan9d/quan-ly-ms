@echo off
chcp 65001 > nul
title Triển Khai MS Management ^& Zalo AI Bot Trên VPS Windows
echo ==============================================================================
echo        TRIỂN KHAI HỆ THỐNG MS MANAGEMENT ^& ZALO BOT LÊN VPS WINDOWS
echo ==============================================================================
echo.

if not exist logs mkdir logs

echo 1. Đang cài đặt thư viện...
call npm install

echo 2. Đang build Web App production...
call npm run build

echo 3. Đang cài đặt PM2...
call npm install -g pm2

echo 4. Khởi động 24/7 bằng PM2...
call pm2 delete ms-management-app 2>nul
call pm2 start ecosystem.config.cjs
call pm2 save

echo.
echo ==============================================================================
echo 🎉 HỆ THỐNG ĐÃ KHỞI CHẠY THÀNH CÔNG 24/7 TRÊN VPS!
echo 🌐 Truy cập: http://localhost:5005
echo 📊 Lệnh quản lý: pm2 status  hoặc  pm2 logs
echo ==============================================================================
pause
