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
      font-weight: 600;
      margin-bottom: 8px;
      color: #f0f6fc;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      &:last-child { margin-bottom: 0; }
      .dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
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
    .stat-row { margin-bottom: 6px; &:last-child { margin-bottom: 0; } }
  }

  .graph-controls {
    position: absolute;
    bottom: 16px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    button {
      width: 32px;
      height: 32px;
      background: rgba(13,17,23,0.92);
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #c9d1d9;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
      &:hover { background: #21262d; color: #f0f6fc; }
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
    color: rgba(201,209,217,0.55);
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
  color: #c9d1d9;
  font-size: 12px;
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
    display: inline-block;
    padding: 1px 7px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .tt-hint {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid #21262d;
    font-size: 10px;
    opacity: 0.45;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const NODE_COLORS = {
  world:   { fill: '#f85149', stroke: '#da3633', glow: 'rgba(248,81,73,0.35)' },
  sub:     { fill: '#388bfd', stroke: '#1f6feb', glow: 'rgba(56,139,253,0.35)' },
  account: { fill: '#3fb950', stroke: '#2ea043', glow: 'rgba(63,185,80,0.35)' },
};

const BADGE_BG = { world: '#da3633', sub: '#1f6feb', account: '#2ea043' };

const NODE_RADIUS = 18;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatAmount(amount, asset) {
  const parts = (asset || '').split('.');
  const precision = parts.length > 1 ? parseInt(parts[1], 10) : 0;
  const assetName = parts[0];
  const value = precision > 0 ? amount / Math.pow(10, precision) : amount;
  const formatted = value.toLocaleString('fr-FR', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  return `${formatted} ${assetName}`;
}

/**
 * Compute SVG path d-attribute and label midpoint for a link.
 * If curveOffset != 0, a quadratic bezier is used (bidirectional edges).
 */
function computeLinkGeometry(d) {
  const sx = d.source.x, sy = d.source.y;
  const tx = d.target.x, ty = d.target.y;
  const dx = tx - sx, dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  // Unit vectors
  const ux = dx / len, uy = dy / len;
  // Perpendicular unit vector (rotated 90° CCW)
  const nx = -uy, ny = ux;

  const offset = d.curveOffset || 0;

  if (offset === 0) {
    return {
      path: `M ${sx},${sy} L ${tx},${ty}`,
      lx: (sx + tx) / 2,
      ly: (sy + ty) / 2 - 9,
    };
  }

  // Quadratic bezier control point
  const cx = (sx + tx) / 2 + nx * offset;
  const cy = (sy + ty) / 2 + ny * offset;

  // Midpoint of bezier (t=0.5): 0.25*P0 + 0.5*P1 + 0.25*P2
  const lx = 0.25 * sx + 0.5 * cx + 0.25 * tx;
  const ly = 0.25 * sy + 0.5 * cy + 0.25 * ty - 9;

  return {
    path: `M ${sx},${sy} Q ${cx},${cy} ${tx},${ty}`,
    lx,
    ly,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GraphVisualization component
// ─────────────────────────────────────────────────────────────────────────────

function GraphVisualization({ nodes, links, highlightedIds }) {
  const svgRef      = useRef(null);
  const zoomRef     = useRef(null);
  const posMapRef   = useRef(new Map());   // persists node positions across re-renders
  const focusRef    = useRef(null);        // currently focused nodeId
  const nodeSelRef  = useRef(null);        // d3 node selection
  const linkSelRef  = useRef(null);        // d3 link selection
  const labelSelRef = useRef(null);        // d3 link-label selection
  const linkDataRef = useRef([]);          // mutated linkData (with d3 source/target objects)

  const history = useHistory();

  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, kind: 'node', data: null });

  // ── applyFocus: dim/highlight based on focusRef.current ──────────────────
  function applyFocus() {
    const nodesSel  = nodeSelRef.current;
    const linksSel  = linkSelRef.current;
    const labelsSel = labelSelRef.current;
    const lData     = linkDataRef.current;
    if (!nodesSel) return;

    const focusedId = focusRef.current;

    if (!focusedId) {
      nodesSel.attr('opacity', 1);
      linksSel
        .attr('opacity', 0.8)
        .attr('stroke', '#30363d')
        .attr('marker-end', 'url(#arrow)');
      labelsSel.attr('opacity', 0.65);
      return;
    }

    // Collect all directly connected node IDs
    const connected = new Set([focusedId]);
    lData.forEach(l => {
      const s = l.source.id || l.source;
      const t = l.target.id || l.target;
      if (s === focusedId) connected.add(t);
      if (t === focusedId) connected.add(s);
    });

    nodesSel.attr('opacity', d => connected.has(d.id) ? 1 : 0.07);

    linksSel
      .attr('opacity', d => {
        const s = d.source.id || d.source;
        const t = d.target.id || d.target;
        return (s === focusedId || t === focusedId) ? 1 : 0.04;
      })
      .attr('stroke', d => {
        const s = d.source.id || d.source;
        const t = d.target.id || d.target;
        return (s === focusedId || t === focusedId) ? '#58a6ff' : '#21262d';
      })
      .attr('marker-end', d => {
        const s = d.source.id || d.source;
        const t = d.target.id || d.target;
        return (s === focusedId || t === focusedId) ? 'url(#arrow-focus)' : 'url(#arrow)';
      });

    labelsSel.attr('opacity', d => {
      const s = d.source.id || d.source;
      const t = d.target.id || d.target;
      return (s === focusedId || t === focusedId) ? 1 : 0;
    });
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

    // Glow filter
    const gf = defs.append('filter').attr('id', 'node-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    gf.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '3').attr('result', 'blur');
    const gfm = gf.append('feMerge');
    gfm.append('feMergeNode').attr('in', 'blur');
    gfm.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow markers
    function addArrow(id, color) {
      defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)   // accounts for node radius + small gap
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L9,0L0,4')
        .attr('fill', color);
    }
    addArrow('arrow',       '#8b949e');
    addArrow('arrow-focus', '#58a6ff');
    addArrow('arrow-hl',    '#f0f6fc');

    // ── Container for zoom ──────────────────────────────────────────────────
    const g = svg.append('g');

    // ── Zoom ────────────────────────────────────────────────────────────────
    const zoom = d3.zoom()
      .scaleExtent([0.06, 8])
      .on('zoom', ev => g.attr('transform', ev.transform));
    svg.call(zoom);
    zoomRef.current = zoom;

    // Clear focus when clicking on background
    svg.on('click', () => {
      focusRef.current = null;
      applyFocus();
      setTooltip(p => ({ ...p, visible: false }));
    });

    // ── Subtle grid background ───────────────────────────────────────────────
    const gs = 50;
    const gridG = g.append('g').attr('class', 'grid').attr('pointer-events', 'none');
    for (let x = -width; x < width * 3; x += gs)
      gridG.append('line').attr('x1', x).attr('y1', -height).attr('x2', x).attr('y2', height * 3).attr('stroke', '#161b22').attr('stroke-width', 1);
    for (let y = -height; y < height * 3; y += gs)
      gridG.append('line').attr('x1', -width).attr('y1', y).attr('x2', width * 3).attr('y2', y).attr('stroke', '#161b22').attr('stroke-width', 1);

    // ── Clone data, restoring cached positions ───────────────────────────────
    const nodeData = nodes.map(n => {
      const pos = posMapRef.current.get(n.id);
      return {
        ...n,
        x: pos ? pos.x : (width / 2 + (Math.random() - 0.5) * 200),
        y: pos ? pos.y : (height / 2 + (Math.random() - 0.5) * 200),
      };
    });

    // ── Bidirectional edge detection (before D3 mutates source/target) ──────
    const edgeKeys = new Set(links.map(l => `${l.source}||${l.target}`));
    const linkData = links.map(l => {
      const reverseExists = edgeKeys.has(`${l.target}||${l.source}`);
      let curveOffset = 0;
      if (reverseExists) {
        // Assign consistent offset direction based on string comparison
        curveOffset = l.source < l.target ? 28 : -28;
      }
      return { ...l, curveOffset };
    });
    linkDataRef.current = linkData;

    // ── Force simulation ─────────────────────────────────────────────────────
    const simulation = d3.forceSimulation(nodeData)
      .force('link',
        d3.forceLink(linkData)
          .id(d => d.id)
          .distance(d => {
            if (d.source.type === 'world' || d.target.type === 'world') return 160;
            return 115;
          })
          .strength(0.55)
      )
      .force('charge', d3.forceManyBody().strength(-520))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collision', d3.forceCollide(38));

    // Give cached nodes lower alpha so they don't jump much
    const hasCached = nodeData.some(n => posMapRef.current.has(n.id));
    if (hasCached) simulation.alpha(0.3);

    // ── Draw links (using <path> for bidirectional curve support) ────────────
    const linksG = g.append('g').attr('class', 'links');
    const link = linksG.selectAll('path')
      .data(linkData)
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#30363d')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', d => Math.max(1.5, Math.min(5, Math.log2(d.count + 1) * 1.6)))
      .attr('marker-end', 'url(#arrow)')
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('stroke', '#58a6ff').attr('marker-end', 'url(#arrow-focus)');
        setTooltip({
          visible: true, x: event.clientX, y: event.clientY,
          kind: 'link', data: d,
        });
      })
      .on('mousemove', event => setTooltip(p => ({ ...p, x: event.clientX, y: event.clientY })))
      .on('mouseleave', function() {
        applyFocus(); // restore correct state
        setTooltip(p => ({ ...p, visible: false }));
      });

    // ── Link labels ──────────────────────────────────────────────────────────
    const labelsG = g.append('g').attr('class', 'link-labels');
    const linkLabel = labelsG.selectAll('text')
      .data(linkData)
      .join('text')
      .attr('class', 'link-label')
      .attr('text-anchor', 'middle')
      .attr('fill', '#6e7681')
      .attr('font-size', 9.5)
      .attr('font-family', 'Roboto Mono, monospace')
      .attr('pointer-events', 'none')
      .attr('opacity', 0.65)
      .text(d => `${d.asset.split('.')[0]} ${formatAmount(d.amount, d.asset)} ×${d.count}`);

    nodeSelRef.current  = null; // will be set below
    linkSelRef.current  = link;
    labelSelRef.current = linkLabel;

    // ── Draw nodes ───────────────────────────────────────────────────────────
    const nodesG = g.append('g').attr('class', 'nodes');

    const node = nodesG.selectAll('g')
      .data(nodeData)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (ev, d) => { if (!ev.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
        .on('end',   (ev, d) => { if (!ev.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    nodeSelRef.current = node;

    // Glow halo (hidden by default, shown on hover / focus)
    node.append('circle')
      .attr('class', 'glow-ring')
      .attr('r', 26)
      .attr('fill', d => NODE_COLORS[d.type]?.glow || 'rgba(63,185,80,0.3)')
      .attr('opacity', 0)
      .attr('pointer-events', 'none');

    // Special highlight ring for search-matched nodes
    if (highlightedIds && highlightedIds.size > 0) {
      node.filter(d => highlightedIds.has(d.id))
        .append('circle')
        .attr('class', 'search-ring')
        .attr('r', 25)
        .attr('fill', 'none')
        .attr('stroke', '#e3b341')
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '4 3')
        .attr('opacity', 0.9)
        .attr('pointer-events', 'none');
    }

    // Main body
    node.append('circle')
      .attr('class', 'main-circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', d => NODE_COLORS[d.type]?.fill || '#3fb950')
      .attr('stroke', d => NODE_COLORS[d.type]?.stroke || '#2ea043')
      .attr('stroke-width', 2)
      .attr('filter', 'url(#node-glow)');

    // Initial letter icon
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', 'rgba(255,255,255,0.9)')
      .attr('font-size', 11)
      .attr('font-weight', 700)
      .attr('pointer-events', 'none')
      .text(d => d.id.replace('@', '').slice(0, 1).toUpperCase());

    // Label below node
    node.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', NODE_RADIUS + 14)
      .attr('fill', '#8b949e')
      .attr('font-size', 10)
      .attr('font-family', 'Roboto Mono, monospace')
      .attr('pointer-events', 'none')
      .text(d => d.id.length > 20 ? d.id.slice(0, 19) + '…' : d.id);

    // ── Node interactions ────────────────────────────────────────────────────
    node
      .on('mouseenter', function(event, d) {
        event.stopPropagation();
        d3.select(this).select('.glow-ring').attr('opacity', 0.7);
        d3.select(this).select('.main-circle').attr('r', 22);
        d3.select(this).select('.node-label').attr('fill', '#c9d1d9');
        setTooltip({ visible: true, x: event.clientX, y: event.clientY, kind: 'node', data: d });
      })
      .on('mousemove', event => setTooltip(p => ({ ...p, x: event.clientX, y: event.clientY })))
      .on('mouseleave', function() {
        d3.select(this).select('.glow-ring').attr('opacity', 0);
        d3.select(this).select('.main-circle').attr('r', NODE_RADIUS);
        d3.select(this).select('.node-label').attr('fill', '#8b949e');
        setTooltip(p => ({ ...p, visible: false }));
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        if (focusRef.current === d.id) {
          // Second click → navigate to account
          history.push(`/accounts/${d.id}`);
        } else {
          // First click → focus node
          focusRef.current = d.id;
          applyFocus();
        }
      });

    // ── Tick ─────────────────────────────────────────────────────────────────
    simulation.on('tick', () => {
      // Update position cache
      nodeData.forEach(d => posMapRef.current.set(d.id, { x: d.x, y: d.y }));

      // Update link paths
      link.attr('d', d => computeLinkGeometry(d).path);

      // Update link labels
      linkLabel.each(function(d) {
        const { lx, ly } = computeLinkGeometry(d);
        d3.select(this).attr('x', lx).attr('y', ly);
      });

      // Update node positions
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Auto-fit when simulation stabilises (only on fresh load, not cached)
    if (!hasCached) {
      simulation.on('end', () => {
        const bbox = g.node().getBBox();
        if (!bbox.width) return;
        const pad = 60;
        const scale = Math.min(
          (width  - pad * 2) / bbox.width,
          (height - pad * 2) / bbox.height,
          1.4
        );
        const tx = pad - bbox.x * scale + (width  - bbox.width  * scale) / 2;
        const ty = pad - bbox.y * scale + (height - bbox.height * scale) / 2;
        svg.transition().duration(700).call(
          zoom.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
      });
    }

    return () => { simulation.stop(); };
  }, [nodes, links]);

  // ── Zoom controls ────────────────────────────────────────────────────────
  function handleZoom(factor) {
    d3.select(svgRef.current).transition().duration(280).call(zoomRef.current.scaleBy, factor);
  }
  function handleReset() {
    d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
  }

  return (
    <Wrapper>
      <svg ref={svgRef} />

      {/* Legend */}
      <div className="graph-legend">
        <div className="legend-title">Account types</div>
        {[
          { type: 'world',   label: '@world (infinite source)' },
          { type: 'account', label: 'Account' },
          { type: 'sub',     label: 'Sub-account' },
        ].map(({ type, label }) => (
          <div className="legend-item" key={type}>
            <div className="dot" style={{ background: NODE_COLORS[type].fill }} />
            <span>{label}</span>
          </div>
        ))}
        {highlightedIds && highlightedIds.size > 0 && (
          <div className="legend-item" style={{ marginTop: 6 }}>
            <div className="dot" style={{ background: 'transparent', border: '2px dashed #e3b341', width: 9, height: 9 }} />
            <span>Search match</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="graph-stats">
        <div className="stat-row">
          <div className="stat-value">{nodes ? nodes.length : 0}</div>
          <div className="stat-label">accounts</div>
        </div>
        <div className="stat-row">
          <div className="stat-value">{links ? links.length : 0}</div>
          <div className="stat-label">flows</div>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="graph-controls">
        <button title="Zoom in"  onClick={() => handleZoom(1.4)}>+</button>
        <button title="Zoom out" onClick={() => handleZoom(0.7)}>−</button>
        <button title="Reset"    onClick={handleReset} style={{ fontSize: 12 }}>⊙</button>
      </div>

      {/* Hint */}
      <div className="focus-hint">
        Drag · Scroll to zoom · Click to focus · Double-click to open account
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.data && (
        <Tooltip style={{ left: tooltip.x + 16, top: tooltip.y }}>
          {tooltip.kind === 'node' && (() => {
            const d = tooltip.data;
            return (
              <>
                <div className="tt-title">{d.id}</div>
                <div className="tt-badge" style={{ background: BADGE_BG[d.type], color: '#fff' }}>
                  {d.type}
                </div>
                {highlightedIds && highlightedIds.has(d.id) && (
                  <div className="tt-badge" style={{ background: '#9e6a03', color: '#fff', marginLeft: 4 }}>
                    search match
                  </div>
                )}
                <div className="tt-hint">Click to focus connections · Click again to open</div>
              </>
            );
          })()}

          {tooltip.kind === 'link' && (() => {
            const d = tooltip.data;
            const srcId = d.source?.id || d.source;
            const tgtId = d.target?.id || d.target;
            return (
              <>
                <div className="tt-title">Fund flow</div>
                <div className="tt-row"><span className="tt-key">From</span><span className="tt-val">{srcId}</span></div>
                <div className="tt-row"><span className="tt-key">To</span><span className="tt-val">{tgtId}</span></div>
                <div className="tt-row"><span className="tt-key">Asset</span><span className="tt-val">{d.asset}</span></div>
                <div className="tt-row"><span className="tt-key">Total</span><span className="tt-val">{formatAmount(d.amount, d.asset)}</span></div>
                <div className="tt-row"><span className="tt-key">Transactions</span><span className="tt-val">{d.count}</span></div>
              </>
            );
          })()}
        </Tooltip>
      )}
    </Wrapper>
  );
}

export default GraphVisualization;
