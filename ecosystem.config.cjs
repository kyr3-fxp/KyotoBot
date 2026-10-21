module.exports = {
  apps: [
    {
      name: 'Kyoto',
      script: './src/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
