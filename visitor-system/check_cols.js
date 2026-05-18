const { Pool } = require('pg');
const pool = new Pool({ connectionString: "postgresql://postgres:Ravi%408297@localhost:5432/vms" });
async function run() {
    try {
        const res = await pool.query("SELECT * FROM users LIMIT 1");
        console.log(Object.keys(res.rows[0] || {}));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
