import React, { useContext, useState } from "react";
import "./FullScreen.css";
import { getCountryLabel, getCountryFlag } from "../utils/countryMap";
import { MatchesContext } from "../MatchesContext";

export default function MapScreen({ onClose }) {
  const { rows } = useContext(MatchesContext);

  const [openCountry, setOpenCountry] = useState(null);

  const leaguesByCountry = {};

if (rows) {
  rows.forEach(match => {
const countryName = match.country;
if (!countryName) return;
    const leagueName = match.liga || "Unknown";

    if (!leaguesByCountry[countryName]) {
      leaguesByCountry[countryName] = [];
    }

    if (
      !leaguesByCountry[countryName].some(
        l => l.name === leagueName
      )
    ) {
      leaguesByCountry[countryName].push({
        name: leagueName,
        leagueId: `${countryName}-${leagueName}`,
      });
    }
  });

  for (let country in leaguesByCountry) {
    leaguesByCountry[country].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }
}

  return (
    <div className="full-screen-container">
      <button className="close-button" onClick={onClose}>
        X Close
      </button>

<ul>
  {Object.entries(leaguesByCountry)
    .sort(([countryA], [countryB]) =>
      getCountryLabel(countryA).localeCompare(getCountryLabel(countryB))
    )
    .map(([country, leagues], index) => (
          <li key={country} className="country-block">
            <h3
              onClick={() =>
                setOpenCountry(openCountry === country ? null : country)
              }
            >
{index + 1}.{" "}
{getCountryFlag(country) ? (
  <img
    src={`https://flagcdn.com/24x18/${getCountryFlag(country)}.png`}
    alt={country}
    style={{ marginRight: 6, verticalAlign: "middle" }}
  />
) : null}
{getCountryLabel(country)}
            </h3>

            {openCountry === country && (
              <ul>
                {leagues.map((ligaObj, i) => (
                  <li key={i}>
                    {ligaObj.name}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
