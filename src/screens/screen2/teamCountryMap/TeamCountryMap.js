import React, { useContext, useEffect, useState } from 'react';
import { MatchesContext } from '../../../MatchesContext';
import { ensureTeam, getTeamMap } from './index';
import countries from './countries';
import './TeamCountryMap.css';

export default function TeamCountryMap({ onClose }) {
  const { rows } = useContext(MatchesContext);
  const [teamsList, setTeamsList] = useState([]);
  const [editTeam, setEditTeam] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('');

  // helper da vrati zastavicu po imenu države
  const getFlagByName = (countryName) => {
    const entry = Object.values(countries).find(c => c.name === countryName);
    return entry ? entry.flag : '';
  };

  useEffect(() => {
    const refreshTeamsList = () => {
      const map = getTeamMap();
      const teamsArray = Object.keys(map).map(teamName => {
        const info = map[teamName] || {};
        const flag = getFlagByName(info.country) || '';
        return { name: teamName, country: info.country || '', flag };
      });
      setTeamsList(teamsArray);
    };

    const storedMap = localStorage.getItem('TEAM_COUNTRY_MAP_V1');
    if (storedMap) {
      const map = JSON.parse(storedMap);
      Object.entries(map).forEach(([team, info]) => {
        ensureTeam(team, '', info.country, info.flag);
      });
    }

    if (!rows || rows.length === 0) return;

    const uniqueTeams = {};
    rows.forEach(r => {
      if (r.home) uniqueTeams[r.home] = '';
      if (r.away) uniqueTeams[r.away] = '';
    });

    Object.keys(uniqueTeams).forEach(teamName => {
      ensureTeam(teamName);
    });

    refreshTeamsList();
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
      <button onClick={onClose} style={{ marginBottom: "10px" }}>Zatvori</button>
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
            const currentFlag = editTeam === team.name
              ? getFlagByName(selectedCountry)
              : team.flag;
            return (
              <tr key={team.name}>
                <td>{idx + 1}</td>
                <td>{team.name}</td>
                <td>
                  {editTeam === team.name ? (
                    <select
                      value={selectedCountry}
                      onChange={e => setSelectedCountry(e.target.value)}
                    >
                      {Object.values(countries).map(info => (
                        <option key={info.name} value={info.name}>{info.name}</option>
                      ))}
                    </select>
                  ) : team.country || 'Nepoznato'}
                </td>
                <td style={{ fontSize: '20px' }}>{currentFlag}</td>
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
