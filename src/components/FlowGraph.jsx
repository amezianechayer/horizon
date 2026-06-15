import * as React from 'react';
import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import styled, { keyframes } from 'styled-components';
import { buildGraph } from '../lib/buildGraph';
import EdgeDetailPanel from './EdgeDetailPanel.jsx';

const KIND_COLOR = {
  bank: '#1565c0', client: '#2e7d32', supplier: '#e65100',
  contracts: '#6a1b9a', world: '#607d8b', other: '#9e9e9e',
};

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
`;

export default function FlowGraph({ flows, asset, animate }) {
  const ref      = useRef(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);

  // Default animate to true
  const doAnimate = animate !== false;

  useEffect(() => {
    const g      = buildGraph(flows, asset);
    const svgEl  = ref.current;
    if (!svgEl || g.nodes.length === 0) return undefined;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width  = svgEl.clientWidth  || 900;
    const height = svgEl.clientHeight || 520;

    const maxAmount = d3.max(g.links, d => d.amount) || 1;
    const maxVol    = d3.max(g.nodes, d => d.volume) || 1;
    const radius    = d => 6 + 18 * Math.sqrt(d.volume / maxVol);
    const strokeW   = d => 1 + 5 * (d.amount / maxAmount);

    const root = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.1, 6]).on('zoom', (e) => root.attr('transform', e.transform)));

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
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'grab');
    node.append('title').text(d => d.id + '  (vol ' + d.volume + ')');

    // --- Labels ---
    const label = root.append('g').selectAll('text').data(g.nodes).join('text')
      .text(d => d.id.length > 22 ? d.id.slice(0, 21) + '…' : d.id)
      .attr('font-size', 10)
      .attr('fill', '#333');

    // --- Simulation ---
    const simulation = d3.forceSimulation(g.nodes)
      .force('link', d3.forceLink(g.links).id(d => d.id).distance(d => 60 + 120 * (1 - d.amount / maxAmount)))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => radius(d) + 6))
      .on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        node.attr('cx', d => d.x).attr('cy', d => d.y);
        label.attr('x', d => d.x + radius(d) + 3).attr('y', d => d.y + 3);
      });

    // --- Drag ---
    node.call(d3.drag()
      .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end',   (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    // --- Edge hover ---
    link
      .on('mouseover', (e, d) => {
        d3.select(e.currentTarget)
          .attr('stroke', '#13e07e')
          .attr('stroke-width', strokeW(d) + 2)
          .raise();
        // Expose edge to React; attach asset from the current asset prop via closure
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
  }, [flows, asset]);

  const g = buildGraph(flows, asset);
  return (
    <Wrapper>
      {g.nodes.length === 0
        ? <div className="empty">Aucun flux à afficher.</div>
        : (
          <>
            <svg ref={ref} />
            <EdgeDetailPanel edge={hoveredEdge} />
          </>
        )
      }
    </Wrapper>
  );
}
