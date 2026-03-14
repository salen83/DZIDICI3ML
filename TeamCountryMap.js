import React, { useContext, useEffect, useState } from 'react';
import { MatchesContext } from '../../../MatchesContext';
import { ensureTeam, getTeamMap } from './teamCountryMapUtils';
import countries from './countries';
import './TeamCountryMap.css';

export default function TeamCountryMap({ onClose }) {
  const { rows } = useContext(MatchesContext);
  const [teamsList, setTeamsList] = useState([]);
  const [editTeam, setEditTeam] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [debugLogs, setDebugLogs] = useState([]);
  const addDebugLog = (msg) => setDebugLogs(prev => [...prev, msg]);

  // helper da vrati zastavicu po imenu države
  const getFlagByName = (countryName) => {
    if (!countries) return '';
    const entry = Object.values(countries || {}).find(c => c?.name === countryName);
    return entry?.flag || '';
  };

  // učitaj timove iz teamMap
  const refreshTeamsList = () => {
    const map = getTeamMap() || {};
    const teamsArray = Object.entries(map).map(([key, info]) => {
      const teamName = info?.name || key;
      const countryName = info?.country || '';
      const flag = getFlagByName(countryName);
      return { name: teamName, country: countryName, flag };
    });
    teamsArray.sort((a, b) => a.name.localeCompare(b.name));
    setTeamsList(teamsArray);
    addDebugLog(`🔄 refreshTeamsList pozvan, ${teamsArray.length} timova`);
  };

  useEffect(() => {
    if (!rows || !Array.isArray(rows)) {
      addDebugLog("❌ Rows je null ili nije niz");
      return;
    }

    addDebugLog(`📄 Rows učitano: ${rows.length} stavki`);

    const uniqueTeams = {};
    rows.forEach(r => {
      if (r.home) uniqueTeams[r.home] = '';
      if (r.away) uniqueTeams[r.away] = '';
    });

    addDebugLog(`⚽ Jedinstveni timovi: ${Object.keys(uniqueTeams).length}`);
    Object.keys(uniqueTeams).forEach(teamName => {
      ensureTeam(teamName);
      addDebugLog(`✅ ensureTeam pozvan za: ${teamName}`);
    });

    refreshTeamsList();
  }, [rows]);

  const startEdit = (team) => {
    setEditTeam(team.name);
    setSelectedCountry(team.country || '');
    addDebugLog(`✏️ Start edit: ${team.name} (${team.country || "Nepoznato"})`);
  };

  const saveEdit = () => {
    if (!editTeam) return;
    const flag = getFlagByName(selectedCountry);
    const map = getTeamMap() || {};
    map[editTeam] = { country: selectedCountry, flag };
    localStorage.setItem('TEAM_COUNTRY_MAP_V1', JSON.stringify(map));
    setTeamsList(prev =>
      prev.map(t =>
        t.name === editTeam ? { ...t, country: selectedCountry, flag } : t
      )
    );
    addDebugLog(`💾 Sačuvano: ${editTeam} → ${selectedCountry}, flag: ${flag}`);
    setEditTeam(null);
  };

  return (
    <div className="team-country-map-container">
      <button onClick={onClose} style={{ marginBottom: 10 }}>Zatvori</button>
      <h3>Mapa tim → država → zastavica</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Tim</th>
            <th>Država</th>
            <th>Zastavica</th>
            <th>Akcija</th>
          </tr>
        </thead>
        <tbody>
          {teamsList.map((team, idx) => {
            const currentFlag = editTeam === team.name ? getFlagByName(selectedCountry) : team.flag;
            return (
              <tr key={team.name + "_" + team.country}>
                <td>{idx + 1}</td>
                <td>{team.name}</td>
                <td>
                  {editTeam === team.name ? (
                    <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}>
                      {Object.values(countries || {}).map(info => (
                        <option key={info.name} value={info.name}>{info.name}</option>
                      ))}
                    </select>
                  ) : team.country || 'Nepoznato'}
                </td>
                <td style={{ fontSize: 20 }}>{currentFlag}</td>
                <td>
                  {editTeam === team.name ? (
                    <button onClick={saveEdit}>Sačuvaj</button>
                  ) : (
                    <button onClick={() => startEdit(team)}>Izmeni</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ maxHeight: 200, overflowY: 'auto', background: '#eee', marginTop: 10, padding: 5 }}>
        {debugLogs.map((l, i) => <div key={i} style={{ fontSize: 12 }}>{l}</div>)}
      </div>
    </div>
  );
}
