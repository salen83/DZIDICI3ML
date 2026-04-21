import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Screen1 from '../Screen1';
import { MatchesContext } from '../../MatchesContext';
import { useNormalisedTeamMap } from '../../NormalisedTeamMapContext';
import { useLeagueMap } from '../../LeagueMapContext';
import { useMapScreen } from '../../MapScreenContext';
import { useLeagueTeam } from '../../LeagueTeamContext';

// Mock hook funkcije
jest.mock('../../NormalisedTeamMapContext', () => ({
  useNormalisedTeamMap: jest.fn(),
}));
jest.mock('../../LeagueMapContext', () => ({
  useLeagueMap: jest.fn(),
}));
jest.mock('../../MapScreenContext', () => ({
  useMapScreen: jest.fn(),
}));
jest.mock('../../LeagueTeamContext', () => ({
  useLeagueTeam: jest.fn(),
}));

describe('Screen1 basic functionality', () => {
  const mockRows = [
    { rb: 1, datum: '17.02.2026', vreme: '18:00', liga: 'Premier', home: 'TeamA', away: 'TeamB', ft: '2:1', ht: '1:0', sh: '2:1', _confirmed: false },
    { rb: 2, datum: '16.02.2026', vreme: '20:00', liga: 'LaLiga', home: 'TeamC', away: 'TeamD', ft: '3:2', ht: '1:1', sh: '3:2', _confirmed: false },
  ];

  beforeEach(() => {
    // Mock hook vrednosti
    useNormalisedTeamMap.mockReturnValue({ teamMap: {}, setTeamMap: jest.fn() });
    useLeagueMap.mockReturnValue({ setLeagueMap: jest.fn() });
    useMapScreen.mockReturnValue({ setMapData: jest.fn() });
    useLeagueTeam.mockReturnValue({ leagueTeamData: {}, setLeagueTeamData: jest.fn() });
  });

  it('sortira po datumu najnovije gore i prikazuje kolone', () => {
    const setRows = jest.fn();
    render(
      <MatchesContext.Provider value={{ rows: mockRows, setRows }}>
        <Screen1 />
      </MatchesContext.Provider>
    );

    const rows = screen.getAllByText(/Team/);
    expect(rows.length).toBeGreaterThan(0);

    const datumValues = screen.getAllByText(/17\.02\.2026|16\.02\.2026/).map(e => e.textContent);
    expect(datumValues).toEqual(['17.02.2026', '16.02.2026']); // najnoviji gore
  });

  it('prikazuje edit mode input polja na klik', () => {
    const setRows = jest.fn();
    render(
      <MatchesContext.Provider value={{ rows: mockRows, setRows }}>
        <Screen1 />
      </MatchesContext.Provider>
    );

    const datumDiv = screen.getByText('17.02.2026');
    fireEvent.click(datumDiv);
    const input = screen.getByDisplayValue('17.02.2026');
    expect(input).toBeInTheDocument();
  });

  it('prikazuje dugmad za dodavanje i sync', () => {
    const setRows = jest.fn();
    render(
      <MatchesContext.Provider value={{ rows: mockRows, setRows }}>
        <Screen1 />
      </MatchesContext.Provider>
    );

    expect(screen.getByText('Dodaj novi mec')).toBeInTheDocument();
    expect(screen.getByText('Sync SofaScreen')).toBeInTheDocument();
  });
});
