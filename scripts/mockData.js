const API_BASE = 'http://localhost:3000/api';

async function run() {
  console.log("Generating dates...");
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const nextSat = new Date(today);
  nextSat.setDate(today.getDate() + daysUntilSaturday);
  const nextSun = new Date(nextSat);
  nextSun.setDate(nextSat.getDate() + 1);

  const satStr = nextSat.toISOString().split('T')[0];
  const sunStr = nextSun.toISOString().split('T')[0];
  
  // Create Session
  console.log(`Creating session for ${satStr} and ${sunStr}...`);
  const sessionPayload = {
    title: "DSI NA #4 (Mock Data)",
    description: "Auto-generated test schedule for next weekend.",
    dates: [satStr, sunStr],
    timeRange: { start: "13:00", end: "22:00" },
    granularity: 30,
    timezone: "America/Los_Angeles",
    isPublic: true,
    rolesRequired: true,
    roles: [
      { name: "PBP", color: "#177072" },
      { name: "Host", color: "#21748E" },
      { name: "Analyst", color: "#B3CE3C" },
      { name: "Colour", color: "#759F3F" },
      { name: "Observer", color: "#844E18" }
    ],
    shiftLabels: [
      { name: "Sat Shift 1", color: "#177072", startTime: `${satStr}T20:30:00Z`, endTime: `${satStr}T23:00:00Z` },
      { name: "Sat Shift 2", color: "#B3CE3C", startTime: `${satStr}T22:30:00Z`, endTime: `${nextSun.toISOString().split('T')[0]}T02:00:00Z` },
      { name: "Sun Shift 1", color: "#177072", startTime: `${sunStr}T20:30:00Z`, endTime: `${sunStr}T23:00:00Z` },
      { name: "Sun Shift 2", color: "#B3CE3C", startTime: `${sunStr}T22:30:00Z`, endTime: `${new Date(nextSun.getTime() + 86400000).toISOString().split('T')[0]}T02:00:00Z` }
    ]
  };

  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionPayload)
  });
  if (!res.ok) throw new Error(await res.text());
  const session = await res.json();
  console.log(`Created! URL: http://localhost:3000/${session.slug}`);

  // Fetch session to get roles and timeslots
  const sessionDataRes = await fetch(`${API_BASE}/sessions/${session.slug}`);
  const sessionData = await sessionDataRes.json();
  const dbRoles = sessionData.roles;
  const timeSlots = sessionData.timeSlots;
  
  const roleMap = {};
  for(const r of dbRoles) roleMap[r.name] = r.id;

  // Generate 15 participants
  const names = ["Alex", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "Sam", "Jamie", "Dakota", "Charlie", "Blake", "Avery", "Cameron", "Drew", "Peyton"];
  
  for(let i=0; i<15; i++) {
    const name = names[i];
    const roles = [];
    
    // Assign roles logic
    if (i < 3) {
      roles.push(roleMap["Observer"]); // Only observers
    } else if (i < 9) {
      roles.push(roleMap["PBP"]);
      if (Math.random() > 0.4) roles.push(roleMap["Host"]);
    } else {
      roles.push(roleMap["Analyst"]);
      if (Math.random() > 0.4) roles.push(roleMap["Colour"]);
    }

    // Assign random availability
    const availableSlotIds = [];
    const participationRate = 0.3 + Math.random() * 0.4;
    for(const slot of timeSlots) {
       if (Math.random() < participationRate) {
           availableSlotIds.push(slot.id);
       }
    }

    console.log(`Adding ${name}...`);
    const joinRes = await fetch(`${API_BASE}/sessions/${session.slug}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, roleIds: roles, availableSlotIds })
    });
    if (!joinRes.ok) {
       console.error(`Failed to add ${name}:`, await joinRes.text());
    }
  }
  
  console.log("Done! Open:");
  console.log(`http://localhost:3000/${session.slug}?host=${session.hostToken}`);
}

run().catch(console.error);
