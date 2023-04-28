module.exports = {
  apps: [
    {
      name: 'bot',
      script: './build/index.js',
      autorestart: true,
      watch: true,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
