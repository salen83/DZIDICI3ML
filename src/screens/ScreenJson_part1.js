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
  const [jsonFile, setJsonFile] = useState({ content: "", lastUpdated: null, totalMatches: 0, addedMatches: 0, prevCount: 0 });

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

  const formatDate = (d) => d ? new Date(d).toLocaleString() : "N/A";

  const [apiData, setApiData] = useState(null);
  const [apiStatus, setApiStatus] = useState("");
  const [apiError, setApiError] = useState("");

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

  const [autoPairs, setAutoPairs] = useState([]);
  const [manualPairs, setManualPairs] = useState([]);
  const [selectedMy, setSelectedMy] = useState(null);
  const [selectedApi, setSelectedApi] = useState(null);
  const [mappedTeams, setMappedTeams] = useState([]);
