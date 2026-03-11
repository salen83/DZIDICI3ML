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

  // helper da vrati zastavicu po imenu države
  const getFlagByName = (countryName) => {
    if (!countries) return '';
    const entry = Object.values(countries || {}).find(c => c?.name === countryName);
    return entry?.flag || '';
  };

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

  // 🔹 batch update bez blokiranja UI
  const teamKeys = Object.keys(uniqueTeams);
const batchSize = 50; // obrađuje po 50 timova odjednom
let index = 0;

const processBatch = () => {
  const batch = teamKeys.slice(index, index + batchSize);
  batch.forEach(teamName => ensureTeam(teamName));
  index += batchSize;
  refreshTeamsList();
  if (index < teamKeys.length) {
    setTimeout(processBatch, 0); // raspodeli sledeći batch
  }
};

processBatch();
// eslint-disable-next-line react-hooks/exhaustive-deps
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
    // sačuvaj u storage i update liste
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
