import * as React from 'react';
import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import styled, { keyframes } from 'styled-components';
import { buildGraph, applyClustering } from '../lib/buildGraph';
import EdgeDetailPanel from './EdgeDetailPanel.jsx';

const KIND_COLOR = {
  bank: '#1565c0', client: '#2e7d32', supplier: '#e65100',
  contracts: '#6a1b9a', world: '#607d8b', other: '#9e9e9e',
};

// Darker ring color for meta-nodes
const KIND_RING = {
  bank: '#0d3d75', client: '#1b4d1f', supplier: '#8a3100',
  contracts: '#3d0f5a', world: '#37474f', other: '#616161',
};

// All known kinds in a stable order for centroid layout
const KIND_ORDER = ['bank', 'client', 'supplier', 'contracts', 'world', 'other'];

// Keyframe: dashes travel in the direction source→target (dashoffset decreases)
const flowAnim = keyframes`
  to { stroke-dashoffset: -16; }
`;

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  height: 520px;

  svg {
    width: 100%;
    height: 100%;
    display: block;
    background: #fafbfc;
    border-radius: 8px;
  }

  /* Dash-flow animation applied to d3-created lines that carry the class */
  .flow-link {
    stroke-dasharray: 6 6;
    animation: ${flowAnim} 0.6s linear infinite;
  }

  .empty { padding: 60px; text-align: center; opacity: 0.5; }

  .hint {
    position: absolute;
    bottom: 8px;
    left: 12px;
    font-size: 11px;
    color: #888;
    pointer-events: none;
  }
`;

export default function FlowGraph({ flows, asset, animate, collapsed, onToggleKind }) {
  const svgRef = useRef(null);

  const [hoveredEdge, setHoveredEdge] = useState(null);

  // Default animate to true
  const doAnimate = animate !== false;

  // The main d3 effect — rebuilds whenever flows, asset, collapsed, or animate changes.
  useEffect(() => {
    const full = buildGraph(flows, asset);
    if (!svgRef.current || full.nodes.length === 0) return undefined;

    // Apply clustering on top of the full graph
    const g = applyClustering(full, collapsed || []);

    const svgEl  = svgRef.current;
    const svg    = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width  = svgEl.clientWidth  || 900;
    const height = svgEl.clientHeight || 520;

    const maxAmount = d3.max(g.links, d => d.amount) || 1;
    const maxVol    = d3.max(g.nodes, d => d.volume) || 1;

    // Meta-nodes get a boosted minimum radius
    const radius = (d) => {
      const base = 6 + 18 * Math.sqrt(d.volume / maxVol);
      return d.meta ? Math.max(base * 1.35, 22) : base;
    };
    const strokeW = (d) => 1 + 5 * (d.amount / maxAmount);

    // --- Cluster centroids: lay kinds on a circle around center ---
    const kindsPresent = [...new Set(g.nodes.map(n => n.kind))];
    const orderedKinds = KIND_ORDER.filter(k => kindsPresent.includes(k))
      .concat(kindsPresent.filter(k => !KIND_ORDER.includes(k)));
    const clusterR = Math.min(width, height) * 0.32;
    const centroidMap = {};
    orderedKinds.forEach((k, i) => {
      const angle = (2 * Math.PI * i) / orderedKinds.length - Math.PI / 2;
      centroidMap[k] = {
        x: width  / 2 + clusterR * Math.cos(angle),
        y: height / 2 + clusterR * Math.sin(angle),
      };
    });
    const centroid = (kind) => centroidMap[kind] || {x: width / 2, y: height / 2};

    const root = svg.append('g');

    // --- Zoom (double-click on canvas re-collapses defaults) ---
    const zoomBehavior = d3.zoom().scaleExtent([0.1, 6]).on('zoom', (e) => root.attr('transform', e.transform));
    svg.call(zoomBehavior);

    svg.on('dblclick.zoom', null); // disable default d3 dblclick-to-zoom on the svg
    svg.on('dblclick', null); // double-click expand is now driven by the legend

    svg.append('defs').append('marker')
      .attr('id', 'fg-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 22)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#bbb');

    // --- Links ---
    const link = root.append('g').selectAll('line').data(g.links).join('line')
      .attr('class', doAnimate ? 'flow-link' : null)
      .attr('stroke', '#cfd6dd')
      .attr('stroke-width', strokeW)
      .attr('marker-end', 'url(#fg-arrow)');

    // --- Nodes ---
    const node = root.append('g').selectAll('circle').data(g.nodes).join('circle')
      .attr('r', radius)
      .attr('fill', d => KIND_COLOR[d.kind] || KIND_COLOR.other)
      .attr('stroke', d => d.meta ? (KIND_RING[d.kind] || '#333') : '#fff')
      .attr('stroke-width', d => d.meta ? 3 : 1.5)
      .style('cursor', d => d.meta ? 'pointer' : 'grab');

    node.append('title').text(d =>
      d.meta
        ? d.id + '  (' + d.members + ' membres, vol ' + d.volume + ') — clic pour développer'
        : d.id + '  (vol ' + d.volume + ')'
    );

    // --- Labels ---
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const label = root.append('g').selectAll('text').data(g.nodes).join('text')
      .text(d => {
        if (d.meta) return capitalize(d.kind) + ' (' + d.members + ')';
        return d.id.length > 22 ? d.id.slice(0, 21) + '…' : d.id;
      })
      .attr('font-size', d => d.meta ? 12 : 10)
      .attr('font-weight', d => d.meta ? 'bold' : 'normal')
      .attr('fill', '#333');

    // --- Simulation ---
    const simulation = d3.forceSimulation(g.nodes)
      .force('link', d3.forceLink(g.links).id(d => d.id).distance(d => 60 + 120 * (1 - d.amount / maxAmount)))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => radius(d) + 6))
      // Cluster forces: pull each node toward its kind's centroid
      .force('clusterX', d3.forceX(d => centroid(d.kind).x).strength(0.08))
      .force('clusterY', d3.forceY(d => centroid(d.kind).y).strength(0.08))
      .on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        node.attr('cx', d => d.x).attr('cy', d => d.y);
        label.attr('x', d => d.x + radius(d) + 3).attr('y', d => d.y + 3);
      });

    // --- Drag ---
    // d3-drag suppresses the native click event, so we detect a "click" (no movement)
    // inside the drag handlers: dragMoved=false means no drag event fired → it was a click.
    let dragMoved = false;
    const drag = d3.drag()
      .on('start', (e, d) => {
        dragMoved = false;
        if (!e.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (e, d) => {
        dragMoved = true;
        d.fx = e.x; d.fy = e.y;
      })
      .on('end', (e, d) => {
        if (!e.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
        if (!dragMoved && d.meta) {
          // No movement → treat as a click → expand the collapsed cluster (bonus path)
          if (onToggleKind) onToggleKind(d.kind);
        }
      });
    node.call(drag);

    // --- Edge hover ---
    link
      .on('mouseover', (e, d) => {
        d3.select(e.currentTarget)
          .attr('stroke', '#13e07e')
          .attr('stroke-width', strokeW(d) + 2)
          .raise();
        setHoveredEdge({ ...d, asset });
      })
      .on('mouseout', (e, d) => {
        d3.select(e.currentTarget)
          .attr('stroke', '#cfd6dd')
          .attr('stroke-width', strokeW(d));
        setHoveredEdge(null);
      });

    // --- Node hover: dim non-incident nodes + links ---
    node
      .on('mouseover', (e, d) => {
        if (d.meta) return; // meta-node expand handled on click, not hover dim
        const incidentLinks = new Set();
        const incidentNodes = new Set([d.id]);
        g.links.forEach(l => {
          const srcId = l.source.id !== undefined ? l.source.id : l.source;
          const tgtId = l.target.id !== undefined ? l.target.id : l.target;
          if (srcId === d.id || tgtId === d.id) {
            incidentLinks.add(l);
            incidentNodes.add(srcId);
            incidentNodes.add(tgtId);
          }
        });
        node.style('opacity', n => incidentNodes.has(n.id) ? 1 : 0.15);
        label.style('opacity', n => incidentNodes.has(n.id) ? 1 : 0.15);
        link.style('opacity', l => incidentLinks.has(l) ? 1 : 0.1);
      })
      .on('mouseout', () => {
        node.style('opacity', 1);
        label.style('opacity', 1);
        link.style('opacity', 1);
      });

    return () => { simulation.stop(); };
  }, [flows, asset, collapsed, doAnimate, onToggleKind]);

  const full = buildGraph(flows, asset);
  return (
    <Wrapper>
      {full.nodes.length === 0
        ? <div className="empty">Aucun flux à afficher.</div>
        : (
          <>
            <svg ref={svgRef} />
            <EdgeDetailPanel edge={hoveredEdge} />
            <div className="hint">
              Clic sur un groupe pour le développer · Utilisez la légende pour grouper/dégrouper
            </div>
          </>
        )
      }
    </Wrapper>
  );
}
