const WebSocket = require("ws");

const ws = new WebSocket("ws://localhost:8080");

const logs = [];

ws.on("open", () => {
  console.log("Report WebSocket povezan. Čekam logove...");
});

ws.on("message", (msg) => {
  const raw = msg.toString();

  try {
    const data = JSON.parse(raw);
    logs.push(data);

    // Brzi ispis u konzoli
    if(data.type === "click" || data.type === "render" || data.type.includes("state") || data.type.includes("reducer")) {
      console.log(`${data.ts} | ${data.type} | ${data.component || data.tag || data.name || ''} | ${data.text || data.message || JSON.stringify(data.newValue || '')}`);
    }

  } catch (e) {
    console.log("INFO (nije JSON):", raw);
  }
});

// CTRL+C -> summary
process.on("SIGINT", () => {
  console.log("\n=== SUMMARY ===");

  // Filtriramo samo state/reducer promene koje imaju "normalized" u imenu ili vrednosti
  const normLogs = logs.filter(l =>
    (l.type === "stateChange" || l.type === "reducerChange") &&
    (JSON.stringify(l.newValue || '').toLowerCase().includes("normalized") || (l.name && l.name.toLowerCase().includes("normalised")) )
  );

  console.log(`\nPronađeno ${normLogs.length} zapisa vezanih za automatsku normalizaciju:\n`);
  normLogs.forEach(l => {
    console.log(`${l.ts} | ${l.type} | ${l.name} | oldValue: ${JSON.stringify(l.oldValue)} | newValue: ${JSON.stringify(l.newValue)}`);
  });

  console.log("\nKraj izveštaja.");
  process.exit();
});
