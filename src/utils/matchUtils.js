export const getMatchKey = (match) =>
  match?.sofa_id
    ? `sofa-${match.sofa_id}`
    : `screen1-${match?.id}`;
