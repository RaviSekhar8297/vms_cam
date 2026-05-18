const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Ravi%408297@localhost:5432/vms' });
pool.query(`SELECT id, name, email, role, password, emp_id, is_active FROM users`)
    .then(r => console.log('USERS:', r.rows))
    .catch(console.error)
    .then(() => process.exit());
