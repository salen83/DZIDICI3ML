const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("WebSocket server pokrenut na ws://localhost:8080");
});

wss.on("connection", (ws) => {
  console.log("Nova veza iz React app");

  ws.on("message", (message) => {
    console.log("LOG iz aplikacije:", message.toString());

    // Prosledi svima (broadcast) osim servera
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client !== ws) {
        client.send(message.toString());
      }
    });
  });

  // Pošalji potvrdu
  ws.send("Server spreman za logove");
});
