import * as React from 'react';
import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';
import { buildGraph } from '../lib/buildGraph';

const KIND_COLOR = {
  bank: '#1565c0', client: '#2e7d32', supplier: '#e65100',
  contracts: '#6a1b9a', world: '#607d8b', other: '#9e9e9e',
};

const Wrapper = styled.div`
  width: 100%;
  height: 520px;
  svg { width: 100%; height: 100%; display: block; background: #fafbfc; border-radius: 8px; }
  .empty { padding: 60px; text-align: center; opacity: 0.5; }
`;

export default function FlowGraph({ flows, asset }) {
  const ref = useRef(null);

  useEffect(() => {
    const g = buildGraph(flows, asset);
    const svgEl = ref.current;
    if (!svgEl || g.nodes.length === 0) return undefined;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = svgEl.clientWidth || 900;
    const height = svgEl.clientHeight || 520;

    const maxAmount = d3.max(g.links, d => d.amount) || 1;
    const maxVol = d3.max(g.nodes, d => d.volume) || 1;
    const radius = d => 6 + 18 * Math.sqrt(d.volume / maxVol);
    const strokeW = d => 1 + 5 * (d.amount / maxAmount);

    const root = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.1, 6]).on('zoom', (e) => root.attr('transform', e.transform)));

    svg.append('defs').append('marker')
      .attr('id', 'fg-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 22)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#bbb');

    const link = root.append('g').selectAll('line').data(g.links).join('line')
      .attr('stroke', '#cfd6dd').attr('stroke-width', strokeW).attr('marker-end', 'url(#fg-arrow)');

    const node = root.append('g').selectAll('circle').data(g.nodes).join('circle')
      .attr('r', radius).attr('fill', d => KIND_COLOR[d.kind] || KIND_COLOR.other)
      .attr('stroke', '#fff').attr('stroke-width', 1.5).style('cursor', 'grab');
    node.append('title').text(d => d.id + '  (vol ' + d.volume + ')');

    const label = root.append('g').selectAll('text').data(g.nodes).join('text')
      .text(d => d.id.length > 22 ? d.id.slice(0, 21) + '…' : d.id)
      .attr('font-size', 10).attr('fill', '#333');

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

    node.call(d3.drag()
      .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    return () => { simulation.stop(); };
  }, [flows, asset]);

  const g = buildGraph(flows, asset);
  return (
    <Wrapper>
      {g.nodes.length === 0 ? <div className="empty">Aucun flux à afficher.</div> : <svg ref={ref} />}
    </Wrapper>
  );
}
