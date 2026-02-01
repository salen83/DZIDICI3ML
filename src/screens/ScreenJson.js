import React, { useState, useEffect, useCallback, useContext } from "react";
import { MatchesContext } from "../MatchesContext";

function timeToMinutes(t) {
if (!t) return null;
const [h, m] = t.split(":").map(Number);
return h * 60 + m;
}

export default function ScreenJson({ onClose }) {
const { rows } = useContext(MatchesContext);
const [activeTab, setActiveTab] = useState("moj");

const [selectedMy, setSelectedMy] = useState(null);  
const [selectedApi, setSelectedApi] = useState(null);  

const [mappedTeams, setMappedTeams] = useState([]);  

const [jsonFile, setJsonFile] = useState({ content: "", lastUpdated: null, totalMatches: 0, addedMatches: 0, prevCount: 0 });  
const [apiData, setApiData] = useState(null);  
const [apiStatus, setApiStatus] = useState("");  
const [apiError, setApiError] = useState("");  

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

useEffect(() => {  
    if (rows.length) createJSON();  
}, [rows, createJSON]);  

const copyJSON = () => {  
    if (!jsonFile.content) return;  
    navigator.clipboard.writeText(jsonFile.content).then(() => alert("JSON kopiran!"));  
};  

// ===============================  
// RUČNO UVEZIVANJE sa uklanjanjem iz liste  
// ===============================  
const addManualPair = () => {  
    if (!selectedMy || !selectedApi) return;  

    setMappedTeams(prev => [  
        ...prev,  
        { my: selectedMy, api: selectedApi }  
    ]);  

    // ukloni iz lista  
    setJsonFile(prev => {  
        const myList = JSON.parse(prev.content);  
        const filtered = myList.filter(m => m !== selectedMy);  
        return { ...prev, content: JSON.stringify(filtered, null, 2) };  
    });  
    setApiData(prev => prev.filter(a => a !== selectedApi));  

    setSelectedMy(null);  
    setSelectedApi(null);  
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

        setApiData(normalized);  
        setApiStatus(`✅ Učitano ${normalized.length} mečeva iz fajla`);  
    } catch(err) {  
        setApiError("❌ Greška: " + err.message);  
        setApiStatus("");  
    }  
};
// ===============================

const renderCompare = () => {  
    if (!jsonFile.content || !apiData) return <div>Prvo učitaj oba JSON-a.</div>;  

    let my = JSON.parse(jsonFile.content);  
    let api = apiData;  

    my.sort((a,b) => timeToMinutes(a.vreme) - timeToMinutes(b.vreme));  
    api.sort((a,b) => a.fixture.date.localeCompare(b.fixture.date));  

    const handleSelect = (match, type) => {  
        if (type === "my") setSelectedMy(match === selectedMy ? null : match);  
        else setSelectedApi(match === selectedApi ? null : match);  
    };  

    return (  
        <div>  
            <div style={{ marginBottom: 10, fontWeight: "bold" }}>  
                MOJ: {my.length} | SOFA: {api.length} | Upareno: {mappedTeams.length}  
            </div>  

            <button onClick={addManualPair} style={{ margin: "10px 0", padding: 8, fontWeight: "bold" }}>  
                🔗 UVEŽI IZABRANE  
            </button>  

            <div style={{ display: "flex", gap: 10 }}>  
                {/* MOJ JSON kolona */}  
                <div style={{ flex: 1, maxHeight: 500, overflowY: "auto", border: "1px solid #ccc" }}>  
                    {my.map((m, i) => (  
                        <div key={i}  
                            onClick={() => handleSelect(m, "my")}  
                            style={{  
                                padding: 4,  
                                cursor: "pointer",  
                                background: selectedMy === m ? "#d4edda" : "white",  
                                borderBottom: "1px solid #eee"  
                            }}>  
                            {m.datum} {m.vreme} | {m.home} - {m.away}  
                        </div>  
                    ))}  
                </div>  

                {/* SOFASCORE kolona */}  
                <div style={{ flex: 1, maxHeight: 500, overflowY: "auto", border: "1px solid #ccc" }}>  
                    {api.map((m, i) => (  
                        <div key={i}  
                            onClick={() => handleSelect(m, "api")}  
                            style={{  
                                padding: 4,  
                                cursor: "pointer",  
                                background: selectedApi === m ? "#d4edda" : "white",  
                                borderBottom: "1px solid #eee"  
                            }}>  
                            {m.fixture.date.split("T")[0]} {m.fixture.date.split("T")[1]?.substring(0,5)} | {m.teams.home.name} - {m.teams.away.name}  
                        </div>  
                    ))}  
                </div>  
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
                <h3>SOFASCORE JSON</h3>  
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
