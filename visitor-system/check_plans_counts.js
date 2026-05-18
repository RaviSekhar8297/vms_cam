const { Client } = require('pg');
const client = new Client({
    connectionString: "postgresql://postgres:Ravi%408297@localhost:5432/vms"
});

async function check() {
    try {
        await client.connect();
        const plansCount = await client.query(`SELECT count(*) FROM plans;`);
        console.log('Plans count:', plansCount.rows[0].count);

        const subsCount = await client.query(`SELECT count(*) FROM plan_subscriptions;`);
        console.log('Subscriptions count:', subsCount.rows[0].count);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
