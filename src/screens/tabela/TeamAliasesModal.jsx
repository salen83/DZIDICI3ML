import React from "react";

export default function TeamAliasesModal({
  selectedTeam,
  teamAliases,
  onClose
}) {
  if (!selectedTeam) {
    return null;
  }

  const aliases =
    teamAliases[
      Number(selectedTeam.team_id)
    ] || [];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 400,
          maxWidth: "90%",
          background: "white",
          borderRadius: 10,
          padding: 20,
          boxShadow:
            "0 5px 25px rgba(0,0,0,.3)"
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {selectedTeam.team}
        </h3>

        <div
          style={{
            fontSize: 12,
            color: "#777",
            marginBottom: 15
          }}
        >
          SofaScore Team ID:{" "}
          <b>{selectedTeam.team_id}</b>
        </div>

        {aliases.length === 0 ? (
          <div style={{ color: "#777" }}>
            Nema Mozzart aliasa za ovaj tim.
          </div>
        ) : (
          <div>
            <div
              style={{
                fontWeight: "bold",
                marginBottom: 8
              }}
            >
              Mozzart nazivi:
            </div>

            <ul
              style={{
                paddingLeft: 20,
                marginTop: 0
              }}
            >
              {aliases.map((alias, index) => (
                <li
                  key={`${alias}-${index}`}
                  style={{
                    marginBottom: 6
                  }}
                >
                  {alias}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 15,
            padding: "8px 16px"
          }}
        >
          ZATVORI
        </button>
      </div>
    </div>
  );
}
