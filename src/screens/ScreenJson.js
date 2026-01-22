import React, { useState, useEffect, useCallback, useContext } from "react";
import { MatchesContext } from "../MatchesContext";

const API_KEY = "7e7b226a0c0dc938e011c0a10e02ba54";

function normalizeName(str) {
    if (!str) return "";
    return str
        .toLowerCase()
        .replace(/[čć]/g, "c")
        .replace(/š/g, "s")
        .replace(/đ/g, "dj")
        .replace(/ž/g, "z")
        .replace(/[^a-z0-9]/g, "")
        .replace(/fc|cf|sc|u19|u20|u21|women|reserves|reserve|ii|b/g, "");
}

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

    const fetchYesterdayMatches = async () => {
        setApiStatus("⏳ Preuzimam podatke sa API-Football...");
        setApiError("");
        setApiData(null);

        try {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const dateStr = `${yyyy}-${mm}-${dd}`;

            const url = `https://v3.football.api-sports.io/fixtures?date=${dateStr}`;
            const res = await fetch(url, { headers: { "x-apisports-key": API_KEY } });
            if (!res.ok) throw new Error("HTTP greška: " + res.status);

            const json = await res.json();
            if (json.errors && Object.keys(json.errors).length > 0) {
                setApiError("API greška: " + JSON.stringify(json.errors));
                setApiStatus("");
                return;
            }

            setApiData(json.response);
            setApiStatus(`✅ Preuzeto ${json.results} mečeva za ${dateStr}`);
        } catch (err) {
            setApiError("❌ Greška pri preuzimanju: " + err.message);
            setApiStatus("");
        }
    };

    // ===============================
    // RUČNO UVEZIVANJE
    // ===============================
    const addManualPair = () => {
        if (!selectedMy || !selectedApi) return;

        setMappedTeams(prev => [
            ...prev,
            { my: selectedMy, api: selectedApi }
        ]);

        setSelectedMy(null);
        setSelectedApi(null);
    };

    // ===============================
    // renderCompare
    // ===============================
    const renderCompare = () => {
        if (!jsonFile.content || !apiData) return <div>Prvo učitaj oba JSON-a.</div>;

        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const yesterdayStr = `${yyyy}-${mm}-${dd}`;

        let my = JSON.parse(jsonFile.content).filter(m => m.datum === yesterdayStr);
        let api = apiData.filter(m => m.fixture.date.startsWith(yesterdayStr));

        my.sort((a,b) => timeToMinutes(a.vreme) - timeToMinutes(b.vreme));
        api.sort((a,b) => a.fixture.date.localeCompare(b.fixture.date));

        // Ključevi za filtriranje
        const matchKeyMy = m => `${m.home}|${m.away}|${m.datum}|${m.vreme}`;
        const matchKeyApi = a => `${a.teams.home.name}|${a.teams.away.name}|${a.fixture.date}`;

        const usedMy = new Set(mappedTeams.map(p => matchKeyMy(p.my)));
        const usedApi = new Set(mappedTeams.map(p => matchKeyApi(p.api)));

        const visibleMy = my.filter(m => !usedMy.has(matchKeyMy(m)));
        const visibleApi = api.filter(a => !usedApi.has(matchKeyApi(a)));

        return (
            <div>
                <div style={{ marginBottom: 10, fontWeight: "bold" }}>
                    MOJ: {visibleMy.length} | API: {visibleApi.length} | Upareno: {mappedTeams.length}
                </div>

                <button onClick={addManualPair} style={{ margin: "10px 0", padding: 8, fontWeight: "bold" }}>
                    🔗 UVEŽI IZABRANE
                </button>

                <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1, maxHeight: 500, overflowY: "auto", border: "1px solid #ccc" }}>
                        {visibleMy.map((m, i) => (
                            <div key={i}
                                onClick={() => setSelectedMy(m)}
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

                    <div style={{ flex: 1, maxHeight: 500, overflowY: "auto", border: "1px solid #ccc" }}>
                        {visibleApi.map((m, i) => (
                            <div key={i}
                                onClick={() => setSelectedApi(m)}
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
                    {jsonFile.content && (
                        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", userSelect: "text", backgroundColor: "#f5f5f5", padding: 8, borderRadius: 4 }}>
                            {JSON.parse(jsonFile.content).slice(0, Math.min(3, JSON.parse(jsonFile.content).length)).map((m,i)=>(
                                <div key={i}>{`${m.datum} | ${m.vreme} | ${m.liga} | ${m.home}-${m.away} | ${m.ft} | ${m.ht} | ${m.sh}`}</div>
                            ))}
                        </pre>
                    )}
                </div>
            );
        }

        if (activeTab === "provera") {
            return (
                <div>
                    <h3>API JSON</h3>
                    <button onClick={fetchYesterdayMatches} style={{ padding: "8px 12px", fontWeight: "bold" }}>
                        🌐 Preuzmi jučerašnje mečeve (API)
                    </button>
                    {apiStatus && <div style={{ marginTop: 10, color: "green", fontWeight: "bold" }}>{apiStatus}</div>}
                    {apiError && <div style={{ marginTop: 10, color: "red", fontWeight: "bold" }}>{apiError}</div>}
                </div>
            );
        }

        if (activeTab === "uporedi") return renderCompare();

        if (activeTab === "mapiranje") {
            return (
                <div>
                    <h3>MAPIRANJE TIMOVA</h3>
                    {mappedTeams.length === 0 ? <div>Nema mapiranih timova.</div> : (
                        <ul>
                            {mappedTeams.map((p,i) => (
                                <React.Fragment key={i}>
                                    <li>{i*2+1}. {p.my.home} ({p.api.teams.home.name})</li>
                                    <li>{i*2+2}. {p.my.away} ({p.api.teams.away.name})</li>
                                </React.Fragment>
                            ))}
                        </ul>
                    )}
                </div>
            );
        }

        if (activeTab === "razlike") return <div><h3>MEČEVI RAZLIKE</h3><div>Ovde će kasnije biti detaljna razlika mečeva.</div></div>;

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
                <button onClick={() => setActiveTab("provera")} style={{ flex: 1, padding: "10px" }}>API JSON</button>
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
