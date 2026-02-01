import React from "react";
import { useTeamMap } from "../TeamMapContext";

export default function TeamMapScreen({ onClose }) {
  const { teamMap, setTeamMap } = useTeamMap();

  const handleNormalizedChange = (key, value) => {
    setTeamMap(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        normalized: value
      }
    }));
  };

  const teams = Object.entries(teamMap || {});

  return (
    <div style={{ padding: 20 }}>
      <h2>🗂 Team Map Screen</h2>

      <button onClick={onClose} style={{ marginBottom: 15 }}>
        ⬅ Nazad
      </button>

      {teams.length === 0 ? (
        <div style={{ color: "gray", fontStyle: "italic" }}>
          Nema trenutno uparenih timova.
        </div>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Normalized Name</th>
              <th>Mozzart Name</th>
              <th>SofaScore Name</th>
            </tr>
          </thead>
          <tbody>
            {teams.map(([key, t], i) => (
              <tr key={key}>
                <td>{i + 1}</td>
                <td>
                  <input
                    value={t.normalized || ""}
                    onChange={e => handleNormalizedChange(key, e.target.value)}
                    style={{ width: "100%" }}
                  />
                </td>
                <td>{t.mozzart || "-"}</td>
                <td>{t.sofa || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <pre style={{ marginTop: 20, fontSize: 12, background: "#f5f5f5", padding: 10 }}>
        {JSON.stringify(teamMap, null, 2)}
      </pre>
    </div>
  );
}
