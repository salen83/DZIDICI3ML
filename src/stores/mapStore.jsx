import { create } from "zustand";

export const useMapStore = create((set, get) => ({
  // STORAGE – OBRISANE LIGE I TIMOVI
  deletedSofaLeagues: [],
  deletedSofaTeams: [],
  restoredHighlight: [],
  showDeletedLeagues: false,
  showDeletedTeams: false,

  // SELEKCIJA
  selectedTeam1: null,
  selectedTeam2: null,
  selectedLeague1: null,
  selectedLeague2: null,
  searchTeam: "",
  searchResult: "",
  debugLog: [],

  // TEAM i LEAGUE MAP
  teamMap: {},
  leagueMap: {},

  // INIT – load deleted items iz db
  loadDeleted: async (dbMap, STORE_NAMES) => {
    const leagues = await dbMap.getAll(STORE_NAMES.DELETED_SOFALIGUES);
    const teams = await dbMap.getAll(STORE_NAMES.DELETED_SOFATEAMS);

    set({
      deletedSofaLeagues: leagues.map(l => l.value || l.id),
      deletedSofaTeams: teams.map(t => t.value || t.id),
    });
  },

  // ACTIONS
  addDebugLog: (msg) => set(prev => ({ debugLog: [msg, ...prev.debugLog] })),
  setSelectedTeam1: (val) => set({ selectedTeam1: val }),
  setSelectedTeam2: (val) => set({ selectedTeam2: val }),
  setSelectedLeague1: (val) => set({ selectedLeague1: val }),
  setSelectedLeague2: (val) => set({ selectedLeague2: val }),
  setSearchTeam: (val) => set({ searchTeam: val }),
  setSearchResult: (val) => set({ searchResult: val }),
  setShowDeletedLeagues: (val) => set({ showDeletedLeagues: val }),
  setShowDeletedTeams: (val) => set({ showDeletedTeams: val }),
  setTeamMap: (val) => set({ teamMap: val }),
  setLeagueMap: (val) => set({ leagueMap: val }),
  setDeletedSofaLeagues: (val) => set({ deletedSofaLeagues: val }),
  setDeletedSofaTeams: (val) => set({ deletedSofaTeams: val }),
  setRestoredHighlight: (val) => set({ restoredHighlight: val }),
}));
