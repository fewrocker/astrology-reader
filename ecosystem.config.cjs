module.exports = {
  apps: [
    {
      name: 'astrology-reader',
      script: 'start-server.sh',
      interpreter: 'bash',
      cwd: '/projects/astrology-reader',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: '5173',
      },
    },
  ],
};
