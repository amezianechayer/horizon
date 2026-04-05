import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import * as d3 from 'd3';
import styled from 'styled-components';

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
    background: rgba(13, 17, 23, 0.9);
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 12px 16px;
    color: #c9d1d9;
    font-size: 12px;
    font-family: 'Inter', sans-serif;

    .legend-title {
      font-weight: 600;
      margin-bottom: 8px;
      color: #f0f6fc;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;

      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
      }
    }
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
      background: rgba(13, 17, 23, 0.9);
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #c9d1d9;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;

      &:hover {
        background: #21262d;
        color: #f0f6fc;
      }
    }
  }

  .graph-stats {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(13, 17, 23, 0.9);
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 12px 16px;
    color: #c9d1d9;
    font-size: 12px;
    font-family: 'Inter', sans-serif;
    text-align: right;

    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #f0f6fc;
    }

    .stat-label {
      opacity: 0.6;
      font-size: 11px;
    }

    .stat-row {
      margin-bottom: 6px;
      &:last-child { margin-bottom: 0; }
    }
  }
`;

const Tooltip = styled.div`
  position: fixed;
  background: rgba(13, 17, 23, 0.97);
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 10px 14px;
  color: #c9d1d9;
  font-size: 12px;
  font-family: 'Roboto Mono', monospace;
  pointer-events: none;
  z-index: 9999;
  max-width: 280px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);

  .tt-title {
    font-weight: 700;
    color: #f0f6fc;
    margin-bottom: 6px;
    word-break: break-all;
  }
  .tt-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    opacity: 0.85;
    margin-bottom: 2px;
    font-size: 11px;
  }
  .tt-badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    margin-bottom: 4px;
  }
`;

// Color palette by account type
const NODE_COLORS = {
  world:   { fill: '#f85149', stroke: '#da3633', glow: 'rgba(248,81,73,0.4)' },
  sub:     { fill: '#388bfd', stroke: '#1f6feb', glow: 'rgba(56,139,253,0.4)' },
  account: { fill: '#3fb950', stroke: '#2ea043', glow: 'rgba(63,185,80,0.4)' },
};

const BADGE_COLORS = {
  world:   { bg: '#da3633', text: '#fff' },
  sub:     { bg: '#1f6feb', text: '#fff' },
  account: { bg: '#2ea043', text: '#fff' },
};

function formatAmount(amount, asset) {
  const parts = (asset || '').split('.');
  const precision = parts.length > 1 ? parseInt(parts[1], 10) : 0;
  if (precision > 0) {
    return (amount / Math.pow(10, precision)).toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  }
  return Number(amount).toLocaleString();
}

function nodeType(id) {
  if (!id) return 'account';
  if (id === '@world' || id.startsWith('@world')) return 'world';
  if (id.includes(':')) return 'sub';
  return 'account';
}

function GraphVisualization({ nodes, links }) {
  const svgRef = useRef(null);
  const zoomRef = useRef(null);
  const history = useHistory();

  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null, type: 'node' });

  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = svgEl.clientWidth || 900;
    const height = 680;

    // ── Defs: arrow markers + glow filter ──────────────────────────────────
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow marker
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 26)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#8b949e');

    defs.append('marker')
      .attr('id', 'arrow-hover')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 26)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#58a6ff');

    // ── Canvas group (zoomable) ────────────────────────────────────────────
    const g = svg.append('g');

    // ── Zoom ──────────────────────────────────────────────────────────────
    const zoom = d3.zoom()
      .scaleExtent([0.08, 6])
      .on('zoom', event => g.attr('transform', event.transform));

    svg.call(zoom);
    zoomRef.current = zoom;

    // ── Clone data so D3 can mutate freely ────────────────────────────────
    const nodeData = nodes.map(n => ({ ...n }));
    const linkData = links.map(l => ({ ...l, source: l.source, target: l.target }));

    // ── Force simulation ──────────────────────────────────────────────────
    const simulation = d3.forceSimulation(nodeData)
      .force('link', d3.forceLink(linkData).id(d => d.id).distance(d => {
        // world nodes pushed further out
        if (d.source.type === 'world' || d.target.type === 'world') return 180;
        return 120;
      }).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(38));

    // ── Grid background ───────────────────────────────────────────────────
    const gridSize = 40;
    const gridG = g.append('g').attr('class', 'grid');
    for (let x = -width; x < width * 2; x += gridSize) {
      gridG.append('line')
        .attr('x1', x).attr('y1', -height).attr('x2', x).attr('y2', height * 2)
        .attr('stroke', '#161b22').attr('stroke-width', 1);
    }
    for (let y = -height; y < height * 2; y += gridSize) {
      gridG.append('line')
        .attr('x1', -width).attr('y1', y).attr('x2', width * 2).attr('y2', y)
        .attr('stroke', '#161b22').attr('stroke-width', 1);
    }

    // ── Links ─────────────────────────────────────────────────────────────
    const linksG = g.append('g').attr('class', 'links');

    const link = linksG.selectAll('line')
      .data(linkData)
      .join('line')
      .attr('stroke', '#30363d')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', d => Math.max(1.5, Math.min(5, Math.log2(d.count + 1) * 1.5)))
      .attr('marker-end', 'url(#arrow)')
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .attr('stroke', '#58a6ff')
          .attr('stroke-opacity', 1)
          .attr('marker-end', 'url(#arrow-hover)');
        setTooltip({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          type: 'link',
          data: d,
        });
      })
      .on('mousemove', function(event) {
        setTooltip(prev => ({ ...prev, x: event.clientX, y: event.clientY }));
      })
      .on('mouseleave', function() {
        d3.select(this)
          .attr('stroke', '#30363d')
          .attr('stroke-opacity', 0.8)
          .attr('marker-end', 'url(#arrow)');
        setTooltip(prev => ({ ...prev, visible: false }));
      });

    // ── Link labels ───────────────────────────────────────────────────────
    const linkLabelG = g.append('g').attr('class', 'link-labels');

    const linkLabel = linkLabelG.selectAll('text')
      .data(linkData)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('fill', '#8b949e')
      .attr('font-size', 10)
      .attr('font-family', 'Roboto Mono, monospace')
      .attr('pointer-events', 'none')
      .text(d => `${d.asset} ${formatAmount(d.amount, d.asset)}`);

    // ── Nodes ─────────────────────────────────────────────────────────────
    const nodesG = g.append('g').attr('class', 'nodes');

    const node = nodesG.selectAll('g')
      .data(nodeData)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Outer glow ring
    node.append('circle')
      .attr('r', 24)
      .attr('fill', d => NODE_COLORS[d.type]?.glow || 'rgba(63,185,80,0.3)')
      .attr('class', 'glow-ring')
      .attr('opacity', 0);

    // Main circle
    node.append('circle')
      .attr('r', 18)
      .attr('fill', d => NODE_COLORS[d.type]?.fill || '#3fb950')
      .attr('stroke', d => NODE_COLORS[d.type]?.stroke || '#2ea043')
      .attr('stroke-width', 2)
      .attr('filter', 'url(#glow)');

    // Icon letter
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', 11)
      .attr('font-weight', 700)
      .attr('pointer-events', 'none')
      .text(d => d.id.replace('@', '').slice(0, 1).toUpperCase());

    // Label below
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 34)
      .attr('fill', '#c9d1d9')
      .attr('font-size', 10)
      .attr('font-family', 'Roboto Mono, monospace')
      .attr('pointer-events', 'none')
      .text(d => {
        const label = d.id;
        return label.length > 18 ? label.slice(0, 17) + '…' : label;
      });

    // Node interactions
    node
      .on('mouseenter', function(event, d) {
        d3.select(this).select('.glow-ring').attr('opacity', 0.6);
        d3.select(this).select('circle:not(.glow-ring)').attr('r', 22);
        setTooltip({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          type: 'node',
          data: d,
        });
      })
      .on('mousemove', function(event) {
        setTooltip(prev => ({ ...prev, x: event.clientX, y: event.clientY }));
      })
      .on('mouseleave', function() {
        d3.select(this).select('.glow-ring').attr('opacity', 0);
        d3.select(this).select('circle:not(.glow-ring)').attr('r', 18);
        setTooltip(prev => ({ ...prev, visible: false }));
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        history.push(`/accounts/${d.id}`);
      });

    // ── Simulation tick ───────────────────────────────────────────────────
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 6);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Auto-fit after simulation stabilizes
    simulation.on('end', () => {
      const bbox = g.node().getBBox();
      if (bbox.width === 0) return;
      const padding = 60;
      const scaleX = (width - padding * 2) / bbox.width;
      const scaleY = (height - padding * 2) / bbox.height;
      const scale = Math.min(scaleX, scaleY, 1.5);
      const tx = padding - bbox.x * scale + (width - bbox.width * scale) / 2;
      const ty = padding - bbox.y * scale + (height - bbox.height * scale) / 2;
      svg.transition().duration(600).call(
        zoom.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  // Zoom controls
  function handleZoom(factor) {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomRef.current.scaleBy, factor);
  }

  function handleReset() {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity.scale(1));
  }

  const nodeCount = nodes ? nodes.length : 0;
  const linkCount = links ? links.length : 0;

  return (
    <Wrapper>
      <svg ref={svgRef} />

      {/* Legend */}
      <div className="graph-legend">
        <div className="legend-title">Account types</div>
        <div className="legend-item">
          <div className="dot" style={{ background: NODE_COLORS.world.fill }} />
          <span>@world (source)</span>
        </div>
        <div className="legend-item">
          <div className="dot" style={{ background: NODE_COLORS.account.fill }} />
          <span>Account</span>
        </div>
        <div className="legend-item">
          <div className="dot" style={{ background: NODE_COLORS.sub.fill }} />
          <span>Sub-account</span>
        </div>
      </div>

      {/* Stats */}
      <div className="graph-stats">
        <div className="stat-row">
          <div className="stat-value">{nodeCount}</div>
          <div className="stat-label">accounts</div>
        </div>
        <div className="stat-row">
          <div className="stat-value">{linkCount}</div>
          <div className="stat-label">flows</div>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="graph-controls">
        <button title="Zoom in" onClick={() => handleZoom(1.4)}>+</button>
        <button title="Zoom out" onClick={() => handleZoom(0.7)}>−</button>
        <button title="Reset view" onClick={handleReset} style={{ fontSize: 12 }}>⊙</button>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.data && (
        <Tooltip style={{ left: tooltip.x + 14, top: tooltip.y - 20 }}>
          {tooltip.type === 'node' && (
            <>
              <div className="tt-title">{tooltip.data.id}</div>
              <div
                className="tt-badge"
                style={{
                  background: BADGE_COLORS[tooltip.data.type]?.bg,
                  color: BADGE_COLORS[tooltip.data.type]?.text,
                }}
              >
                {tooltip.data.type}
              </div>
              <div className="tt-row"><span style={{ opacity: 0.6 }}>Click to open account</span></div>
            </>
          )}
          {tooltip.type === 'link' && (
            <>
              <div className="tt-title">Fund flow</div>
              <div className="tt-row">
                <span style={{ opacity: 0.6 }}>From</span>
                <span>{tooltip.data.source?.id || tooltip.data.source}</span>
              </div>
              <div className="tt-row">
                <span style={{ opacity: 0.6 }}>To</span>
                <span>{tooltip.data.target?.id || tooltip.data.target}</span>
              </div>
              <div className="tt-row">
                <span style={{ opacity: 0.6 }}>Asset</span>
                <span>{tooltip.data.asset}</span>
              </div>
              <div className="tt-row">
                <span style={{ opacity: 0.6 }}>Total</span>
                <span>{formatAmount(tooltip.data.amount, tooltip.data.asset)}</span>
              </div>
              <div className="tt-row">
                <span style={{ opacity: 0.6 }}>Transactions</span>
                <span>{tooltip.data.count}</span>
              </div>
            </>
          )}
        </Tooltip>
      )}
    </Wrapper>
  );
}

export default GraphVisualization;
