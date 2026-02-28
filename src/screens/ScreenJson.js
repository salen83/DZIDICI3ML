import React, { useState, useEffect, useCallback, useContext } from "react";
import { MatchesContext } from "../MatchesContext";
import { useSofa } from "../SofaContext";
import { useLeagueMap } from "../LeagueMapContext";
import { useNormalisedTeamMap } from "../NormalisedTeamMapContext";

// ==========================================
// RAW funkcija za korišćenje van komponente
// ==========================================
export function convertSofaToSyncJSONRaw(sofaRows, teamMap, leagueMap) {
  return sofaRows.map((r, index) => {
    const normalizedHome =
      Object.values(teamMap).find(t => t.sofa === (r.home?.name || r.home))?.normalized ||
      (r.home?.name || r.home);

    const normalizedAway =
      Object.values(teamMap).find(t => t.sofa === (r.away?.name || r.away))?.normalized ||
      (r.away?.name || r.away);

const normalizedLeague =
  Object.values(leagueMap).find(l =>
    Array.isArray(l.sofa)
      ? l.sofa.includes(r.liga)
      : l.sofa === r.liga
  )?.screen1 || r.liga;

    const [day, month, year] = r.datum.split("/");
    const fullYear = year.length === 2 ? "20" + year : year;
    const datum = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    return {
      rb: index + 1,
      datum,
      vreme: r.vreme,
      liga: normalizedLeague,
      home: normalizedHome,
      away: normalizedAway,
      ft: r.ft?.replace(/\s/g, "").replace("-", ":") || null,
      ht: r.ht?.replace(/\s/g, "").replace("-", ":") || null,
      sh: r.sh?.replace(/\s/g, "").replace("-", ":") || null,
    };
  });
}


export default function ScreenJson({ onClose }) {
const { rows } = useContext(MatchesContext);
const { sofaRows } = useSofa();
const [activeTab, setActiveTab] = useState("moj");



const [jsonFile, setJsonFile] = useState({ content: "", lastUpdated: null, totalMatches: 0, addedMatches: 0, prevCount: 0 });  
const [apiStatus, setApiStatus] = useState("");  
const [apiError, setApiError] = useState("");  
const [sofaJsonFile, setSofaJsonFile] = useState({ content: "", lastUpdated: null, totalMatches: 0, addedMatches: 0, prevCount: 0 });
const { leagueMap } = useLeagueMap();
const { teamMap } = useNormalisedTeamMap();
const [logs, setLogs] = useState([]); // za prikaz logova u tabu

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
const createSofaJSON = useCallback(() => {
    if (!sofaRows || sofaRows.length === 0) return;
    const content = JSON.stringify(sofaRows, null, 2);
    const now = new Date();
    setSofaJsonFile(prev => ({
        content,
        lastUpdated: now,
        totalMatches: sofaRows.length,
        prevCount: prev?.totalMatches || 0,
        addedMatches: sofaRows.length - (prev?.totalMatches || 0)
    }));
}, [sofaRows]);
const convertSofaToSyncJSON = useCallback((sofaRows) => {
  const newLogs = [];
  newLogs.push("=== POČINJEM KONVERZIJU SofaRows ===");
  newLogs.push(`sofaRows: ${JSON.stringify(sofaRows, null, 2)}`);
  newLogs.push(`teamMap: ${JSON.stringify(teamMap, null, 2)}`);
  newLogs.push(`leagueMap: ${JSON.stringify(leagueMap, null, 2)}`);

  const syncJson = sofaRows.map((r, index) => {
       const normalizedHome = Object.values(teamMap).find(t => t.sofa === (r.home?.name || r.home))?.normalized || (r.home?.name || r.home);
const normalizedAway = Object.values(teamMap).find(t => t.sofa === (r.away?.name || r.away))?.normalized || (r.away?.name || r.away);
const normalizedLeague =
  Object.values(leagueMap).find(l =>
    Array.isArray(l.sofa)
      ? l.sofa.includes(r.liga)
      : l.sofa === r.liga
  )?.screen1 || r.liga;

    newLogs.push(`Meč #${index + 1}:`);
    newLogs.push(`  Original home: ${r.home} => Normalized: ${normalizedHome}`);
    newLogs.push(`  Original away: ${r.away} => Normalized: ${normalizedAway}`);
    newLogs.push(`  Original liga: ${r.liga} => Normalized: ${normalizedLeague}`);
    newLogs.push(`  Datum/vreme: ${r.datum} ${r.vreme}`);

    const [day, month, year] = r.datum.split("/");
    const fullYear = year.length === 2 ? "20" + year : year;
    const datum = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    return {
      rb: index + 1,
      datum,
      vreme: r.vreme,
      liga: normalizedLeague,
      home: normalizedHome,
      away: normalizedAway,
      ft: r.ft?.replace(/\s/g, "").replace("-", ":") || null,
      ht: r.ht?.replace(/\s/g, "").replace("-", ":") || null,
      sh: r.sh?.replace(/\s/g, "").replace("-", ":") || null,
    };
  });

  return { syncJson, logs: newLogs }; // vrati logove umesto da setuješ state
}, [teamMap, leagueMap]);

useEffect(() => {  
    if (rows.length) createJSON();  
}, [rows, createJSON]);  
useEffect(() => {
    if (sofaRows.length) createSofaJSON();
}, [sofaRows, createSofaJSON]);
useEffect(() => {
  if (!sofaRows || sofaRows.length === 0) {
    setLogs([]);
    return;
  }
  const { logs: newLogs } = convertSofaToSyncJSON(sofaRows);
  setLogs(newLogs);
}, [sofaRows, convertSofaToSyncJSON]);

const copyJSON = () => {  
    if (!jsonFile.content) return;  
    navigator.clipboard.writeText(jsonFile.content).then(() => alert("JSON kopiran!"));  
};  
const copySofaJSON = () => {
    if (!sofaJsonFile.content) return;
    navigator.clipboard.writeText(sofaJsonFile.content).then(() => alert("SofaScreen JSON kopiran!"));
};


// ===============================
// SAMO OVAJ DEO JE IZMENJEN
// ===============================
const handleFileUpload = async (event) => {  
    const file = event.target.files[0];  
    if (!file) return;  
    setApiStatus("⏳ Učitavam JSON fajl...");  
    setApiError("");  
    const text = await file.text();  
    try {  
        const json = JSON.parse(text);  

        // normalizacija SofaScore JSON-a, samo ovaj deo je izmenjen
        const events = Array.isArray(json.events) ? json.events :
                       Array.isArray(json.data?.events) ? json.data.events :
                       null;

        if (!events) throw new Error("Nije validan SofaScore JSON");

        const normalized = events.map(e => ({  
            fixture: { date: new Date(e.startTimestamp*1000).toISOString() },  
            teams: { home: {name: e.homeTeam?.name || ""}, away: {name: e.awayTeam?.name || ""} },  
            goals: { home: e.homeScore?.current ?? null, away: e.awayScore?.current ?? null },  
            status: e.status?.description || ""  
        }));  

        setApiStatus(`✅ Učitano ${normalized.length} mečeva iz fajla`);  
    } catch(err) {  
        setApiError("❌ Greška: " + err.message);  
        setApiStatus("");  
    }  
};
// ===============================

const renderCompare = () => {
  if (!sofaRows || sofaRows.length === 0) return <div>Nema SofaScreen mečeva za prikaz.</div>;

const { syncJson } = convertSofaToSyncJSON(sofaRows);


  return (
    <div>
      <h3>Sync JSON iz SofaScreen sa normalizovanim imenima</h3>
      <button
        onClick={() => navigator.clipboard.writeText(JSON.stringify(syncJson, null, 2))}
        style={{ marginBottom: 10, padding: 8, fontWeight: "bold" }}
      >
        📋 Kopiraj Sync JSON
      </button>

      <div style={{ display: "flex", gap: 10 }}>
        <pre style={{ flex: 1, maxHeight: 500, overflowY: "auto", background: "#f5f5f5", padding: 10 }}>
          {JSON.stringify(syncJson, null, 2)}
        </pre>

        <pre style={{ flex: 1, maxHeight: 500, overflowY: "auto", background: "#fff3cd", padding: 10 }}>
          {logs.join("\n")}
        </pre>
      </div>
    </div>
  );
};

const renderTab = () => {  
    if (activeTab === "moj") {  
        return (  
            <div>  
                <h3>MOJ JSON</h3>  
                <div style={{ marginBottom: 10 }}>  
                    <button onClick={createJSON} style={{ marginRight: 5 }}>Kreiraj JSON</button>  
                    <button onClick={copyJSON}>Kopiraj JSON</button>  
                </div>  
            </div>  
        );  
    }  

    if (activeTab === "provera") {
    return (
        <div>
            <h3>SOFASCREEN JSON</h3>
            <div style={{ marginBottom: 10 }}>
                <button onClick={createSofaJSON} style={{ marginRight: 5 }}>Kreiraj JSON</button>
                <button onClick={copySofaJSON}>Kopiraj JSON</button>
                <button
  onClick={() => {
    const syncJson = convertSofaToSyncJSON(sofaRows);
    setSofaJsonFile(prev => ({
      content: JSON.stringify(syncJson, null, 2),
      lastUpdated: new Date(),
      totalMatches: syncJson.length,
      prevCount: prev?.totalMatches || 0,
      addedMatches: syncJson.length - (prev?.totalMatches || 0)
    }));
  }}
  style={{ marginRight: 5 }}
>
  Generiši Sync JSON iz SofaScreen
</button>
            </div>
            <input type="file" accept=".json" onChange={handleFileUpload} style={{ marginBottom: 10 }} />
            {apiStatus && <div style={{ marginTop: 10, color: "green", fontWeight: "bold" }}>{apiStatus}</div>}
            {apiError && <div style={{ marginTop: 10, color: "red", fontWeight: "bold" }}>{apiError}</div>}
        </div>
    );
}

    if (activeTab === "uporedi") return renderCompare();  
    if (activeTab === "mapiranje") return <div />;  
    if (activeTab === "razlike") return <div />;  

    return null;  
};  

return (  
    <div style={{ width: "100%", height: "100%", boxSizing: "border-box" }}>  
        <div style={{ display: "flex", alignItems: "center", padding: "8px", borderBottom: "1px solid #ccc", backgroundColor: "#f5f5f5" }}>  
            <button onClick={onClose} style={{ marginRight: 10 }}>◀ Nazad</button>  
            <strong>JSON Centar</strong>  
        </div>  

        <div style={{ display: "flex", width: "100%", borderBottom: "2px solid #333" }}>  
            <button onClick={() => setActiveTab("moj")} style={{ flex: 1, padding: "10px" }}>MOJ JSON</button>  
            <button onClick={() => setActiveTab("provera")} style={{ flex: 1, padding: "10px" }}>SOFASCORE JSON</button>  
            <button onClick={() => setActiveTab("uporedi")} style={{ flex: 1, padding: "10px" }}>UPOREDI TIMOVE</button>  
            <button onClick={() => setActiveTab("mapiranje")} style={{ flex: 1, padding: "10px" }}>MAPIRANJE TIMOVA</button>  
            <button onClick={() => setActiveTab("razlike")} style={{ flex: 1, padding: "10px" }}>MEČEVI RAZLIKE</button>  
        </div>  

        <div style={{ padding: 10 }}>  
            {renderTab()}  
        </div>  
    </div>  
);

}
