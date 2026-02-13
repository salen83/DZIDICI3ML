export function debugSofaRows(sofaRows) {
  const json = JSON.stringify(sofaRows?.map(r => ({
    liga: r.liga || r.Liga,
    home: r.home || r.Domacin,
    away: r.away || r.Gost
  })), null, 2);
  const div = document.createElement('div');
  div.id = 'sofa-debug';
  div.style.display = 'none'; // ne vidi se
  div.textContent = json;
  document.body.appendChild(div);
}
