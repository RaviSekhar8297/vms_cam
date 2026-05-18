const { Client } = require('pg');
const client = new Client({
    connectionString: "postgresql://postgres:Ravi%408297@localhost:5432/vms"
});

async function populate() {
    try {
        await client.connect();

        // Insert some plans
        const plans = [
            ['Basic Monthly', 'monthly', 99.00],
            ['Standard Quarterly', 'quarterly', 249.00],
            ['Premium Yearly', 'yearly', 899.00],
            ['Lifetime Enterprise', 'lifetime', 4999.00]
        ];

        for (const [name, type, amount] of plans) {
            await client.query(
                "INSERT INTO plans (plan_name, plan_type, amount, status) VALUES ($1, $2, $3, 'active') ON CONFLICT DO NOTHING;",
                [name, type, amount]
            );
        }

        console.log('Plans populated.');

        // Get an organization ID
        const orgRes = await client.query("SELECT id FROM organizations LIMIT 1;");
        if (orgRes.rows.length > 0) {
            const orgId = orgRes.rows[0].id;
            const planRes = await client.query("SELECT id FROM plans LIMIT 1;");
            if (planRes.rows.length > 0) {
                const planId = planRes.rows[0].id;
                await client.query(
                    "INSERT INTO plan_subscriptions (organization_id, plan_id, start_date, end_date, status) VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', 'active');",
                    [orgId, planId]
                );
                console.log('One subscription populated for org:', orgId);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

populate();
