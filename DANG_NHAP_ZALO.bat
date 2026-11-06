@echo off
chcp 65001 > nul
title Đăng Nhập Zalo Cho AI Bot - MS Management
echo ==============================================================================
echo                 ĐĂNG NHẬP ZALO CỐ ĐỊNH CHO AI AGENT BOT
echo ==============================================================================
echo.
echo 1. Bot Server đang khởi động tại cổng 5005...
echo 2. Trình duyệt sẽ tự động mở trang quét mã QR tại: http://localhost:5005/qr
echo.
echo * LƯU Ý: Bạn chỉ cần quét mã QR 1 LẦN DUY NHẤT! 
echo   Phiên đăng nhập sẽ được lưu vĩnh viễn vào file zalo-appstate.json.
echo ==============================================================================
echo.

start http://localhost:5005/qr
node scripts/zalo-personal-bot.mjs
pause
