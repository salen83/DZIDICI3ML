import React, { useContext, useEffect, useState } from 'react';
import { MatchesContext } from '../../../MatchesContext';
import { ensureTeam, getTeamMap } from './teamCountryMapUtils';
import countries from './countries';
import './TeamCountryMap.css';

// Helper da vrati zastavicu po imenu države
const getFlagByName = (countryName) => {
  if (!countries) return '';
  const entry = Object.values(countries || {}).find(c => c?.name === countryName);
  return entry?.flag || '';
};

// Batch processing helper da se ne blokira UI
const processTeamsBatch = (teamKeys, ensureTeamFn, callback, batchSize = 50) => {
  let index = 0;
  const nextBatch = () => {
    const batch = teamKeys.slice(index, index + batchSize);
    batch.forEach(teamName => ensureTeamFn(teamName));
    index += batchSize;
    if (index < teamKeys.length) {
      setTimeout(nextBatch, 10); // 10ms pauza između batch-eva
    } else {
      callback();
    }
  };
  nextBatch();
};

export default function TeamCountryMap({ onClose }) {
  const { rows } = useContext(MatchesContext);
  const [teamsList, setTeamsList] = useState([]);
  const [editTeam, setEditTeam] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('');

  // učitaj timove iz teamMap
  const refreshTeamsList = () => {
    const map = getTeamMap() || {};
    const seen = new Set();
    const teamsArray = [];

    Object.entries(map).forEach(([key, info]) => {
      const teamName = info?.name || key;
      const countryName = info?.country || '';
      const uniqueKey = teamName + "_" + countryName;
      if (seen.has(uniqueKey)) return;
      seen.add(uniqueKey);

      const flag = getFlagByName(countryName);
      teamsArray.push({ name: teamName, country: countryName, flag });
    });

    teamsArray.sort((a, b) => a.name.localeCompare(b.name));
    setTeamsList(teamsArray);
  };

  useEffect(() => {
    if (!rows || !Array.isArray(rows)) return;

    const uniqueTeams = {};
    rows.forEach(r => {
      if (r.home) uniqueTeams[r.home] = '';
      if (r.away) uniqueTeams[r.away] = '';
    });

    const teamKeys = Object.keys(uniqueTeams);
    processTeamsBatch(teamKeys, ensureTeam, refreshTeamsList);
  }, [rows]);

  const startEdit = (team) => {
    setEditTeam(team.name);
    setSelectedCountry(team.country || '');
  };

  const saveEdit = () => {
    if (!editTeam) return;
    const flag = getFlagByName(selectedCountry);
    const map = getTeamMap();
    map[editTeam] = { country: selectedCountry, flag };
    localStorage.setItem('TEAM_COUNTRY_MAP_V1', JSON.stringify(map));
    setTeamsList(prev =>
      prev.map(t =>
        t.name === editTeam ? { ...t, country: selectedCountry, flag } : t
      )
    );
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
    </div>
  );
}
