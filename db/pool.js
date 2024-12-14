const { Pool } = require('pg');

// const pool = new Pool({
//   user: 'Proxgytest',
//   host: 'localhost',
//   database: 'task',
//   password: 'ProxgyTest',
//   port: 5432,
// });

const pool = new Pool({
    user: 'task_tx6n_user',
    host: 'dpg-ctem40lds78s73dgs8vg-a.oregon-postgres.render.com', // Correct hostname
    database: 'task_tx6n',
    password: '5RHWFKuxu5ZjkQCVf14reVI1jbmnSoRY',
    port: 5432,
    ssl: {
        rejectUnauthorized: false,
      },
  });

module.exports = pool;


