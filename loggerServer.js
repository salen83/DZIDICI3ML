const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

// Kreiraj folder logs ako ne postoji
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logFile = path.join(logDir, 'leagueMapLog.txt');

app.post('/logLeagueMap', (req, res) => {
  const data = req.body;
  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} - ${JSON.stringify(data)}\n`;
  fs.appendFileSync(logFile, logLine);
  res.sendStatus(200);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Logger server running on http://localhost:${PORT}`);
});
