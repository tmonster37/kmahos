const BASE_URL = 'http://localhost:8080';

async function check() {
    const today = new Date().toISOString().split("T")[0];
    console.log("Today is:", today);
    try {
        const res = await fetch(`${BASE_URL}/api/schedules/by-department?departmentId=1&date=${today}`);
        const data = await res.json();
        console.log("Schedules today:", JSON.stringify(data.data, null, 2));
    } catch (e) {
        console.error(e);
    }
}
check();
