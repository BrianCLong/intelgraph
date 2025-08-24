function intersect(a, b) {
  const from = a.from > b.from ? a.from : b.from;
  const toCandidates = [a.to, b.to].filter(Boolean);
  const to = toCandidates.length ? new Date(Math.min(...toCandidates.map((d) => d.getTime()))) : null;
  if (to && from > to) {
    return null;
  }
  return { from, to };
}

function contains(i, point) {
  return point >= i.from && (i.to === null || point <= i.to);
}

module.exports = { intersect, contains };
