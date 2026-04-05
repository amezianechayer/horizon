import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import * as d3 from 'd3';
import styled from 'styled-components';

// ─────────────────────────────────────────────────────────────────────────────
// Styled components
// ─────────────────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  position: relative;
  background: #0d1117;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #21262d;

  svg {
    display: block;
    width: 100%;
    height: 680px;
    cursor: grab;
    &:active { cursor: grabbing; }
  }

  .graph-legend {
    position: absolute;
    top: 16px;
    left: 16px;
    background: rgba(13,17,23,0.92);
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 12px 16px;
    color: #c9d1d9;
    font-size: 12px;
    pointer-events: none;

    .legend-title {
      font-weight: 600; margin-bottom: 8px; color: #f0f6fc;
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .legend-item {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 4px; &:last-child { margin-bottom: 0; }
      .dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
      .dot-cluster {
        width: 11px; height: 11px; border-radius: 3px;
        border: 2px dashed #8b949e; flex-shrink: 0;
      }
    }
  }

  .graph-stats {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(13,17,23,0.92);
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 12px 16px;
    color: #c9d1d9;
    font-size: 12px;
    pointer-events: none;
    text-align: right;
    .stat-value { font-size: 18px; font-weight: 700; color: #f0f6fc; }
    .stat-label { opacity: 0.55; font-size: 11px; }
    .stat-row   { margin-bottom: 6px; &:last-child { margin-bottom: 0; } }
  }

  .graph-controls {
    position: absolute;
    bottom: 16px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    button {
      width: 32px; height: 32px;
      background: rgba(13,17,23,0.92);
      border: 1px solid #30363d; border-radius: 6px;
      color: #c9d1d9; font-size: 16px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, color 0.15s;
      &:hover { background: #21262d; color: #f0f6fc; }
      &.active { background: #21262d; border-color: #58a6ff; color: #58a6ff; }
    }
  }

  .focus-hint {
    position: absolute;
    bottom: 16px;
    left: 16px;
    background: rgba(13,17,23,0.88);
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 6px 12px;
    color: rgba(201,209,217,0.5);
    font-size: 11px;
    pointer-events: none;
  }
`;

const Tooltip = styled.div`
  position: fixed;
  background: rgba(13,17,23,0.97);
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 10px 14px;
  color: #c9d1d9; font-size: 12px;
  font-family: 'Roboto Mono', monospace;
  pointer-events: none;
  z-index: 9999;
  max-width: 290px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.55);
  transform: translate(0, -50%);

  .tt-title { font-weight: 700; color: #f0f6fc; margin-bottom: 6px; word-break: break-all; }
  .tt-row {
    display: flex; justify-content: space-between; gap: 14px;
    margin-bottom: 2px; font-size: 11px;
    .tt-key { opacity: 0.5; white-space: nowrap; }
    .tt-val { color: #e6edf3; word-break: break-all; }
  }
  .tt-badge {
    display: inline-block; padding: 1px 7px; border-radius: 4px;
    font-size: 10px; font-weight: 600; margin-bottom: 6px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .tt-hint {
    margin-top: 6px; padding-top: 6px; border-top: 1px solid #21262d;
    font-size: 10px; opacity: 0.45;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const NODE_COLORS = {
  world:   { fill: '#f85149', stroke: '#da3633', glow: 'rgba(248,81,73,0.35)' },
  sub:     { fill: '#388bfd', stroke: '#1f6feb', glow: 'rgba(56,139,253,0.35)' },
  account: { fill: '#3fb950', stroke: '#2ea043', glow: 'rgba(63,185,80,0.35)' },
  cluster: { fill: '#6e4095', stroke: '#8957e5', glow: 'rgba(137,87,229,0.35)' },
};

const BADGE_BG = { world: '#da3633', sub: '#1f6feb', account: '#2ea043', cluster: '#8957e5' };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatAmount(amount, asset) {
  const parts = (asset || '').split('.');
  const prec  = parts.length > 1 ? parseInt(parts[1], 10) : 0;
  const val   = prec > 0 ? amount / Math.pow(10, prec) : amount;
  return `${val.toLocaleString('fr-FR', { minimumFractionDigits: prec, maximumFractionDigits: prec })} ${parts[0]}`;
}

function computeLinkGeometry(d) {
  const sx = d.source.x, sy = d.source.y;
  const tx = d.target.x, ty = d.target.y;
  const dx = tx - sx,    dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const off = d.curveOffset || 0;

  if (off === 0) {
    return { path: `M ${sx},${sy} L ${tx},${ty}`, lx: (sx+tx)/2, ly: (sy+ty)/2 - 9 };
  }
  const cx = (sx+tx)/2 + nx*off, cy = (sy+ty)/2 + ny*off;
  return {
    path: `M ${sx},${sy} Q ${cx},${cy} ${tx},${ty}`,
    lx: 0.25*sx + 0.5*cx + 0.25*tx,
    ly: 0.25*sy + 0.5*cy + 0.25*ty - 9,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

function GraphVisualization({ nodes, links, highlightedIds, onClusterToggle, onEdgeClick }) {
  const svgRef      = useRef(null);
  const zoomRef     = useRef(null);
  const posMapRef   = useRef(new Map());
  const focusRef    = useRef(null);
  const nodeSelRef  = useRef(null);
  const linkSelRef  = useRef(null);
  const labelSelRef = useRef(null);
  const dotGrpRef   = useRef(null);
  const linkDataRef = useRef([]);

  const [tooltip,  setTooltip]  = useState({ visible: false, x: 0, y: 0, kind: 'node', data: null });
  const [animOn,   setAnimOn]   = useState(true);

  const history = useHistory();

  // ── applyFocus ────────────────────────────────────────────────────────────
  function applyFocus() {
    const ns  = nodeSelRef.current;
    const ls  = linkSelRef.current;
    const lls = labelSelRef.current;
    const dg  = dotGrpRef.current;
    const ld  = linkDataRef.current;
    if (!ns) return;

    const fid = focusRef.current;
    if (!fid) {
      ns.attr('opacity', 1);
      ls.attr('opacity', 0.8).attr('stroke', '#30363d').attr('marker-end', 'url(#arrow)');
      lls.attr('opacity', 0.65);
      if (dg) dg.selectAll('circle.flow-dot').attr('opacity', 0.6);
      return;
    }

    const connected = new Set([fid]);
    ld.forEach(l => {
      const s = l.source.id || l.source, t = l.target.id || l.target;
      if (s === fid) connected.add(t);
      if (t === fid) connected.add(s);
    });

    ns.attr('opacity', d => connected.has(d.id) ? 1 : 0.07);

    ls.attr('opacity', d => {
      const s = d.source.id||d.source, t = d.target.id||d.target;
      return (s===fid||t===fid) ? 1 : 0.04;
    })
    .attr('stroke', d => {
      const s = d.source.id||d.source, t = d.target.id||d.target;
      return (s===fid||t===fid) ? '#58a6ff' : '#21262d';
    })
    .attr('marker-end', d => {
      const s = d.source.id||d.source, t = d.target.id||d.target;
      return (s===fid||t===fid) ? 'url(#arrow-focus)' : 'url(#arrow)';
    });

    lls.attr('opacity', d => {
      const s = d.source.id||d.source, t = d.target.id||d.target;
      return (s===fid||t===fid) ? 1 : 0;
    });

    if (dg) {
      dg.selectAll('circle.flow-dot').attr('opacity', dot => {
        const l = linkDataRef.current[dot.pathIdx];
        if (!l) return 0;
        const s = l.source.id||l.source, t = l.target.id||l.target;
        return (s===fid||t===fid) ? 0.85 : 0.02;
      });
    }
  }

  // ── Main D3 effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    const svgEl = svgRef.current;
    const svg   = d3.select(svgEl);
    svg.selectAll('*').remove();
    focusRef.current = null;

    const width  = svgEl.clientWidth || 960;
    const height = 680;

    // ── Defs ────────────────────────────────────────────────────────────────
    const defs = svg.append('defs');

    const gf = defs.append('filter').attr('id', 'node-glow')
      .attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
    gf.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '3').attr('result', 'blur');
    const gfm = gf.append('feMerge');
    gfm.append('feMergeNode').attr('in', 'blur');
    gfm.append('feMergeNode').attr('in', 'SourceGraphic');

    function addArrow(id, color) {
      defs.append('marker')
        .attr('id', id).attr('viewBox', '0 -5 10 10')
        .attr('refX', 30).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M0,-4L9,0L0,4').attr('fill', color);
    }
    addArrow('arrow',       '#8b949e');
    addArrow('arrow-focus', '#58a6ff');

    const g = svg.append('g');

    const zoom = d3.zoom().scaleExtent([0.06, 8])
      .on('zoom', ev => g.attr('transform', ev.transform));
    svg.call(zoom);
    zoomRef.current = zoom;

    svg.on('click', () => {
      focusRef.current = null;
      applyFocus();
      setTooltip(p => ({ ...p, visible: false }));
    });

    // Grid
    const gs = 50;
    const gridG = g.append('g').attr('pointer-events', 'none');
    for (let x = -width; x < width*3; x += gs)
      gridG.append('line').attr('x1',x).attr('y1',-height).attr('x2',x).attr('y2',height*3).attr('stroke','#161b22').attr('stroke-width',1);
    for (let y = -height; y < height*3; y += gs)
      gridG.append('line').attr('x1',-width).attr('y1',y).attr('x2',width*3).attr('y2',y).attr('stroke','#161b22').attr('stroke-width',1);

    // ── Data prep ────────────────────────────────────────────────────────────
    const nodeData = nodes.map(n => {
      const pos = posMapRef.current.get(n.id);
      return { ...n, x: pos ? pos.x : width/2+(Math.random()-0.5)*200, y: pos ? pos.y : height/2+(Math.random()-0.5)*200 };
    });

    const edgeKeys = new Set(links.map(l => `${l.source}||${l.target}`));
    const linkData = links.map(l => {
      const rev = edgeKeys.has(`${l.target}||${l.source}`);
      return { ...l, curveOffset: rev ? (l.source < l.target ? 28 : -28) : 0 };
    });
    linkDataRef.current = linkData;

    // ── Simulation ───────────────────────────────────────────────────────────
    const hasCached = nodeData.some(n => posMapRef.current.has(n.id));

    const simulation = d3.forceSimulation(nodeData)
      .force('link', d3.forceLink(linkData).id(d => d.id)
        .distance(d => (d.source.type==='world'||d.target.type==='world') ? 180 : 120)
        .strength(0.55))
      .force('charge', d3.forceManyBody().strength(-560))
      .force('center', d3.forceCenter(width/2, height/2).strength(0.05))
      .force('collision', d3.forceCollide(d => d.isCluster ? 44 : 36));

    if (hasCached) simulation.alpha(0.3);

    // ── Links ────────────────────────────────────────────────────────────────
    const linksG = g.append('g');
    const link = linksG.selectAll('path').data(linkData).join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#30363d')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', d => Math.max(1.5, Math.min(5, Math.log2(d.count+1)*1.6)))
      .attr('marker-end', 'url(#arrow)')
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('stroke','#58a6ff').attr('marker-end','url(#arrow-focus)');
        setTooltip({ visible: true, x: event.clientX, y: event.clientY, kind: 'link', data: d });
      })
      .on('mousemove', ev => setTooltip(p => ({ ...p, x: ev.clientX, y: ev.clientY })))
      .on('mouseleave', function() {
        applyFocus();
        setTooltip(p => ({ ...p, visible: false }));
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        if (onEdgeClick) onEdgeClick(d);
      });
    linkSelRef.current = link;

    // ── Link labels ──────────────────────────────────────────────────────────
    const labelsG = g.append('g');
    const linkLabel = labelsG.selectAll('text').data(linkData).join('text')
      .attr('class', 'link-label')
      .attr('text-anchor', 'middle')
      .attr('fill', '#6e7681')
      .attr('font-size', 9.5)
      .attr('font-family', 'Roboto Mono, monospace')
      .attr('pointer-events', 'none')
      .attr('opacity', 0.65)
      .text(d => `${d.asset.split('.')[0]} ${formatAmount(d.amount, d.asset)} ×${d.count}`);
    labelSelRef.current = linkLabel;

    // ── Flow animation dots ──────────────────────────────────────────────────
    const pathRefs = [];
    link.each(function(d, i) { pathRefs[i] = this; });

    const dotGroup = g.append('g').attr('pointer-events', 'none');
    dotGrpRef.current = dotGroup;

    const dotData = linkData.map((l, i) => ({
      pathIdx: i,
      t: Math.random(),
      speed: Math.max(0.0008, Math.min(0.004, l.count * 0.0009)),
    }));

    const dotEls = dotGroup.selectAll('circle').data(dotData).join('circle')
      .attr('class', 'flow-dot')
      .attr('r', 2.8)
      .attr('fill', '#79c0ff')
      .attr('opacity', animOn ? 0.6 : 0);

    let rafId;
    let animRunning = true;

    function animTick() {
      if (!animRunning) return;
      dotEls.each(function(dot) {
        const pathEl = pathRefs[dot.pathIdx];
        if (!pathEl) return;
        dot.t = (dot.t + dot.speed) % 1;
        try {
          const len = pathEl.getTotalLength();
          if (len > 0) {
            const pt = pathEl.getPointAtLength(dot.t * len);
            d3.select(this).attr('cx', pt.x).attr('cy', pt.y);
          }
        } catch(e) {}
      });
      rafId = requestAnimationFrame(animTick);
    }

    if (animOn) animTick();

    // ── Nodes ────────────────────────────────────────────────────────────────
    const nodesG = g.append('g');
    const node = nodesG.selectAll('g').data(nodeData).join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (ev, d) => { if (!ev.active) simulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on('drag',  (ev, d) => { d.fx=ev.x; d.fy=ev.y; })
        .on('end',   (ev, d) => { if (!ev.active) simulation.alphaTarget(0); d.fx=null; d.fy=null; })
      );
    nodeSelRef.current = node;

    // Glow halo
    node.append('circle')
      .attr('class', 'glow-ring')
      .attr('r', d => d.isCluster ? 32 : 26)
      .attr('fill', d => NODE_COLORS[d.isCluster ? 'cluster' : d.type]?.glow || 'rgba(63,185,80,0.3)')
      .attr('opacity', 0).attr('pointer-events', 'none');

    // Search highlight ring
    if (highlightedIds && highlightedIds.size > 0) {
      node.filter(d => highlightedIds.has(d.id))
        .append('circle')
        .attr('r', 27).attr('fill', 'none')
        .attr('stroke', '#e3b341').attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '4 3').attr('opacity', 0.9)
        .attr('pointer-events', 'none');
    }

    // Main circle
    node.append('circle')
      .attr('class', 'main-circle')
      .attr('r', d => d.isCluster ? 22 : 18)
      .attr('fill',   d => NODE_COLORS[d.isCluster ? 'cluster' : d.type]?.fill   || '#3fb950')
      .attr('stroke', d => NODE_COLORS[d.isCluster ? 'cluster' : d.type]?.stroke || '#2ea043')
      .attr('stroke-width', d => d.isCluster ? 2.5 : 2)
      .attr('stroke-dasharray', d => d.isCluster ? '5 3' : null)
      .attr('filter', 'url(#node-glow)');

    // Letter / icon
    node.append('text')
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('fill', 'rgba(255,255,255,0.9)')
      .attr('font-size', d => d.isCluster ? 13 : 11)
      .attr('font-weight', 700).attr('pointer-events', 'none')
      .text(d => d.id.replace('@','').slice(0,1).toUpperCase());

    // Child count badge for clusters
    node.filter(d => d.isCluster).append('circle')
      .attr('cx', d => d.isCluster ? 16 : 12).attr('cy', -16)
      .attr('r', 9).attr('fill', '#8957e5').attr('stroke', '#0d1117').attr('stroke-width', 2)
      .attr('pointer-events', 'none');
    node.filter(d => d.isCluster).append('text')
      .attr('x', d => d.isCluster ? 16 : 12).attr('y', -16)
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('fill', 'white').attr('font-size', 9).attr('font-weight', 700)
      .attr('pointer-events', 'none')
      .text(d => d.childCount);

    // Label
    node.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', d => (d.isCluster ? 22 : 18) + 14)
      .attr('fill', '#8b949e').attr('font-size', 10)
      .attr('font-family', 'Roboto Mono, monospace')
      .attr('pointer-events', 'none')
      .text(d => d.id.length > 20 ? d.id.slice(0,19)+'…' : d.id);

    // ── Node interactions ────────────────────────────────────────────────────
    node
      .on('mouseenter', function(event, d) {
        event.stopPropagation();
        d3.select(this).select('.glow-ring').attr('opacity', 0.7);
        d3.select(this).select('.main-circle').attr('r', d.isCluster ? 26 : 22);
        d3.select(this).select('.node-label').attr('fill', '#c9d1d9');
        setTooltip({ visible: true, x: event.clientX, y: event.clientY, kind: 'node', data: d });
      })
      .on('mousemove', ev => setTooltip(p => ({ ...p, x: ev.clientX, y: ev.clientY })))
      .on('mouseleave', function(event, d) {
        d3.select(this).select('.glow-ring').attr('opacity', 0);
        d3.select(this).select('.main-circle').attr('r', d.isCluster ? 22 : 18);
        d3.select(this).select('.node-label').attr('fill', '#8b949e');
        setTooltip(p => ({ ...p, visible: false }));
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        if (d.isCluster) {
          // Toggle cluster expand/collapse
          if (onClusterToggle) onClusterToggle(d.id);
          return;
        }
        if (focusRef.current === d.id) {
          history.push(`/accounts/${d.id}`);
        } else {
          focusRef.current = d.id;
          applyFocus();
        }
      });

    // ── Tick ─────────────────────────────────────────────────────────────────
    simulation.on('tick', () => {
      nodeData.forEach(d => posMapRef.current.set(d.id, { x: d.x, y: d.y }));
      link.attr('d', d => computeLinkGeometry(d).path);
      linkLabel.each(function(d) {
        const { lx, ly } = computeLinkGeometry(d);
        d3.select(this).attr('x', lx).attr('y', ly);
      });
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Auto-fit once on first load
    let autoFitDone = false;
    if (!hasCached) {
      simulation.on('end', () => {
        if (autoFitDone) return;
        autoFitDone = true;
        const bbox = g.node().getBBox();
        if (!bbox.width) return;
        const pad = 60;
        const scale = Math.min((width-pad*2)/bbox.width, (height-pad*2)/bbox.height, 1.4);
        const tx = pad - bbox.x*scale + (width  - bbox.width *scale)/2;
        const ty = pad - bbox.y*scale + (height - bbox.height*scale)/2;
        svg.transition().duration(700).call(zoom.transform, d3.zoomIdentity.translate(tx,ty).scale(scale));
      });
    }

    return () => {
      animRunning = false;
      cancelAnimationFrame(rafId);
      simulation.stop();
    };
  }, [nodes, links]);

  // Sync animation on/off without restarting simulation
  useEffect(() => {
    const dg = dotGrpRef.current;
    if (!dg) return;
    dg.selectAll('circle.flow-dot').attr('opacity', animOn ? 0.6 : 0);
  }, [animOn]);

  function handleZoom(f) {
    d3.select(svgRef.current).transition().duration(280).call(zoomRef.current.scaleBy, f);
  }
  function handleReset() {
    d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
  }

  return (
    <Wrapper>
      <svg ref={svgRef} />

      <div className="graph-legend">
        <div className="legend-title">Node types</div>
        {[
          { key: 'world',   label: '@world (source)' },
          { key: 'account', label: 'Account' },
          { key: 'sub',     label: 'Sub-account' },
        ].map(({ key, label }) => (
          <div className="legend-item" key={key}>
            <div className="dot" style={{ background: NODE_COLORS[key].fill }} />
            <span>{label}</span>
          </div>
        ))}
        <div className="legend-item">
          <div className="dot-cluster" />
          <span>Cluster (click to expand)</span>
        </div>
        {highlightedIds && highlightedIds.size > 0 && (
          <div className="legend-item" style={{ marginTop: 6 }}>
            <div className="dot" style={{ background: 'transparent', border: '2px dashed #e3b341', width: 9, height: 9 }} />
            <span>Search match</span>
          </div>
        )}
      </div>

      <div className="graph-stats">
        <div className="stat-row">
          <div className="stat-value">{nodes ? nodes.length : 0}</div>
          <div className="stat-label">nodes</div>
        </div>
        <div className="stat-row">
          <div className="stat-value">{links ? links.length : 0}</div>
          <div className="stat-label">flows</div>
        </div>
      </div>

      <div className="graph-controls">
        <button title="Zoom in"     onClick={() => handleZoom(1.4)}>+</button>
        <button title="Zoom out"    onClick={() => handleZoom(0.7)}>−</button>
        <button title="Reset view"  onClick={handleReset} style={{ fontSize: 12 }}>⊙</button>
        <button
          title={animOn ? 'Disable flow animation' : 'Enable flow animation'}
          className={animOn ? 'active' : ''}
          onClick={() => setAnimOn(v => !v)}
          style={{ fontSize: 11 }}
        >
          ◎
        </button>
      </div>

      <div className="focus-hint">
        Drag · Scroll to zoom · Click node to focus · Click again to open · Click edge for detail
      </div>

      {tooltip.visible && tooltip.data && (
        <Tooltip style={{ left: tooltip.x + 16, top: tooltip.y }}>
          {tooltip.kind === 'node' && (() => {
            const d = tooltip.data;
            return (
              <>
                <div className="tt-title">{d.id}</div>
                <div className="tt-badge" style={{ background: BADGE_BG[d.isCluster ? 'cluster' : d.type], color: '#fff' }}>
                  {d.isCluster ? `cluster (${d.childCount} accounts)` : d.type}
                </div>
                <div className="tt-hint">
                  {d.isCluster ? 'Click to expand · shows sub-accounts' : 'Click to focus · Click again to open'}
                </div>
              </>
            );
          })()}

          {tooltip.kind === 'link' && (() => {
            const d = tooltip.data;
            return (
              <>
                <div className="tt-title">Fund flow</div>
                <div className="tt-row"><span className="tt-key">From</span><span className="tt-val">{d.sourceId || (d.source?.id||d.source)}</span></div>
                <div className="tt-row"><span className="tt-key">To</span><span className="tt-val">{d.targetId || (d.target?.id||d.target)}</span></div>
                <div className="tt-row"><span className="tt-key">Asset</span><span className="tt-val">{d.asset}</span></div>
                <div className="tt-row"><span className="tt-key">Total</span><span className="tt-val">{formatAmount(d.amount, d.asset)}</span></div>
                <div className="tt-row"><span className="tt-key">Transactions</span><span className="tt-val">{d.count}</span></div>
                <div className="tt-hint">Click to see all transactions on this flow</div>
              </>
            );
          })()}
        </Tooltip>
      )}
    </Wrapper>
  );
}

export default GraphVisualization;
