import React, { useContext, useState, useEffect, useCallback } from "react";
import { MatchesContext } from "../MatchesContext";
import "./Screen9.css";

export default function Screen9() {
  const { tickets, setTickets, activeTicket, saveActiveTicket, rows } = useContext(MatchesContext);
  const [activeTab, setActiveTab] = useState("otvoreni");
  const [selectedTicket, setSelectedTicket] = useState(null);

  // JSON state
  const [jsonFile, setJsonFile] = useState({ content: "", lastUpdated: null, totalMatches: 0, addedMatches: 0, prevCount: 0 });

  // ===============================
  // ONLINE / OFFLINE STATUS
  // ===============================
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const updateOnlineStatus = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // ===============================
  // AUTOMATSKO AŽURIRANJE TIKETA
  // ===============================
  useEffect(() => {
    if (!rows.length) return;

    setTickets((prev) => {
      const opened = [];
      const won = [];
      const lost = [];

      const allTickets = [
        ...prev.otvoreni.map(t => ({ ...t, __from: "otvoreni" })),
        ...prev.dobitni.map(t => ({ ...t, __from: "dobitni" })),
        ...prev.gubitni.map(t => ({ ...t, __from: "gubitni" })),
      ];

      allTickets.forEach((ticket) => {
        let allChecked = true;
        let lostFlag = false;

        const updatedMatches = ticket.matches.map((m) => {
          const r = rows.find(
            (row) =>
              row.home === m.home &&
              row.away === m.away &&
              row.datum === m.datum &&
              row.vreme === m.vreme &&
              row.ft &&
              row.ft.includes(":")
          );

          if (!r) {
            allChecked = false;
            return m;
          }

          const [hg, ag] = r.ft.split(":").map(Number);
          let passed = false;
          if (m.tip === "GG") passed = hg > 0 && ag > 0;
          if (m.tip === "NG") passed = hg === 0 || ag === 0;
          if (m.tip === "2+") passed = hg + ag >= 2;
          if (m.tip === "7+") passed = hg + ag >= 7;

          if (!passed) lostFlag = true;

          return { ...m, rezultat: r.ft, status: passed ? "win" : "lose" };
        });

        const newTicket = { ...ticket, matches: updatedMatches };

        if (!allChecked) {
          opened.push({ ...newTicket, status: "open" });
        } else if (lostFlag) {
          lost.push({ ...newTicket, status: "lose" });
        } else {
          won.push({ ...newTicket, status: "win" });
        }
      });

      return { otvoreni: opened, dobitni: won, gubitni: lost };
    });
  }, [rows, setTickets]);

  // ===============================
  // DOBAVLJANJE TIKETA ZA TAB
  // ===============================
  const getTabTickets = (tab) => {
    if (tab === "otvoreni") {
      let list = [...tickets.otvoreni];
      if (activeTicket && !list.find((t) => t.id === activeTicket.id)) list.unshift(activeTicket);
      return list;
    }
    return tickets[tab] || [];
  };

  const tabTickets = getTabTickets(activeTab);

  const ticketBg = (t) => (t.status === "win" ? "#c8facc" : t.status === "lose" ? "#f8c8c8" : "#f2f2f2");
  const tipBg = (m) => (m.status === "win" ? "#c8facc" : m.status === "lose" ? "#f8c8c8" : "#e0f0ff");

  // ===============================
  // BRISANJE TIKETA
  // ===============================
  const deleteTicket = (ticketId, tab) => {
    setTickets((prev) => {
      const newState = { ...prev, [tab]: prev[tab].filter((t) => t.id !== ticketId) };
      return newState;
    });
  };

  // ===============================
  // JSON FUNKCIJE
  // ===============================
  const createJSON = useCallback(() => {
    if (!rows || rows.length === 0) return;
    const content = JSON.stringify(rows, null, 2);
    const now = new Date();
    setJsonFile(prev => ({
      content,
      lastUpdated: now,
      totalMatches: rows.length,
      prevCount: prev.totalMatches,
      addedMatches: rows.length - prev.totalMatches
    }));
  }, [rows]);

  // automatsko osvežavanje kad se promeni screen1
  useEffect(() => {
    if (rows.length) createJSON();
  }, [rows, createJSON]);

  const copyJSON = () => {
    if (!jsonFile.content) return;
    navigator.clipboard.writeText(jsonFile.content).then(() => alert("JSON kopiran!"));
  };

  const previewMatches = () => {
    if (!jsonFile.content) return [];
    const arr = JSON.parse(jsonFile.content);
    if (arr.length <= 6) return arr;
    return [...arr.slice(0,3), ...arr.slice(-3)];
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString() : "N/A";

  return (
    <div className="screen9-container">
      <div style={{ marginBottom: 10, fontWeight: "bold" }}>
        Status interneta:{" "}
        {online ? <span style={{ color: "green" }}>ONLINE 🌐</span> : <span style={{ color: "red" }}>OFFLINE 🚫</span>}
      </div>

      <h2>Tiketi i JSON</h2>

      <div className="tabs">
        {["otvoreni", "dobitni", "gubitni", "JSON"].map((tab) => (
          <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "JSON" && (
        <div className="tab-content" style={{ maxHeight: 500, overflowY: "auto", padding: 10 }}>
          <div style={{ marginBottom: 10 }}>
            <button onClick={createJSON} style={{ marginRight: 5 }}>Kreiraj JSON</button>
            <button onClick={copyJSON}>Kopiraj JSON</button>
          </div>
          {jsonFile.content ? (
            <div>
              <div style={{ marginBottom: 5, fontSize: 12, fontWeight: "bold" }}>
                JSON fajl: poslednje osvežavanje: {formatDate(jsonFile.lastUpdated)}, ukupan broj mečeva: {jsonFile.totalMatches}, dodato: {jsonFile.addedMatches}, pre osvežavanja: {jsonFile.prevCount}
              </div>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", userSelect: "text", backgroundColor: "#f5f5f5", padding: 8, borderRadius: 4 }}>
                {previewMatches().map((m,i)=>(
                  <div key={i}>{`${m.datum} | ${m.vreme} | ${m.liga} | ${m.home}-${m.away} | ${m.ft} | ${m.ht} | ${m.sh}`}</div>
                ))}
              </pre>
            </div>
          ) : <div>Nema JSON fajla</div>}
        </div>
      )}

      {activeTab !== "JSON" && (
        <div className="tab-content">
          {tabTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="ticket-row"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: ticketBg(ticket) }}
            >
              <span style={{ flexGrow: 1, cursor: "pointer" }} onClick={() => setSelectedTicket(ticket)}>
                {ticket.name}
              </span>
              <button style={{ marginLeft: 5, padding: "2px 6px" }} onClick={() => deleteTicket(ticket.id, activeTab)}>
                Obriši
              </button>
            </div>
          ))}
          {tabTickets.length === 0 && <div style={{ padding: 10 }}>Nema tiketa</div>}
        </div>
      )}

      {selectedTicket && (
        <div className="ticket-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ backgroundColor: ticketBg(selectedTicket), padding: "6px", borderRadius: "4px" }}>
              {selectedTicket.name}
            </h3>

            {selectedTicket.matches.map((p, i) => (
              <div className="ticket-match" key={i}>
                <div className="match-left">
                  <div className="match-meta">
                    {p.datum} | {p.vreme} | {p.liga}
                  </div>
                  <div className="match-teams">
                    {p.home} – {p.away}
                  </div>
                </div>
                <div className="match-right" style={{ width: 60 }}>
                  <div
                    className="match-result"
                    style={{ backgroundColor: tipBg(p), border: "1px solid #999", borderRadius: 4, textAlign: "center", padding: "2px 4px" }}
                  >
                    {p.rezultat || "-"}
                  </div>
                  <div className="match-tip">{p.tip}</div>
                </div>
              </div>
            ))}

            <button
              className="close-btn"
              onClick={() => {
                if (activeTicket && activeTicket.id === selectedTicket.id) saveActiveTicket();
                setSelectedTicket(null);
              }}
            >
              Zatvori
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
