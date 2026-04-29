import { create } from "zustand";

export const useMapStore = create((set) => ({
  deletedSofaLeagues: [],
  deletedSofaTeams: [],
  restoredHighlight: [],
  showDeletedLeagues: false,
  showDeletedTeams: false,

  selectedTeam1: null,
  selectedTeam2: null,
  selectedLeague1: null,
  selectedLeague2: null,

  searchTeam: "",
  searchResult: "",
  debugLog: [],

  addDebugLog: (msg) =>
    set((state) => ({
      debugLog: [msg, ...state.debugLog],
    })),

  setSelectedTeam1: (val) => set({ selectedTeam1: val }),
  setSelectedTeam2: (val) => set({ selectedTeam2: val }),
  setSelectedLeague1: (val) => set({ selectedLeague1: val }),
  setSelectedLeague2: (val) => set({ selectedLeague2: val }),

  setSearchTeam: (val) => set({ searchTeam: val }),
  setSearchResult: (val) => set({ searchResult: val }),

  setShowDeletedLeagues: (val) => set({ showDeletedLeagues: val }),
  setShowDeletedTeams: (val) => set({ showDeletedTeams: val }),

  setDeletedSofaLeagues: (val) => set({ deletedSofaLeagues: val }),
  setDeletedSofaTeams: (val) => set({ deletedSofaTeams: val }),
  setRestoredHighlight: (val) => set({ restoredHighlight: val }),
}));
