import React, { useContext } from "react";
import { MatchesContext } from "../MatchesContext";

export default function TicketPanel() {
  const { activeTicket } = useContext(MatchesContext);

  if (!activeTicket || activeTicket.matches.length === 0) {
    return (
      <div style={{
        padding: 10,
        borderLeft: "1px solid #ccc",
        width: 250,
        fontSize: 12
      }}>
        <b>Tiket</b>
        <div style={{ color: "#666", marginTop: 4 }}>
          Nema dodatih mečeva
        </div>
      </div>
    );
  }

  const getTipStyle = (match) => {
    if (match.status === "win") {
      return {
        backgroundColor: "#d4f8d4",
        border: "1px solid #4caf50",
        color: "#1b5e20"
      };
    }

    if (match.status === "lose") {
      return {
        backgroundColor: "#ffd6d6",
        border: "1px solid #f44336",
        color: "#7f0000"
      };
    }

    return {
      backgroundColor: "#e0f0ff",
      border: "1px solid #90caf9",
      color: "#0d47a1"
    };
  };

  return (
    <div style={{
      padding: 10,
      borderLeft: "1px solid #ccc",
      width: 250,
      fontSize: 12
    }}>
      <b>{activeTicket.name}</b>

      {activeTicket.matches.map((m, i) => (
        <div
          key={i}
          style={{
            marginTop: 6,
            borderBottom: "1px solid #eee",
            paddingBottom: 6
          }}
        >
          <div>
            <b>{m.home}</b> – <b>{m.away}</b>
          </div>

          <div style={{ marginTop: 2 }}>
            {m.datum} {m.vreme}
          </div>

          <div
            style={{
              marginTop: 4,
              padding: "2px 6px",
              borderRadius: 4,
              display: "inline-block",
              fontWeight: "bold",
              ...getTipStyle(m)
            }}
          >
            {m.tip}
          </div>

          <div style={{ fontSize: 11, marginTop: 2 }}>
            Rezultat: <b>{m.rezultat || "-"}</b>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 8 }}>
        Ukupno mečeva: <b>{activeTicket.matches.length}</b>
      </div>
    </div>
  );
}
