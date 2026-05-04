const API_BASE = 'http://localhost:3000/api';

async function run() {
  // First, create a tiny session
  const sessionPayload = {
    title: "Test 422",
    dates: [new Date().toISOString().split('T')[0]],
    timeRange: { start: "13:00", end: "14:00" },
    granularity: 30,
    timezone: "UTC",
    isPublic: true,
    rolesRequired: false,
    roles: [{ name: "Test", color: "#000" }]
  };
  
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionPayload)
  });
  const session = await res.json();
  console.log("Created", session.slug);
  
  // Join
  const joinRes = await fetch(`${API_BASE}/sessions/${session.slug}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: "Bob", roleIds: [] })
  });
  const joinData = await joinRes.json();
  console.log("Join", joinData);
  
  // Patch
  const patchRes = await fetch(`${API_BASE}/sessions/${session.slug}/participant`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participantToken: joinData.token,
      name: "Bob",
      roleIds: [],
      availableSlotIds: []
    })
  });
  if (!patchRes.ok) {
    console.error("422 Error:", await patchRes.text());
  } else {
    console.log("Success", await patchRes.json());
  }
}
run();
