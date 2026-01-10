import React, { useContext, useState, useEffect } from "react";
import { MatchesContext } from "../MatchesContext";
import "./Screen9.css";

export default function Screen9() {
  const { tickets, setTickets, activeTicket, saveActiveTicket, rows } = useContext(MatchesContext);
  const [activeTab, setActiveTab] = useState("otvoreni");
  const [selectedTicket, setSelectedTicket] = useState(null);

  // ===============================
  // AUTOMATSKO AŽURIRANJE TIKETA
  // ===============================
  useEffect(() => {
    if (!rows.length || !tickets.otvoreni.length) return;

    setTickets(prev => {
      const opened = [];
      const won = [...prev.dobitni];
      const lost = [...prev.gubitni];

      prev.otvoreni.forEach(ticket => {
        let allChecked = true;
        let lostFlag = false;

        const updatedMatches = ticket.matches.map(m => {
          const r = rows.find(row =>
            row.home === m.home &&
            row.away === m.away &&
            row.datum === m.datum &&
            row.vreme === m.vreme &&
            row.ft && row.ft.includes(":")
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

        if (lostFlag) {
          lost.push({ ...newTicket, status: "lose" });
        } else if (!allChecked) {
          opened.push(newTicket);
        } else {
          won.push({ ...newTicket, status: "win" });
        }
      });

      return { otvoreni: opened, dobitni: won, gubitni: lost };
    });
  }, [rows]);

  // ===============================
  // DOBAVLJANJE TIKETA ZA TAB
  // ===============================
  const getTabTickets = (tab) => {
    if (tab === "otvoreni") {
      let list = [...tickets.otvoreni];
      if (activeTicket && !list.find(t => t.id === activeTicket.id)) list.unshift(activeTicket);
      return list;
    }
    return tickets[tab] || [];
  };

  const tabTickets = getTabTickets(activeTab);

  const ticketBg = (t) => t.status === "win" ? "#c8facc" : t.status === "lose" ? "#f8c8c8" : "#f2f2f2";
  const tipBg = (m) => m.status === "win" ? "#c8facc" : m.status === "lose" ? "#f8c8c8" : "#e0f0ff";

  // ===============================
  // BRISANJE TIKETA
  // ===============================
  const deleteTicket = (ticketId, tab) => {
    setTickets(prev => {
      const newState = { ...prev, [tab]: prev[tab].filter(t => t.id !== ticketId) };
      return newState;
    });
  };

  return (
    <div className="screen9-container">
      <h2>Tiketi</h2>
      <div className="tabs">
        {["otvoreni","dobitni","gubitni"].map(tab => (
          <button key={tab} className={activeTab===tab?"active":""} onClick={()=>setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {tabTickets.map(ticket => (
          <div key={ticket.id} className="ticket-row" style={{display:"flex", alignItems:"center", justifyContent:"space-between", backgroundColor:ticketBg(ticket)}}>
            <span style={{flexGrow:1, cursor:"pointer"}} onClick={()=>setSelectedTicket(ticket)}>
              {ticket.name}
            </span>
            <button style={{marginLeft:5, padding:"2px 6px"}} onClick={()=>deleteTicket(ticket.id, activeTab)}>Obriši</button>
          </div>
        ))}
        {tabTickets.length===0 && <div style={{padding:10}}>Nema tiketa</div>}
      </div>

      {selectedTicket && (
        <div className="ticket-modal-overlay" onClick={()=>setSelectedTicket(null)}>
          <div className="ticket-modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{backgroundColor:ticketBg(selectedTicket), padding:"6px", borderRadius:"4px"}}>
              {selectedTicket.name}
            </h3>
            {selectedTicket.matches.map((p,i)=>(
              <div className="ticket-match" key={i}>
                <div className="match-left">
                  <div className="match-meta">{p.datum} | {p.vreme} | {p.liga}</div>
                  <div className="match-teams">{p.home} – {p.away}</div>
                  <div className="match-desc">
                    {p.tip==="GG" && "Oba tima daju gol"}
                    {p.tip==="NG" && "Bar jedan tim bez gola"}
                    {p.tip==="2+" && "Najmanje 2 gola"}
                    {p.tip==="7+" && "Najmanje 7 golova"}
                  </div>
                </div>
                <div className="match-right" style={{width:60}}>
                  <div className="match-result" style={{backgroundColor:tipBg(p), border:"1px solid #999", borderRadius:4, textAlign:"center", padding:"2px 4px"}}>
                    {p.rezultat || "-"}
                  </div>
                  <div className="match-tip">{p.tip}</div>
                </div>
              </div>
            ))}
            <button className="close-btn" onClick={()=>{
              if(activeTicket && activeTicket.id===selectedTicket.id) saveActiveTicket();
              setSelectedTicket(null);
            }}>Zatvori i sačuvaj</button>
          </div>
        </div>
      )}
    </div>
  );
}
