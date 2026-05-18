const { Pool } = require('pg');
const pool = new Pool({ connectionString: "postgresql://postgres:Ravi%408297@localhost:5432/vms" });
async function run() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
        const cols = res.rows.map(r => `${r.column_name}: ${r.data_type}`).join(', ');
        console.log("USER_COLS => " + cols);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
