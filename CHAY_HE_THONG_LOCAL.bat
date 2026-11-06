@echo off
chcp 65001 > nul
title Hệ Thống Quản Lý Chấm Công & Tiến Độ + Zalo Bot
echo ==============================================================================
echo        ĐANG KHỞI ĐỘNG FULL HỆ THỐNG MS MANAGEMENT VÀ ZALO BOT
echo ==============================================================================
echo.
echo 1. Web App sẽ chạy tại:     http://localhost:5173
echo 2. Bot Server sẽ chạy tại:    http://localhost:5005
echo.
echo Đang tải... Vui lòng không đóng cửa sổ này!
echo ==============================================================================
echo.

node scripts/start-full-system.mjs
pause
