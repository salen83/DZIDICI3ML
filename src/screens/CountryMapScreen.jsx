import React, { useContext, useEffect, useMemo, useState } from "react";
import { MatchesContext } from "../MatchesContext";
import {
  loadSofaCountries,
  loadCountryAliases,
  saveCountryAliases
} from "../services/countryAliasService";

export default function CountryMapScreen({ onClose }) {
  const { futureMatches } = useContext(MatchesContext);

  const [countries, setCountries] = useState([]);
  const [aliases, setAliases] = useState([]);

  const [selectedLeagues, setSelectedLeagues] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const c = await loadSofaCountries();
    const a = await loadCountryAliases();

    setCountries(c);
    setAliases(a);
  }

  const leagues = useMemo(() => {
    return [...new Set(
      (futureMatches || [])
        .map(x => x.liga)
        .filter(Boolean)
    )].sort();
  }, [futureMatches]);

  function toggleLeague(name) {
    setSelectedLeagues(prev =>
      prev.includes(name)
        ? prev.filter(x => x !== name)
        : [...prev, name]
    );
  }

  async function pairSelected() {
    if (!selectedCountry || selectedLeagues.length === 0) {
      alert("Izaberi jednu državu i najmanje jednu ligu.");
      return;
    }

    await saveCountryAliases(selectedLeagues, selectedCountry);

    setSelectedLeagues([]);

    refresh();
  }

  const aliasMap = {};
  aliases.forEach(a => {
    aliasMap[a.league_name] = a;
  });

return (
  <div style={{ height: "100%", padding: 20 }}>

    <div style={{ marginBottom: 15 }}>
      <button
        onClick={onClose}
        style={{
          padding: "8px 16px",
          fontWeight: "bold"
        }}
      >
        ← IZLAZ
      </button>
    </div>

    <div
      style={{
        display: "flex",
        height: "calc(100% - 55px)",
        gap: 20
      }}
    >

      {/* LEVA STRANA */}

      <div
        style={{
          flex: 1,
          border: "1px solid #ccc",
          overflow: "auto"
        }}
      >
        <h3 style={{margin:10}}>Mozzart lige</h3>

        {leagues.map(league => {

          const mapped = aliasMap[league];

          return (
            <div
              key={league}
              onClick={() => toggleLeague(league)}
              style={{
padding:10,
minHeight:52,
display:"flex",
flexDirection:"column",
justifyContent:"center",
                cursor:"pointer",
                background:
                  selectedLeagues.includes(league)
                    ? "#bde0ff"
                    : mapped
                      ? "#d7ffd7"
                      : "white",
                borderBottom:"1px solid #eee"
              }}
            >
              <b>{league}</b>

              {mapped && (
                <div
                  style={{
                    fontSize:12,
                    color:"#555"
                  }}
                >
                  ➜ {mapped.country_name}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* SREDINA */}

<div
  style={{
    width: 120,
    display: "flex",
    flexDirection: "column",
    border: "1px solid #ccc",
    overflow: "auto"
  }}
>

  <div
    style={{
      padding: 10,
      fontWeight: "bold",
      borderBottom: "1px solid #ddd",
      textAlign: "center"
    }}
  >
    Sofa
  </div>

  {leagues.map(league => {

    const mapped = aliasMap[league];

    return (

      <div
        key={league + "_map"}
        style={{
          padding: 10,
          borderBottom: "1px solid #eee",
          minHeight: 52,
          fontSize: 12
        }}
      >

        {mapped ? (
          <>
            <div><b>{mapped.country_id}</b></div>
            <div>{mapped.country_name}</div>
          </>
        ) : (
          <span style={{ color: "#999" }}>—</span>
        )}

      </div>

    );

  })}

  <div
    style={{
      padding: 10,
      borderTop: "1px solid #ccc",
      position: "sticky",
      bottom: 0,
      background: "#fff"
    }}
  >
    <button
      onClick={pairSelected}
      style={{
        width: "100%",
        padding: "10px"
      }}
    >
      Upari →
    </button>
  </div>

</div>

      {/* DESNA STRANA */}

      <div
        style={{
          flex:1,
          border:"1px solid #ccc",
          overflow:"auto"
        }}
      >
        <h3 style={{margin:10}}>Sofa države</h3>

        {countries.map(country => (

          <div
            key={country.id}
            onClick={() => setSelectedCountry(country)}
            style={{
padding:10,
minHeight:52,
display:"flex",
flexDirection:"column",
justifyContent:"center",
              cursor:"pointer",
              background:
                selectedCountry?.id === country.id
                  ? "#ffe7a8"
                  : "white",
              borderBottom:"1px solid #eee"
            }}
          >
            {country.name}
          </div>

        ))}

        </div>

      </div>

    </div>
  );
}
