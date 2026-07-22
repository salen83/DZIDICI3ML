import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import "./LeagueMapScreen.css";

export default function LeagueMapScreen({ onClose }) {

  const [mozzartLeagues, setMozzartLeagues] = useState([]);
  const [sofaLeagues, setSofaLeagues] = useState([]);

  const [selectedMozzart, setSelectedMozzart] = useState(null);
  const [selectedSofa, setSelectedSofa] = useState(null);

  const [search, setSearch] = useState("");

  const [loadingMozzart, setLoadingMozzart] = useState(false);
  const [loadingSofa, setLoadingSofa] = useState(false);

  const [logs, setLogs] = useState([]);


  const log = (msg) => {
    console.log("[LEAGUE MAP]", msg);
    setLogs(prev => [...prev.slice(-50), msg]);
  };


  // ===============================
  // LOAD MOZART LIGAS
  // ===============================

  const loadMozzartLeagues = async () => {

    setLoadingMozzart(true);

    try {

      const { data: aliases, error } = await supabase
        .from("league_aliases")
        .select("alias")
        .eq("source", "mozzart");


      if (error) throw error;


      const mapped = new Set(
        aliases?.map(x => x.alias) || []
      );


      const { data, error: err2 } = await supabase
        .from("country_aliases")
        .select("*")
        .order("country_id")
        .order("league_name");


      if (err2) throw err2;


      const available = (data || []).filter(
        league => !mapped.has(league.league_name)
      );


      setMozzartLeagues(available);

const countryIds = [
  ...new Set(
    available.map(
      l => l.country_id
    )
  )
];


console.log("MOZZART COUNTRY IDS:", countryIds);


loadSofaLeagues(countryIds);

      log(
        "Mozzart neuparenih liga: " + available.length
      );


    } catch(e){

      log(
        "LOAD MOZART ERROR: " + e.message
      );

    } finally {

      setLoadingMozzart(false);

    }

  };



  // ===============================
  // LOAD SOFA LIGAS PO COUNTRY ID
  // ===============================

const loadSofaLeagues = async (countryIds) => {

  if (!countryIds || countryIds.length === 0) return;

  setLoadingSofa(true);

  try {

    const { data, error } = await supabase
      .from("sofa_leagues")
      .select("*")
      .in("country_id", countryIds)
      .order("country_id")
      .order("name");


    if(error) throw error;

console.log("SOFA QUERY RESULT:", data);
console.log("SOFA QUERY LENGTH:", data?.length);
console.log(
  "SOFA COUNTRY IDS:",
  [...new Set((data || []).map(x => x.country_id))]
);

    setSofaLeagues(data || []);


    log(
      "Sofa liga pronađeno: " + (data?.length || 0)
    );


  } catch(e){

    log(
      "LOAD SOFA ERROR: " + e.message
    );

  } finally {

    setLoadingSofa(false);

  }

};


  useEffect(() => {

    loadMozzartLeagues();

  }, []);
  // ===============================
  // SELECT MOZART LIGE
  // ===============================

const selectMozzart = (league) => {

  setSelectedMozzart(league);

};


  // ===============================
  // PAIR
  // ===============================

  const pairLeague = async () => {

    if (!selectedMozzart || !selectedSofa) {

      log("Izaberi obe lige pre uparivanja");
      return;

    }


    try {

      const { error } = await supabase
        .from("league_aliases")
        .insert([{

          league_id: selectedSofa.id,

          alias: selectedMozzart.league_name,

          source: "mozzart",

          country_id: selectedMozzart.country_id,

          confidence: 100

        }]);


      if(error) throw error;



      log(
        "UPARIVANJE: " +
        selectedMozzart.league_name +
        " -> " +
        selectedSofa.name
      );



      setMozzartLeagues(prev =>
        prev.filter(
          l => l.id !== selectedMozzart.id
        )
      );


      setSelectedMozzart(null);
      setSelectedSofa(null);
      setSofaLeagues([]);



    } catch(e){

      log(
        "PAIR ERROR: " + e.message
      );

    }

  };



  const filteredSofa = sofaLeagues.filter(
    league =>
      league.name
        ?.toLowerCase()
        .includes(
          search.toLowerCase()
        )
  );



  return (

    <div className="league-map-container">


      <div className="league-map-toolbar">


        <button onClick={onClose}>
          ⬅ Exit
        </button>


        <button
          className="pair-button"
          disabled={
            !selectedMozzart ||
            !selectedSofa
          }
          onClick={pairLeague}
        >
          ✅ Upari
        </button>


        <button
          onClick={loadMozzartLeagues}
        >
          🔄 Reload
        </button>


      </div>



      <div className="league-map-panels">



        {/* ================= LEFT ================= */}

        <div className="league-panel">


          <div className="panel-title">
            Mozzart lige
            <span>
              ({mozzartLeagues.length})
            </span>
          </div>



          <div className="panel-list">


          {
            loadingMozzart &&

            <div>
              Loading...
            </div>

          }



          {
            mozzartLeagues.map(
              league => (

                <div

                  key={league.id}

                  className={
                    "league-item " +
                    (
                      selectedMozzart?.id === league.id
                      ?
                      "selected"
                      :
                      ""
                    )
                  }


                  onClick={() =>
                    selectMozzart(league)
                  }

                >

                  <div>
                    {league.league_name}
                  </div>


                  <small>
                    Country ID:
                    {" "}
                    {league.country_id}
                  </small>


                </div>

              )

            )
          }


          </div>


        </div>





        {/* ================= RIGHT ================= */}


        <div className="league-panel">


          <div className="panel-title">
            SofaScore lige
            <span>
              ({
                sofaLeagues.length
              })
            </span>
          </div>



          <input

            className="league-search"

            placeholder="Pretraga Sofa liga..."

            value={search}

            onChange={
              e =>
              setSearch(e.target.value)
            }

          />



          <div className="panel-list">


          {
            loadingSofa &&

            <div>
              Loading...
            </div>

          }



{
sofaLeagues.length === 0 &&
<div className="empty-message">
Nema Sofa liga
</div>
}



          {
            filteredSofa.map(
              league => (

                <div

                  key={league.id}

                  className={
                    "league-item sofa " +

                    (
                      selectedSofa?.id === league.id

                      ?

                      "selected-sofa"

                      :

                      ""

                    )

                  }


                  onClick={() =>
                    setSelectedSofa(league)
                  }

                >


                  <div>
                    {league.name}
                  </div>


                  <small>
                    ID:
                    {" "}
                    {league.id}
                  </small>


                </div>

              )

            )
          }


          </div>


        </div>


      </div>


      {/* ================= LOG ================= */}

      <div className="league-map-log">

        <div className="log-title">
          Log
        </div>


        {
          logs.map(
            (item, index) => (

              <div
                key={index}
                className="log-row"
              >
                {item}
              </div>

            )
          )
        }


      </div>


    </div>

  );

}
