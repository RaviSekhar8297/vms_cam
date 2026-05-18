const { Pool } = require('pg');
const pool = new Pool({ connectionString: "postgresql://postgres:Ravi%408297@localhost:5432/vms" });
async function run() {
    try {
        const res = await pool.query("SELECT * FROM users LIMIT 1");
        console.log("COLUMNS:", Object.keys(res.rows[0] || {}));
        const res2 = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users'");
        console.log("SCHEMA:", JSON.stringify(res2.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
