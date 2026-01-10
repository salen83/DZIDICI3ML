// ticketInfluence.js
// Računa kumulativni uticaj tiketa na predikcije (po timu, vremenski, max poslednjih 100 tiketa)

export function calculateTicketInfluence(tickets) {
  const influenceMap = {}; // { tim: { tip: cumulativeEffect } }

  // Kombinujemo dobitne i gubitne tikete po datumu (stari prvi)
  const allTickets = [...tickets.dobitni, ...tickets.gubitni]
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .slice(-100); // uzimamo poslednjih 100 tiketa

  // Prolazimo kroz sve tikete
  allTickets.forEach(ticket => {
    ticket.matches.forEach(match => {
      const { home, away, tip } = match;
      const isWin = ticket.status === "win" ? 1 : -1; // +1 ako je prošao, -1 ako nije

      // Inicijalizacija mapa za timove i tipove
      if (!influenceMap[home]) influenceMap[home] = {};
      if (!influenceMap[away]) influenceMap[away] = {};
      if (!influenceMap[home][tip]) influenceMap[home][tip] = 0;
      if (!influenceMap[away][tip]) influenceMap[away][tip] = 0;

      // Dodavanje efekta po timu, kumulativno
      influenceMap[home][tip] += 3 * isWin;
      influenceMap[away][tip] += 3 * isWin;

      // Plafoniranje ±15% po timu i tipu
      if (influenceMap[home][tip] > 15) influenceMap[home][tip] = 15;
      if (influenceMap[home][tip] < -15) influenceMap[home][tip] = -15;
      if (influenceMap[away][tip] > 15) influenceMap[away][tip] = 15;
      if (influenceMap[away][tip] < -15) influenceMap[away][tip] = -15;
    });
  });

  return influenceMap; // primer: { "Bayern": { "GG": 6, "7+": -3 }, ... }
}
