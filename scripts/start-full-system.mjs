/**
 * ==============================================================================
 * KHỞI CHẠY FULL HỆ THỐNG TRÊN MÁY LOCAL (WEB APP + AI AGENT + ZALO BOT)
 * ==============================================================================
 * Chạy đồng thời:
 * 1. Web App Vite: http://localhost:5173
 * 2. Zalo Bot Webhook Server: http://localhost:5005
 * ==============================================================================
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n' + '='.repeat(65));
console.log('🚀 ĐANG KHỞI CHẠY FULL HỆ THỐNG MS MANAGEMENT & ZALO BOT...');
console.log('='.repeat(65));

// 1. Khởi chạy Bot Server trên port 5005
const botProcess = spawn('node', ['scripts/zalo-personal-bot.mjs'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

botProcess.on('error', (err) => {
  console.error('❌ Lỗi khởi động Bot Server:', err);
});

// 2. Khởi chạy Vite Dev Server trên port 5173
const viteProcess = spawn('npx', ['vite', '--host'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

viteProcess.on('error', (err) => {
  console.error('❌ Lỗi khởi động Vite App:', err);
});

// Xử lý khi tắt terminal (Ctrl+C)
function cleanup() {
  console.log('\n🛑 Đang dừng hệ thống...');
  try { botProcess.kill(); } catch {}
  try { viteProcess.kill(); } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
