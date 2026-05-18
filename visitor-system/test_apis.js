async function test() {
    try {
        const plans = await fetch('http://localhost:3000/api/plans').then(r => r.json());
        console.log('Plans:', plans);
        const subs = await fetch('http://localhost:3000/api/plan-subscriptions').then(r => r.json());
        console.log('Subscriptions:', subs);
    } catch (err) {
        console.error('Test failed (is server running?):', err.message);
    }
}
// test(); // Can't run fetch easily here without node-fetch or similar and the server running.
console.log('Test script ready.');
