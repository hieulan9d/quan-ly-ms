/**
 * ==============================================================================
 * CẤU HÌNH PM2 CHẠY 24/7 TRÊN VPS CHO MS MANAGEMENT & ZALO AI BOT
 * ==============================================================================
 * Sử dụng:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 * ==============================================================================
 */

module.exports = {
  apps: [
    {
      name: 'ms-management-app',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 5005,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
    },
  ],
};
