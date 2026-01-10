// coppy
const factorial = n => { let r=1; for(let i=2;i<=n;i++) r*=i; return r; };
const poisson = (lambda,k)=>Math.pow(lambda,k)*Math.exp(-lambda)/factorial(k);

export function buildPoissonModel(rows){
  const leagues={},teams={};
  rows.forEach(r=>{
    if(!r.ft?.includes(":")||!r.liga) return;
    const [hg,ag]=r.ft.split(":").map(Number);
    if(isNaN(hg)||isNaN(ag)) return;
    leagues[r.liga]??={homeGoals:0,awayGoals:0,games:0};
    leagues[r.liga].homeGoals+=hg; leagues[r.liga].awayGoals+=ag; leagues[r.liga].games++;
    teams[r.home]??={homeFor:0,homeAgainst:0,homeGames:0,awayFor:0,awayAgainst:0,awayGames:0};
    teams[r.away]??={homeFor:0,homeAgainst:0,homeGames:0,awayFor:0,awayAgainst:0,awayGames:0};
    teams[r.home].homeFor+=hg; teams[r.home].homeAgainst+=ag; teams[r.home].homeGames++;
    teams[r.away].awayFor+=ag; teams[r.away].awayAgainst+=hg; teams[r.away].awayGames++;
  });
  const leagueAvgs={};
  Object.keys(leagues).forEach(liga=>{
    const l=leagues[liga];
    leagueAvgs[liga]={avgHome:l.homeGoals/(l.games||1),avgAway:l.awayGoals/(l.games||1)};
  });
  const teamStrength={};
  Object.keys(teams).forEach(t=>{
    const tm=teams[t];
    teamStrength[t]={
      homeAttack: tm.homeGames?tm.homeFor/tm.homeGames:1,
      homeDefense: tm.homeGames?tm.homeAgainst/tm.homeGames:1,
      awayAttack: tm.awayGames?tm.awayFor/tm.awayGames:1,
      awayDefense: tm.awayGames?tm.awayAgainst/tm.awayGames:1
    };
  });
  return {leagueAvgs,teamStrength};
}

export function predictMatch(model,liga,home,away){
  const {leagueAvgs,teamStrength}=model;
  const L=leagueAvgs[liga]||{avgHome:1,avgAway:1};
  const H=teamStrength[home]||{homeAttack:1,homeDefense:1,awayAttack:1,awayDefense:1};
  const A=teamStrength[away]||{homeAttack:1,homeDefense:1,awayAttack:1,awayDefense:1};

  const homeAttackStrength = H.homeAttack/(L.avgHome||1);
  const homeDefenseWeakness = H.homeDefense/(L.avgAway||1);
  const awayAttackStrength = A.awayAttack/(L.avgAway||1);
  const awayDefenseWeakness = A.awayDefense/(L.avgHome||1);

  const lambdaHome=(L.avgHome||1)*homeAttackStrength*awayDefenseWeakness;
  const lambdaAway=(L.avgAway||1)*awayAttackStrength*homeDefenseWeakness;

  const maxG=10, pH=[], pA=[];
  for(let i=0;i<=maxG;i++){pH[i]=poisson(lambdaHome,i); pA[i]=poisson(lambdaAway,i);}
  const pHome0=pH[0]||0, pAway0=pA[0]||0, pGG=1-(pHome0+pAway0-pHome0*pAway0);
  const pUnder2=(pH[0]*pA[0]||0)+(pH[1]*pA[0]||0)+(pH[0]*pA[1]||0);
  let pOver7=0; for(let i=0;i<=maxG;i++) for(let j=0;j<=maxG;j++) if(i+j>=7)pOver7+=(pH[i]||0)*(pA[j]||0);
  return {lambdaHome,lambdaAway,gg:pGG*100,ng:(1-pGG)*100,over2:(1-pUnder2)*100,over7:pOver7*100};
}
