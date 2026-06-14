// Pure transforms from the /lens/flows contract to graph data.
// A flow row: { source, destination, asset, time_bucket, amount, count }

const KIND_PREFIXES = [
  ['bank', '@bank:'],
  ['client', '@client:'],
  ['supplier', '@supplier:'],
  ['contracts', '@contracts:'],
];

export function kindOf(account) {
  if (account === '@world') return 'world';
  for (const [kind, prefix] of KIND_PREFIXES) {
    if (account.indexOf(prefix) === 0) return kind;
  }
  return 'other';
}

export function assetsOf(flows) {
  const set = {};
  for (const r of flows || []) set[r.asset] = true;
  return Object.keys(set).sort();
}

export function bucketsOf(flows, asset) {
  const set = {};
  for (const r of flows || []) {
    if (!asset || r.asset === asset) set[r.time_bucket] = true;
  }
  return Object.keys(set).sort();
}

// Collapse already-asset-filtered rows into {nodes, links}.
function toGraph(rows) {
  const nodeMap = {};
  const linkMap = {};
  for (const r of rows) {
    if (!nodeMap[r.source]) nodeMap[r.source] = {id: r.source, kind: kindOf(r.source), volume: 0};
    if (!nodeMap[r.destination]) nodeMap[r.destination] = {id: r.destination, kind: kindOf(r.destination), volume: 0};
    nodeMap[r.source].volume += r.amount;
    nodeMap[r.destination].volume += r.amount;

    const key = r.source + '\0' + r.destination;
    if (!linkMap[key]) linkMap[key] = {source: r.source, target: r.destination, amount: 0, count: 0};
    linkMap[key].amount += r.amount;
    linkMap[key].count += r.count;
  }
  return {nodes: Object.values(nodeMap), links: Object.values(linkMap)};
}

export function buildGraph(flows, asset) {
  const rows = (flows || []).filter(r => r.asset === asset);
  const g = toGraph(rows);
  return {nodes: g.nodes, links: g.links, buckets: bucketsOf(flows, asset)};
}

// Cumulative view: rows with time_bucket <= t (used by the scrubber later).
export function filterToBucket(flows, asset, t) {
  const rows = (flows || []).filter(r => r.asset === asset && r.time_bucket <= t);
  const g = toGraph(rows);
  return {nodes: g.nodes, links: g.links, buckets: bucketsOf(flows, asset)};
}
