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

// Collapse the given kinds into single meta-nodes; aggregate their edges.
// collapsedKinds: array (or Set) of kind strings. Returns a new graph.
export function applyClustering(graph, collapsedKinds) {
  const collapsed = new Set(collapsedKinds || []);
  if (collapsed.size === 0) return graph;

  const metaId = (kind) => '__cluster__:' + kind;
  // map a node id -> its kind, for remapping links
  const kindById = {};
  for (const n of graph.nodes) kindById[n.id] = n.kind;

  const idFor = (rawId) => {
    const k = kindById[rawId];
    return collapsed.has(k) ? metaId(k) : rawId;
  };

  const nodeMap = {};
  for (const n of graph.nodes) {
    if (collapsed.has(n.kind)) {
      const id = metaId(n.kind);
      if (!nodeMap[id]) nodeMap[id] = {id, kind: n.kind, volume: 0, meta: true, members: 0};
      nodeMap[id].volume += n.volume;
      nodeMap[id].members += 1;
    } else {
      nodeMap[n.id] = {id: n.id, kind: n.kind, volume: n.volume};
    }
  }

  const linkMap = {};
  for (const l of graph.links) {
    // links may carry either string ids or resolved node objects (after d3 mutates them)
    const rawS = (l.source && l.source.id) ? l.source.id : l.source;
    const rawT = (l.target && l.target.id) ? l.target.id : l.target;
    const s = idFor(rawS);
    const t = idFor(rawT);
    if (s === t) continue; // drop intra-cluster self-loops
    const key = s + ' ' + t;
    if (!linkMap[key]) linkMap[key] = {source: s, target: t, amount: 0, count: 0};
    linkMap[key].amount += l.amount;
    linkMap[key].count += l.count;
  }

  return {nodes: Object.values(nodeMap), links: Object.values(linkMap), buckets: graph.buckets};
}
