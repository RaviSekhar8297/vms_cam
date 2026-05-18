const { Pool } = require('pg');
const pool = new Pool({ connectionString: "postgresql://postgres:Ravi%408297@localhost:5432/vms" });
async function run() {
    try {
        const res = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
