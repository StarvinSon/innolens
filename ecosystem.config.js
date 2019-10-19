module.exports = {
  apps: [{
    // General
    name: 'innolens-server',
    script: 'out/cli.js',

    // Advanced features
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '100M',
    env: {
      NODE_ENV: 'production'
    },
    env_development: {
      NODE_ENV: 'development'
    },
    source_map_support: true,

    // Log files
    combine_logs: true,

    // Control flow
    max_restarts: 10,
    restart_delay: 100,
    autorestart: true
  }, {
    // General
    name: 'innolens-server-debug',
    script: 'out/cli.js',
    interpreter_args: [
      '--nolazy',
      '--inspect=9229'
    ],

    // Advanced features
    instances: 1,
    exec_mode: 'fork',
    watch: ['out'],
    max_memory_restart: '100M',
    env: {
      NODE_ENV: 'development',
      DEBUG: 'koa*'
    },
    source_map_support: true,

    // Log files
    combine_logs: true,

    // Control flow
    autorestart: false
  }]
};
