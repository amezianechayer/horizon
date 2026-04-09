import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import * as d3 from 'd3';
import styled from 'styled-components';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  position: relative;
  background: #070d14;
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  overflow: hidden;

  svg.main-svg {
    display: block;
    width: 100%;
    height: 700px;
    cursor: grab;
    &:active { cursor: grabbing; }
  }

  .graph-legend {
    position: absolute;
    top: 12px; left: 12px;
    background: rgba(7,13,20,0.94);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: var(--r-md);
    padding: 10px 14px;
    font-size: 11px;
    color: var(--text-2);
    pointer-events: none;
    backdrop-filter: blur(12px);

    .leg-title {
      font-weight: 700; font-size: 10px; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-3); margin-bottom: 8px;
    }
    .leg-row {
      display: flex; align-items: center; gap: 7px;
      margin-bottom: 5px; &:last-child { margin-bottom: 0; }
      .leg-dot  { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
      .leg-dash { width: 9px; height: 9px; border-radius: 2px; border: 2px dashed; flex-shrink: 0; }
    }
  }

  .graph-stats {
    position: absolute;
    top: 12px; right: 12px;
    background: rgba(7,13,20,0.94);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: var(--r-md);
    padding: 10px 16px;
    text-align: right;
    backdrop-filter: blur(12px);
    pointer-events: none;

    .sn { font-size: 22px; font-weight: 700; color: var(--text-1); line-height: 1; font-family: var(--font-mono); }
    .sl { font-size: 10px; color: var(--text-3); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.06em; }
  }

  .graph-controls {
    position: absolute;
    bottom: 56px; right: 12px;
    display: flex; flex-direction: column; gap: 4px;
  }

  .ctrl-btn {
    width: 32px; height: 32px;
    background: rgba(7,13,20,0.94);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: var(--r);
    color: var(--text-2);
    font-size: 15px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    backdrop-filter: blur(12px);

    &:hover { background: var(--surface-3); color: var(--text-1); border-color: rgba(255,255,255,0.15); }
    &.on { border-color: var(--accent); color: var(--accent); background: rgba(0,208,132,0.12); }
  }

  .minimap {
    position: absolute;
    bottom: 12px; left: 12px;
    width: 160px; height: 96px;
    background: rgba(7,13,20,0.94);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: var(--r-md);
    overflow: hidden;
    backdrop-filter: blur(12px);
    svg { display: block; width: 100%; height: 100%; }
    .mm-vp {
      fill: rgba(0,208,132,0.07);
      stroke: var(--accent);
      stroke-width: 1;
    }
  }

  .graph-hint {
    position: absolute;
    bottom: 12px; right: 12px;
    font-size: 10px;
    color: rgba(255,255,255,0.18);
    pointer-events: none;
    font-family: var(--font-mono);
  }
`;

const Tooltip = styled.div`
  position: fixed;
  background: rgba(7,13,20,0.98);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: var(--r-md);
  padding: 11px 14px;
  color: var(--text-2);
  font-size: 12px;
  pointer-events: none;
  z-index: 9999;
  max-width: 290px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,208,132,0.06);
  transform: translate(0, -50%);
  font-family: var(--font-mono);

  .tt-title { font-weight: 700; color: var(--text-1); margin-bottom: 5px; word-break: break-all; font-size: 13px; }
  .tt-row {
    display: flex; justify-content: space-between; gap: 14px;
    margin-bottom: 3px; font-size: 11px;
    .k { color: var(--text-3); white-space: nowrap; }
    .v { color: var(--text-1); word-break: break-all; text-align: right; }
  }
  .tt-hint { margin-top: 7px; padding-top: 7px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 10px; color: var(--text-3); }
  .tt-badge {
    display: inline-block; padding: 2px 7px; border-radius: 4px;
    font-size: 10px; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const NC = {
  world:   { fill: '#ff5c5c', light: '#ff9090', stroke: '#cc3a3a', glow: 'rgba(255,92,92,0.5)' },
  sub:     { fill: '#4da8ff', light: '#7ecbff', stroke: '#2288ee', glow: 'rgba(77,168,255,0.5)' },
  account: { fill: '#00d084', light: '#3df5ab', stroke: '#00a86b', glow: 'rgba(0,208,132,0.5)' },
  cluster: { fill: '#9b7de8', light: '#c4a4f4', stroke: '#7c5cbf', glow: 'rgba(155,125,232,0.5)' },
};
const BADGE_BG = { world: '#8a1a1a', sub: '#1a4a88', account: '#065a38', cluster: '#3d1d7a' };
const NR = 19;
const NR_CLUSTER = 24;
const DOTS_PER_LINK = 3;

function fmt(amount, asset) {
  const p = ((asset||'').split('.')[1]) ? parseInt((asset||'').split('.')[1], 10) : 0;
  const n = p > 0 ? amount / Math.pow(10, p) : amount;
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: p, maximumFractionDigits: p })} ${(asset||'').split('.')[0]}`;
}

function linkPath(d) {
  const sx = d.source.x, sy = d.source.y, tx = d.target.x, ty = d.target.y;
  const dx = tx - sx, dy = ty - sy, len = Math.sqrt(dx*dx+dy*dy)||1;
  const nx = -dy/len, ny = dx/len, off = d.curveOffset||0;
  if (!off) return { path: `M${sx},${sy}L${tx},${ty}`, lx:(sx+tx)/2, ly:(sy+ty)/2-10 };
  const cx = (sx+tx)/2+nx*off, cy = (sy+ty)/2+ny*off;
  return {
    path: `M${sx},${sy}Q${cx},${cy}${tx},${ty}`,
    lx: .25*sx+.5*cx+.25*tx, ly: .25*sy+.5*cy+.25*ty-10,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BFS
// ─────────────────────────────────────────────────────────────────────────────

function bfsPath(nodeIds, linkData) {
  const adj = new Map();
  nodeIds.forEach(id => adj.set(id, []));
  linkData.forEach(l => {
    const s = l.source.id||l.source, t = l.target.id||l.target;
    if (adj.has(s)) adj.get(s).push(t);
    if (adj.has(t)) adj.get(t).push(s);
  });
  return (start, end) => {
    if (start === end) return [start];
    const visited = new Set([start]);
    const queue = [[start, [start]]];
    while (queue.length) {
      const [cur, path] = queue.shift();
      for (const nb of (adj.get(cur)||[])) {
        if (nb === end) return [...path, nb];
        if (!visited.has(nb)) { visited.add(nb); queue.push([nb, [...path, nb]]); }
      }
    }
    return null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

function GraphVisualization({ nodes, links, highlightedIds, onClusterToggle, onEdgeClick, layoutMode, pathTrace }) {
  const svgRef      = useRef(null);
  const minimapRef  = useRef(null);
  const zoomRef     = useRef(null);
  const posMapRef   = useRef(new Map());
  const focusRef    = useRef(null);
  const pinnedRef   = useRef(new Set());
  const nodeSelRef  = useRef(null);
  const linkSelRef  = useRef(null);
  const labelSelRef = useRef(null);
  const dotGrpRef   = useRef(null);
  const pathLineRef = useRef(null); // overlay for path glow
  const linkDataRef = useRef([]);
  const nodeDataRef = useRef([]);

  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, kind: 'node', data: null });
  const [animOn, setAnimOn]   = useState(true);
  const [showMM, setShowMM]   = useState(true);

  const history = useHistory();

  // Compute path sets from pathTrace prop (re-computed each render)
  const pathNodeSet = pathTrace ? new Set(pathTrace.path || []) : null;
  const pathLinkKeys = pathTrace ? new Set(
    (pathTrace.path||[]).reduce((acc, id, i, arr) => {
      if (i < arr.length - 1) {
        acc.push(`${id}||${arr[i+1]}`);
        acc.push(`${arr[i+1]}||${id}`);
      }
      return acc;
    }, [])
  ) : null;

  // ── applyFocus ────────────────────────────────────────────────────────────
  function applyFocus() {
    const ns = nodeSelRef.current;
    const ls = linkSelRef.current;
    const lls = labelSelRef.current;
    const dg = dotGrpRef.current;
    const ld = linkDataRef.current;
    const pl = pathLineRef.current;
    if (!ns) return;

    const fid = focusRef.current;
    const hasPath = pathNodeSet && pathNodeSet.size > 0;

    // ── Path trace mode ──────────────────────────────────────────────────
    if (hasPath) {
      ns.attr('opacity', d => pathNodeSet.has(d.id) ? 1 : 0.04);
      ls.attr('opacity', d => {
        const s = d.source.id||d.source, t = d.target.id||d.target;
        return pathLinkKeys.has(`${s}||${t}`) ? 1 : 0.02;
      })
      .attr('stroke', d => {
        const s = d.source.id||d.source, t = d.target.id||d.target;
        return pathLinkKeys.has(`${s}||${t}`) ? '#f5c542' : '#0d1a27';
      })
      .attr('stroke-width', d => {
        const s = d.source.id||d.source, t = d.target.id||d.target;
        return pathLinkKeys.has(`${s}||${t}`)
          ? Math.max(2.5, Math.min(5, Math.log2(d.count+1)*1.8))
          : Math.max(1, Math.min(3, Math.log2(d.count+1)*1.2));
      })
      .attr('filter', d => {
        const s = d.source.id||d.source, t = d.target.id||d.target;
        return pathLinkKeys.has(`${s}||${t}`) ? 'url(#path-glow)' : null;
      })
      .attr('marker-end', d => {
        const s = d.source.id||d.source, t = d.target.id||d.target;
        return pathLinkKeys.has(`${s}||${t}`) ? 'url(#arrow-path)' : 'url(#arrow)';
      });
      lls.attr('opacity', 0);
      // Dots: only show on path, gold, larger
      if (dg) {
        dg.selectAll('.dot')
          .attr('fill', d => {
            const l = ld[d.i];
            if (!l) return 'transparent';
            const s = l.source.id||l.source, t = l.target.id||l.target;
            return pathLinkKeys.has(`${s}||${t}`) ? '#ffe066' : 'transparent';
          })
          .attr('r', d => {
            const l = ld[d.i];
            if (!l) return 0;
            const s = l.source.id||l.source, t = l.target.id||l.target;
            return pathLinkKeys.has(`${s}||${t}`) ? 4 : 0;
          })
          .attr('opacity', d => {
            const l = ld[d.i];
            if (!l) return 0;
            const s = l.source.id||l.source, t = l.target.id||l.target;
            return pathLinkKeys.has(`${s}||${t}`) ? 0.95 : 0;
          });
      }
      return;
    }

    // ── Focus mode ────────────────────────────────────────────────────────
    if (fid) {
      const connected = new Set([fid]);
      ld.forEach(l => {
        const s = l.source.id||l.source, t = l.target.id||l.target;
        if (s===fid) connected.add(t);
        if (t===fid) connected.add(s);
      });
      ns.attr('opacity', d => connected.has(d.id) ? 1 : 0.05);
      ls.attr('opacity', d => {
        const s = d.source.id||d.source, t = d.target.id||d.target;
        return (s===fid||t===fid) ? 1 : 0.03;
      })
      .attr('stroke', d => {
        const s = d.source.id||d.source, t = d.target.id||d.target;
        return (s===fid||t===fid) ? '#4da8ff' : '#0d1a27';
      })
      .attr('stroke-width', d => Math.max(1.2, Math.min(4.5, Math.log2(d.count+1)*1.5)))
      .attr('filter', null)
      .attr('marker-end', d => {
        const s = d.source.id||d.source, t = d.target.id||d.target;
        return (s===fid||t===fid) ? 'url(#arrow-focus)' : 'url(#arrow)';
      });
      lls.attr('opacity', d => {
        const s = d.source.id||d.source, t = d.target.id||d.target;
        return (s===fid||t===fid) ? 0.8 : 0;
      });
      if (dg) dg.selectAll('.dot').attr('fill','#4da8ff').attr('r', 3).attr('opacity', animOn ? 0.6 : 0);
      return;
    }

    // ── Normal mode ───────────────────────────────────────────────────────
    ns.attr('opacity', 1);
    ls.attr('opacity', 0.7)
      .attr('stroke', '#1e3048')
      .attr('stroke-width', d => Math.max(1.2, Math.min(4.5, Math.log2(d.count+1)*1.5)))
      .attr('filter', null)
      .attr('marker-end', 'url(#arrow)');
    lls.attr('opacity', 0.55);
    if (dg) dg.selectAll('.dot').attr('fill','#4da8ff').attr('r', 3).attr('opacity', animOn ? 0.5 : 0);
  }

  // ── Minimap ───────────────────────────────────────────────────────────────
  function updateMinimap(transform) {
    if (!minimapRef.current || !svgRef.current) return;
    const nd = nodeDataRef.current;
    if (!nd.length) return;
    const mmSvg = d3.select(minimapRef.current).select('svg');
    const mmW = 160, mmH = 96;
    const xs = nd.map(d => d.x).filter(v => v != null);
    const ys = nd.map(d => d.y).filter(v => v != null);
    if (!xs.length) return;
    const bx = [Math.min(...xs), Math.max(...xs)];
    const by = [Math.min(...ys), Math.max(...ys)];
    const bw = Math.max(bx[1]-bx[0], 1), bh = Math.max(by[1]-by[0], 1);
    const pad = 8;
    const scale = Math.min((mmW-pad*2)/bw, (mmH-pad*2)/bh);
    const ox = pad - bx[0]*scale + (mmW - bw*scale)/2;
    const oy = pad - by[0]*scale + (mmH - bh*scale)/2;
    mmSvg.selectAll('.mm-node').data(nd)
      .join('circle').attr('class','mm-node')
      .attr('cx', d => (d.x||0)*scale+ox).attr('cy', d => (d.y||0)*scale+oy)
      .attr('r', 2.5)
      .attr('fill', d => NC[d.isCluster ? 'cluster' : d.type]?.fill || '#00d084')
      .attr('opacity', 0.8);
    const svgW = svgRef.current.clientWidth, svgH = 700;
    const vx = (-transform.x)/transform.k, vy = (-transform.y)/transform.k;
    const vw = svgW/transform.k, vh = svgH/transform.k;
    mmSvg.selectAll('.mm-vp').data([0])
      .join('rect').attr('class','mm-vp')
      .attr('x', vx*scale+ox).attr('y', vy*scale+oy)
      .attr('width', vw*scale).attr('height', vh*scale)
      .attr('rx', 2)
      .attr('fill', 'rgba(0,208,132,0.07)')
      .attr('stroke', 'var(--accent)').attr('stroke-width', 1);
  }

  // ── Main D3 effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;
    const svgEl = svgRef.current;
    const svg   = d3.select(svgEl);
    svg.selectAll('*').remove();
    focusRef.current = null;

    const W = svgEl.clientWidth || 960, H = 700;

    // ── Defs ──────────────────────────────────────────────────────────────
    const defs = svg.append('defs');

    // Dot grid pattern
    const pat = defs.append('pattern')
      .attr('id','dot-grid').attr('width',36).attr('height',36)
      .attr('patternUnits','userSpaceOnUse');
    pat.append('circle').attr('cx',18).attr('cy',18).attr('r',0.7)
      .attr('fill','#1a2940');

    // radialGradients for each node type
    Object.entries(NC).forEach(([type, c]) => {
      const rg = defs.append('radialGradient').attr('id',`ng-${type}`)
        .attr('cx','38%').attr('cy','35%').attr('r','65%');
      rg.append('stop').attr('offset','0%').attr('stop-color', c.light);
      rg.append('stop').attr('offset','100%').attr('stop-color', c.fill);
    });

    // Glow filter (nodes)
    const gf = defs.append('filter').attr('id','glow')
      .attr('x','-80%').attr('y','-80%').attr('width','260%').attr('height','260%');
    gf.append('feGaussianBlur').attr('in','SourceGraphic').attr('stdDeviation','3.5').attr('result','blur');
    const gfm = gf.append('feMerge');
    gfm.append('feMergeNode').attr('in','blur');
    gfm.append('feMergeNode').attr('in','blur');
    gfm.append('feMergeNode').attr('in','SourceGraphic');

    // Strong glow for path edges
    const pgf = defs.append('filter').attr('id','path-glow')
      .attr('x','-100%').attr('y','-100%').attr('width','300%').attr('height','300%');
    pgf.append('feGaussianBlur').attr('in','SourceGraphic').attr('stdDeviation','4').attr('result','b1');
    pgf.append('feGaussianBlur').attr('in','SourceGraphic').attr('stdDeviation','2').attr('result','b2');
    const pgfm = pgf.append('feMerge');
    pgfm.append('feMergeNode').attr('in','b1');
    pgfm.append('feMergeNode').attr('in','b2');
    pgfm.append('feMergeNode').attr('in','SourceGraphic');

    // Pin glow
    const pinGf = defs.append('filter').attr('id','pin-glow')
      .attr('x','-100%').attr('y','-100%').attr('width','300%').attr('height','300%');
    pinGf.append('feGaussianBlur').attr('in','SourceGraphic').attr('stdDeviation','5').attr('result','blur');
    const pgfm2 = pinGf.append('feMerge');
    pgfm2.append('feMergeNode').attr('in','blur');
    pgfm2.append('feMergeNode').attr('in','SourceGraphic');

    // Arrow markers
    function mkArrow(id, color, size) {
      defs.append('marker').attr('id',id).attr('viewBox','0 -5 10 10')
        .attr('refX',28).attr('refY',0)
        .attr('markerWidth', size||5).attr('markerHeight', size||5)
        .attr('orient','auto')
        .append('path').attr('d','M0,-4L10,0L0,4Z').attr('fill',color);
    }
    mkArrow('arrow',       '#1e3048', 5);
    mkArrow('arrow-focus', '#4da8ff', 6);
    mkArrow('arrow-path',  '#f5c542', 7);

    // ── Canvas ────────────────────────────────────────────────────────────
    const g = svg.append('g');
    const zoom = d3.zoom().scaleExtent([0.04, 12])
      .on('zoom', ev => { g.attr('transform', ev.transform); updateMinimap(ev.transform); });
    svg.call(zoom);
    zoomRef.current = zoom;

    svg.on('click', () => {
      focusRef.current = null;
      applyFocus();
      setTooltip(p => ({...p, visible: false}));
    });

    // Dot grid background
    g.append('rect')
      .attr('x',-W*4).attr('y',-H*4)
      .attr('width',W*9).attr('height',H*9)
      .attr('fill','url(#dot-grid)').attr('pointer-events','none');

    // Vignette overlay (subtle)
    const vg = defs.append('radialGradient').attr('id','vignette')
      .attr('cx','50%').attr('cy','50%').attr('r','70%');
    vg.append('stop').attr('offset','60%').attr('stop-color','transparent');
    vg.append('stop').attr('offset','100%').attr('stop-color','rgba(7,13,20,0.45)');
    svg.append('rect').attr('x',0).attr('y',0).attr('width','100%').attr('height','100%')
      .attr('fill','url(#vignette)').attr('pointer-events','none');

    // ── Data ──────────────────────────────────────────────────────────────
    const nodeData = nodes.map(n => {
      const pos = posMapRef.current.get(n.id);
      const pinned = pinnedRef.current.has(n.id);
      return {
        ...n,
        x:  pos ? pos.x : W/2 + (Math.random()-.5)*240,
        y:  pos ? pos.y : H/2 + (Math.random()-.5)*240,
        fx: pinned && pos ? pos.x : null,
        fy: pinned && pos ? pos.y : null,
      };
    });
    nodeDataRef.current = nodeData;

    const edgeSet = new Set(links.map(l => `${l.source}||${l.target}`));
    const linkData = links.map(l => ({
      ...l,
      curveOffset: edgeSet.has(`${l.target}||${l.source}`) ? (l.source < l.target ? 30 : -30) : 0,
    }));
    linkDataRef.current = linkData;

    // ── Forces ────────────────────────────────────────────────────────────
    const hasCached = nodeData.some(n => posMapRef.current.has(n.id));
    const sim = d3.forceSimulation(nodeData)
      .force('charge', d3.forceManyBody().strength(-650).distanceMax(500))
      .force('collision', d3.forceCollide(d => d.isCluster ? 50 : 42));

    if (layoutMode === 'hierarchical') {
      sim.force('link', d3.forceLink(linkData).id(d=>d.id).distance(140).strength(0.45))
         .force('x', d3.forceX(W/2).strength(0.05))
         .force('y', d3.forceY(d => {
           if (d.type==='world') return H*0.15;
           if (d.type==='sub')   return H*0.72;
           return H*0.45;
         }).strength(0.35));
    } else if (layoutMode === 'radial') {
      sim.force('link', d3.forceLink(linkData).id(d=>d.id).distance(120).strength(0.5))
         .force('radial', d3.forceRadial(d => d.type==='world' ? 0 : 230, W/2, H/2).strength(0.28))
         .force('x', d3.forceX(W/2).strength(0.02))
         .force('y', d3.forceY(H/2).strength(0.02));
    } else {
      sim.force('link', d3.forceLink(linkData).id(d=>d.id)
          .distance(d => (d.source.type==='world'||d.target.type==='world') ? 180 : 120).strength(0.5))
         .force('center', d3.forceCenter(W/2, H/2).strength(0.04));
    }

    if (hasCached) sim.alpha(0.22);

    // ── Links ──────────────────────────────────────────────────────────────
    const linksG = g.append('g');
    const link = linksG.selectAll('path').data(linkData).join('path')
      .attr('fill','none')
      .attr('stroke','#1e3048')
      .attr('stroke-opacity', 0.85)
      .attr('stroke-width', d => Math.max(1.2, Math.min(4.5, Math.log2(d.count+1)*1.5)))
      .attr('marker-end','url(#arrow)')
      .style('cursor','pointer')
      .on('mouseenter', function(ev, d) {
        d3.select(this).attr('stroke','#4da8ff').attr('stroke-width', d => Math.max(2, Math.min(5.5, Math.log2(d.count+1)*1.7))).attr('marker-end','url(#arrow-focus)');
        setTooltip({visible:true, x:ev.clientX, y:ev.clientY, kind:'link', data:d});
      })
      .on('mousemove', ev => setTooltip(p=>({...p, x:ev.clientX, y:ev.clientY})))
      .on('mouseleave', function() { applyFocus(); setTooltip(p=>({...p, visible:false})); })
      .on('click', (ev, d) => { ev.stopPropagation(); if (onEdgeClick) onEdgeClick(d); });
    linkSelRef.current = link;

    const labelsG = g.append('g');
    const linkLabel = labelsG.selectAll('text').data(linkData).join('text')
      .attr('text-anchor','middle')
      .attr('fill','#3a5470')
      .attr('font-size', 9)
      .attr('font-family','Roboto Mono, monospace')
      .attr('pointer-events','none')
      .attr('opacity', 0.55)
      .text(d => `${d.asset.split('.')[0]} ×${d.count}`);
    labelSelRef.current = linkLabel;
    pathLineRef.current = link;

    // ── Flow dots (3 per link, staggered) ─────────────────────────────────
    const pathRefs = [];
    link.each(function(d, i) { pathRefs[i] = this; });

    const dotG = g.append('g').attr('pointer-events','none');
    dotGrpRef.current = dotG;

    const dotData = [];
    linkData.forEach((l, i) => {
      const speed = Math.max(0.0005, Math.min(0.002, l.count * 0.0006 + 0.0003));
      for (let j = 0; j < DOTS_PER_LINK; j++) {
        dotData.push({ i, t: j / DOTS_PER_LINK, speed });
      }
    });

    const dots = dotG.selectAll('circle').data(dotData).join('circle')
      .attr('class','dot')
      .attr('r', 3)
      .attr('fill','#4da8ff')
      .attr('opacity', animOn ? 0.5 : 0);

    let rafId, alive = true;
    function animTick() {
      if (!alive) return;
      dots.each(function(d) {
        const el = pathRefs[d.i];
        if (!el) return;
        d.t = (d.t + d.speed) % 1;
        try {
          const len = el.getTotalLength();
          if (len > 0) {
            const pt = el.getPointAtLength(d.t * len);
            d3.select(this).attr('cx', pt.x).attr('cy', pt.y);
          }
        } catch(e) {}
      });
      rafId = requestAnimationFrame(animTick);
    }
    if (animOn) animTick();

    // ── Nodes ──────────────────────────────────────────────────────────────
    const nodesG = g.append('g');
    const node = nodesG.selectAll('g').data(nodeData).join('g')
      .style('cursor','pointer')
      .call(d3.drag()
        .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on('drag',  (ev, d) => { d.fx=ev.x; d.fy=ev.y; })
        .on('end',   (ev, d) => {
          if (!ev.active) sim.alphaTarget(0);
          if (!pinnedRef.current.has(d.id)) { d.fx=null; d.fy=null; }
        })
      );
    nodeSelRef.current = node;

    // Outer glow halo (hover reveal)
    node.append('circle').attr('class','halo')
      .attr('r', d => d.isCluster ? 34 : 28)
      .attr('fill', d => NC[d.isCluster?'cluster':d.type]?.glow || 'rgba(0,208,132,0.5)')
      .attr('opacity', 0).attr('pointer-events','none')
      .attr('filter','url(#glow)');

    // Search ring
    if (highlightedIds && highlightedIds.size > 0) {
      node.filter(d => highlightedIds.has(d.id)).append('circle')
        .attr('r', d => (d.isCluster ? NR_CLUSTER : NR) + 8)
        .attr('fill','none').attr('stroke','#f5c542')
        .attr('stroke-width', 2).attr('stroke-dasharray','5 3')
        .attr('opacity', 0.9).attr('pointer-events','none');
    }

    // Pin ring
    node.filter(d => pinnedRef.current.has(d.id)).append('circle')
      .attr('class','pin-ring')
      .attr('r', d => (d.isCluster ? NR_CLUSTER : NR) + 6)
      .attr('fill','none').attr('stroke','#f5c542')
      .attr('stroke-width',1.5).attr('filter','url(#pin-glow)')
      .attr('opacity', 0.85).attr('pointer-events','none');

    // Main body circle (radial gradient)
    node.append('circle').attr('class','body')
      .attr('r', d => d.isCluster ? NR_CLUSTER : NR)
      .attr('fill', d => `url(#ng-${d.isCluster?'cluster':d.type})`)
      .attr('stroke', d => NC[d.isCluster?'cluster':d.type]?.stroke || '#00a86b')
      .attr('stroke-width', d => d.isCluster ? 2.5 : 2)
      .attr('stroke-dasharray', d => d.isCluster ? '6 3' : null)
      .attr('filter','url(#glow)');

    // Inner highlight (shine effect)
    node.append('circle')
      .attr('r', d => d.isCluster ? NR_CLUSTER * 0.5 : NR * 0.5)
      .attr('cx', -3).attr('cy', -3)
      .attr('fill', 'rgba(255,255,255,0.12)')
      .attr('pointer-events','none');

    // Letter
    node.append('text')
      .attr('text-anchor','middle').attr('dy','0.35em')
      .attr('fill','rgba(255,255,255,0.95)')
      .attr('font-size', d => d.isCluster ? 14 : 12)
      .attr('font-weight', 700).attr('pointer-events','none')
      .attr('letter-spacing','0.02em')
      .text(d => d.id.replace('@','').slice(0,1).toUpperCase());

    // Cluster badge
    node.filter(d => d.isCluster).append('circle')
      .attr('cx', d => (d.isCluster ? NR_CLUSTER : NR) - 1)
      .attr('cy', d => -(d.isCluster ? NR_CLUSTER : NR) + 1)
      .attr('r', 10).attr('fill','#5a3aaa')
      .attr('stroke','#070d14').attr('stroke-width', 2.5)
      .attr('pointer-events','none');
    node.filter(d => d.isCluster).append('text')
      .attr('x', d => (d.isCluster ? NR_CLUSTER : NR) - 1)
      .attr('y', d => -(d.isCluster ? NR_CLUSTER : NR) + 1)
      .attr('text-anchor','middle').attr('dy','0.35em')
      .attr('fill','white').attr('font-size', 9).attr('font-weight', 700)
      .attr('pointer-events','none').text(d => d.childCount);

    // Label
    node.append('text').attr('class','lbl')
      .attr('text-anchor','middle')
      .attr('dy', d => (d.isCluster?NR_CLUSTER:NR) + 16)
      .attr('fill','#3a5878')
      .attr('font-size', 10)
      .attr('font-family','Roboto Mono, monospace')
      .attr('pointer-events','none')
      .text(d => d.id.length > 24 ? d.id.slice(0,23)+'…' : d.id);

    // Interactions
    node
      .on('mouseenter', function(ev, d) {
        ev.stopPropagation();
        d3.select(this).select('.halo').transition().duration(180).attr('opacity', 0.7);
        d3.select(this).select('.body').transition().duration(120).attr('r', d.isCluster ? NR_CLUSTER+5 : NR+5);
        d3.select(this).select('.lbl').attr('fill','rgba(255,255,255,0.65)');
        setTooltip({visible:true, x:ev.clientX, y:ev.clientY, kind:'node', data:d});
      })
      .on('mousemove', ev => setTooltip(p=>({...p, x:ev.clientX, y:ev.clientY})))
      .on('mouseleave', function(ev, d) {
        d3.select(this).select('.halo').transition().duration(250).attr('opacity', 0);
        d3.select(this).select('.body').transition().duration(180).attr('r', d.isCluster ? NR_CLUSTER : NR);
        d3.select(this).select('.lbl').attr('fill','#3a5878');
        setTooltip(p => ({...p, visible:false}));
      })
      .on('click', function(ev, d) {
        ev.stopPropagation();
        if (d.isCluster) { if (onClusterToggle) onClusterToggle(d.id); return; }
        if (focusRef.current === d.id) {
          history.push(`/accounts/${d.id}`);
        } else {
          focusRef.current = d.id;
          applyFocus();
        }
      })
      .on('contextmenu', function(ev, d) {
        ev.preventDefault(); ev.stopPropagation();
        const nd = nodeDataRef.current.find(n => n.id === d.id);
        if (!nd) return;
        if (pinnedRef.current.has(d.id)) {
          pinnedRef.current.delete(d.id);
          nd.fx = null; nd.fy = null;
          d3.select(this).select('.pin-ring').remove();
        } else {
          pinnedRef.current.add(d.id);
          nd.fx = nd.x; nd.fy = nd.y;
          d3.select(this).append('circle').attr('class','pin-ring')
            .attr('r', d.isCluster ? NR_CLUSTER+6 : NR+6)
            .attr('fill','none').attr('stroke','#f5c542')
            .attr('stroke-width',1.5).attr('filter','url(#pin-glow)')
            .attr('opacity', 0.85).attr('pointer-events','none');
        }
        sim.alpha(0.05).restart();
      });

    // ── Tick ──────────────────────────────────────────────────────────────
    sim.on('tick', () => {
      nodeData.forEach(d => posMapRef.current.set(d.id, {x:d.x, y:d.y}));
      link.attr('d', d => linkPath(d).path);
      linkLabel.each(function(d) {
        const {lx,ly} = linkPath(d);
        d3.select(this).attr('x',lx).attr('y',ly);
      });
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Auto-fit on first load
    let fitted = false;
    if (!hasCached) {
      sim.on('end', () => {
        if (fitted) return; fitted = true;
        const bb = g.node().getBBox();
        if (!bb.width) return;
        const p=70, s=Math.min((W-p*2)/bb.width,(H-p*2)/bb.height,1.4);
        const tx=p-bb.x*s+(W-bb.width*s)/2, ty=p-bb.y*s+(H-bb.height*s)/2;
        svg.transition().duration(800)
          .call(zoom.transform, d3.zoomIdentity.translate(tx,ty).scale(s));
      });
    }

    applyFocus();

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      sim.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links, layoutMode]);

  // Sync path trace
  useEffect(() => { applyFocus(); }, [pathTrace]); // eslint-disable-line

  // Sync animation toggle
  useEffect(() => {
    const dg = dotGrpRef.current;
    if (dg) {
      dg.selectAll('.dot').attr('opacity', animOn ? 0.5 : 0);
    }
  }, [animOn]);

  function handleZoom(f) {
    d3.select(svgRef.current).transition().duration(260).call(zoomRef.current.scaleBy, f);
  }
  function handleReset() {
    d3.select(svgRef.current).transition().duration(480).call(zoomRef.current.transform, d3.zoomIdentity);
  }
  function handleFitAll() {
    const svg = d3.select(svgRef.current);
    const bb = svg.select('g').node().getBBox();
    if (!bb.width) return;
    const W = svgRef.current.clientWidth, H = 700, p = 70;
    const s = Math.min((W-p*2)/bb.width, (H-p*2)/bb.height, 1.4);
    const tx = p - bb.x*s + (W - bb.width*s)/2;
    const ty = p - bb.y*s + (H - bb.height*s)/2;
    svg.transition().duration(520).call(zoomRef.current.transform, d3.zoomIdentity.translate(tx,ty).scale(s));
  }

  return (
    <Wrapper>
      <svg ref={svgRef} className="main-svg" />

      {/* Legend */}
      <div className="graph-legend">
        <div className="leg-title">Nodes</div>
        {[['world','#ff5c5c','@world'],['account','#00d084','Account'],['sub','#4da8ff','Sub-account']].map(([t,c,l])=>(
          <div className="leg-row" key={t}>
            <div className="leg-dot" style={{background:c, boxShadow:`0 0 6px ${c}`}}/>
            <span>{l}</span>
          </div>
        ))}
        <div className="leg-row">
          <div className="leg-dash" style={{borderColor:'#9b7de8'}}/>
          <span>Cluster</span>
        </div>
        <div className="leg-row">
          <div className="leg-dot" style={{width:8,height:8,background:'none',border:'1px solid #f5c542',borderRadius:2}}/>
          <span>Right-click = pin</span>
        </div>
        {pathTrace && pathTrace.path && pathTrace.path.length > 0 && (
          <div className="leg-row">
            <div className="leg-dot" style={{background:'#f5c542', boxShadow:'0 0 6px #f5c542'}}/>
            <span>Path trace</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="graph-stats">
        <div><div className="sn">{nodes?.length||0}</div><div className="sl">nodes</div></div>
        <div><div className="sn">{links?.length||0}</div><div className="sl">flows</div></div>
      </div>

      {/* Controls */}
      <div className="graph-controls">
        <button className="ctrl-btn" title="Zoom in"    onClick={()=>handleZoom(1.4)}>+</button>
        <button className="ctrl-btn" title="Zoom out"   onClick={()=>handleZoom(0.72)}>−</button>
        <button className="ctrl-btn" title="Fit all"    onClick={handleFitAll} style={{fontSize:12,fontWeight:700}}>⊡</button>
        <button className="ctrl-btn" title="Reset"      onClick={handleReset}  style={{fontSize:12}}>⊙</button>
        <button className={`ctrl-btn${animOn?' on':''}`} title="Flow animation" onClick={()=>setAnimOn(v=>!v)} style={{fontSize:12}}>◉</button>
        <button className={`ctrl-btn${showMM?' on':''}`} title="Minimap"        onClick={()=>setShowMM(v=>!v)} style={{fontSize:12}}>⊞</button>
      </div>

      {/* Minimap */}
      {showMM && (
        <div className="minimap" ref={minimapRef}><svg><g/></svg></div>
      )}

      <div className="graph-hint">click=focus · dbl-click=open · right-click=pin</div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.data && (
        <Tooltip style={{left: tooltip.x + 16, top: tooltip.y}}>
          {tooltip.kind === 'node' && (() => {
            const d = tooltip.data;
            const nc = NC[d.isCluster?'cluster':d.type];
            const isPinned = pinnedRef.current.has(d.id);
            return (
              <>
                <div className="tt-title">{d.id}</div>
                <div className="tt-badge" style={{background: BADGE_BG[d.isCluster?'cluster':d.type]||'#333', color: nc?.fill||'#fff', border:`1px solid ${nc?.fill||'#555'}20`}}>
                  {d.isCluster ? `cluster · ${d.childCount} accounts` : d.type}
                </div>
                {isPinned && <span className="tt-badge" style={{background:'#352000', color:'#f5c542', border:'1px solid #f5c54220', marginLeft:4}}>📌 pinned</span>}
                {highlightedIds&&highlightedIds.has(d.id) && <span className="tt-badge" style={{background:'#352000', color:'#f5c542', border:'1px solid #f5c54220', marginLeft:4}}>search match</span>}
                <div className="tt-hint">{d.isCluster ? 'Click to expand cluster' : 'Click = focus · Click again = open account'}</div>
              </>
            );
          })()}
          {tooltip.kind === 'link' && (() => {
            const d = tooltip.data;
            return (
              <>
                <div className="tt-title">Fund flow</div>
                <div className="tt-row"><span className="k">From</span><span className="v">{d.sourceId||(d.source?.id||d.source)}</span></div>
                <div className="tt-row"><span className="k">To</span><span className="v">{d.targetId||(d.target?.id||d.target)}</span></div>
                <div className="tt-row"><span className="k">Asset</span><span className="v">{d.asset}</span></div>
                <div className="tt-row"><span className="k">Total</span><span className="v">{fmt(d.amount, d.asset)}</span></div>
                <div className="tt-row"><span className="k">Transactions</span><span className="v">{d.count}</span></div>
                <div className="tt-hint">Click edge to see individual transactions</div>
              </>
            );
          })()}
        </Tooltip>
      )}
    </Wrapper>
  );
}

export { bfsPath };
export default GraphVisualization;
