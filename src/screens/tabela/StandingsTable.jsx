import React from "react";

export default function StandingsTable({
  standings,
  teamAliases,
  onTeamClick,
  getDisplayTeamName
}) {
  /*
   * Jedna liga može imati više tabela:
   *
   *   Apertura, Group A
   *   Apertura, Group B
   *   Clausura, Group A
   *   Clausura, Group B
   *   Anual 2026
   *   Promedios 2026
   *
   * Zato prvo grupišemo redove po group_name.
   */

  const groupedStandings = {};

  (standings || []).forEach(row => {
    const groupName =
      typeof row.group_name === "string" &&
      row.group_name.trim()
        ? row.group_name.trim()
        : "Tabela";

    if (!groupedStandings[groupName]) {
      groupedStandings[groupName] = [];
    }

    groupedStandings[groupName].push(row);
  });

  const tables = Object.entries(groupedStandings);

  if (tables.length === 0) {
    return (
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: 20
        }}
      >
        <b>TABELA</b>

        <div
          style={{
            marginTop: 10,
            color: "#777"
          }}
        >
          Nema podataka za ovu ligu.
        </div>
      </div>
    );
  }

  /*
   * Prazne vrednosti iz Promedios tabele prikazujemo kao —
   */
  function valueOrDash(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    return value;
  }

  /*
   * Promedios nema klasične:
   * U / P / N / I / G+ / G- / GR
   *
   * Ima:
   * played = ukupan broj utakmica
   * points = ukupan broj bodova
   *
   * Prepoznajemo ga po nazivu grupe.
   */
  function isPromedios(groupName) {
    return groupName
      .toLowerCase()
      .includes("promedios");
  }

  return (
    <div>
      {tables.map(
        ([groupName, rows], tableIndex) => {
          const sortedRows = [...rows].sort(
            (a, b) =>
              Number(a.position || 999999) -
              Number(b.position || 999999)
          );

          const promedios =
            isPromedios(groupName);

          return (
            <div
              key={groupName}
              style={{
                border: "1px solid #ccc",
                borderRadius: 8,
                overflow: "hidden",
                marginBottom: 20
              }}
            >
              {/* ================================
                  NASLOV TABELE
              ================================= */}

              <div
                style={{
                  padding: 15,
                  background: "#f5f5f5",
                  borderBottom: "1px solid #ddd"
                }}
              >
                <h3
                  style={{
                    margin: 0
                  }}
                >
                  {groupName}
                </h3>
              </div>

              {/* ================================
                  TABELA
              ================================= */}

              <div
                style={{
                  overflowX: "auto"
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse"
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#f5f5f5"
                      }}
                    >
                      <th style={thStyle}>
                        #
                      </th>

                      <th
                        style={{
                          ...thStyle,
                          textAlign: "left"
                        }}
                      >
                        TIM
                      </th>

                      {promedios ? (
                        <>
                          <th style={thStyle}>
                            U
                          </th>

                          <th style={thStyle}>
                            BOD
                          </th>
                        </>
                      ) : (
                        <>
                          <th style={thStyle}>
                            U
                          </th>

                          <th style={thStyle}>
                            P
                          </th>

                          <th style={thStyle}>
                            N
                          </th>

                          <th style={thStyle}>
                            I
                          </th>

                          <th style={thStyle}>
                            G+
                          </th>

                          <th style={thStyle}>
                            G-
                          </th>

                          <th style={thStyle}>
                            GR
                          </th>

                          <th style={thStyle}>
                            BOD
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {sortedRows.map(
                      (row, index) => {
                        const aliases =
                          teamAliases[
                            Number(row.team_id)
                          ] || [];

                        const displayName =
                          getDisplayTeamName(row);

                        return (
                          <tr
                            key={
                              row.id ||
                              `${groupName}-${row.team_id}-${index}`
                            }
                            onClick={() =>
                              onTeamClick(row)
                            }
                            style={{
                              cursor: "pointer"
                            }}
                          >
                            <td style={tdStyle}>
                              {valueOrDash(
                                row.position
                              )}
                            </td>

                            <td
                              style={{
                                ...tdStyle,
                                textAlign: "left",
                                fontWeight: "bold"
                              }}
                            >
                              {displayName}

                              {aliases.length > 1 && (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    fontSize: 11,
                                    color: "#777"
                                  }}
                                >
                                  +{aliases.length - 1}
                                </span>
                              )}
                            </td>

                            {promedios ? (
                              <>
                                <td style={tdStyle}>
                                  {valueOrDash(
                                    row.played
                                  )}
                                </td>

                                <td
                                  style={{
                                    ...tdStyle,
                                    fontWeight: "bold"
                                  }}
                                >
                                  {valueOrDash(
                                    row.points
                                  )}
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={tdStyle}>
                                  {valueOrDash(
                                    row.played
                                  )}
                                </td>

                                <td style={tdStyle}>
                                  {valueOrDash(
                                    row.wins
                                  )}
                                </td>

                                <td style={tdStyle}>
                                  {valueOrDash(
                                    row.draws
                                  )}
                                </td>

                                <td style={tdStyle}>
                                  {valueOrDash(
                                    row.losses
                                  )}
                                </td>

                                <td style={tdStyle}>
                                  {valueOrDash(
                                    row.goals_for
                                  )}
                                </td>

                                <td style={tdStyle}>
                                  {valueOrDash(
                                    row.goals_against
                                  )}
                                </td>

                                <td style={tdStyle}>
                                  {valueOrDash(
                                    row.goal_difference
                                  )}
                                </td>

                                <td
                                  style={{
                                    ...tdStyle,
                                    fontWeight: "bold"
                                  }}
                                >
                                  {valueOrDash(
                                    row.points
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}

const thStyle = {
  padding: "10px 8px",
  borderBottom: "1px solid #ddd",
  textAlign: "center",
  fontSize: 12
};

const tdStyle = {
  padding: "10px 8px",
  borderBottom: "1px solid #eee",
  textAlign: "center",
  fontSize: 13
};
