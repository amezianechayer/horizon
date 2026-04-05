import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as d3 from 'd3';
import styled from 'styled-components';
import ledger from '../lib/ledger';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  color: #c9d1d9;

  .page-header {
    padding: 14px 18px;
    background: #111;
    border-radius: 10px;
    border: 1px solid #21262d;
    margin-bottom: 20px;
    h1 { margin: 0 0 2px; font-size: 19px; color: #f0f6fc; }
    p  { margin: 0; font-size: 13px; opacity: 0.45; }
  }

  .charts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  .chart-card {
    background: #0d1117;
    border: 1px solid #21262d;
    border-radius: 12px;
    padding: 18px 18px 12px;

    .chart-title {
      font-size: 13px;
      font-weight: 600;
      color: #f0f6fc;
      margin-bottom: 2px;
    }

    .chart-sub {
      font-size: 11px;
      color: #6e7681;
      margin-bottom: 14px;
    }

    svg text { font-family: 'Inter', sans-serif; }
    .domain, .tick line { stroke: #21262d; }
  }

  .full-width { grid-column: 1 / -1; }

  .loading-state {
    display: flex; align-items: center; justify-content: center;
    height: 300px; flex-direction: column; gap: 12px;
    background: #0d1117; border: 1px solid #21262d; border-radius: 12px;
    color: rgba(201,209,217,0.4); font-size: 13px;
    .spinner {
      width: 24px; height: 24px;
      border: 3px solid #21262d; border-top-color: #3fb950;
      border-radius: 50%; animation: spin 0.75s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  }

  .top-account-row {
    display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
    font-size: 12px;

    .acc-id {
      font-family: 'Roboto Mono', monospace;
      font-size: 11px;
      color: #58a6ff;
      width: 160px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 0;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    .bar-wrap {
      flex: 1;
      height: 14px;
      background: #161b22;
      border-radius: 3px;
      overflow: hidden;

      .bar { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
    }

    .bar-val {
      font-family: 'Roboto Mono', monospace;
      font-size: 11px;
      color: #8b949e;
      width: 70px;
      text-align: right;
      flex-shrink: 0;
      white-space: nowrap;
    }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function shortNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return n.toLocaleString('fr-FR');
}

function assetPrecision(asset) {
  const p = (asset || '').split('.');
  return p.length > 1 ? parseInt(p[1], 10) : 0;
}

function toHuman(amount, asset) {
  const prec = assetPrecision(asset);
  return prec > 0 ? amount / Math.pow(10, prec) : amount;
}

const CHART_COLORS = ['#3fb950', '#388bfd', '#f85149', '#e3b341', '#bc8cff', '#39d353', '#79c0ff'];

// ─────────────────────────────────────────────────────────────────────────────
// Data processing
// ─────────────────────────────────────────────────────────────────────────────

function processData(txs) {
  // 1. Volume by day
  const dayMap = new Map();
  txs.forEach(tx => {
    const day = new Date(tx.timestamp).toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  });
  const volumeByDay = Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 2. Asset distribution (total volume per asset in human units)
  const assetMap = new Map();
  txs.forEach(tx => {
    tx.postings.forEach(p => {
      const v = toHuman(p.amount, p.asset);
      assetMap.set(p.asset, (assetMap.get(p.asset) || 0) + v);
    });
  });
  const assetVolumes = Array.from(assetMap.entries())
    .map(([asset, amount]) => ({ asset: asset.split('.')[0], amount, fullAsset: asset }))
    .sort((a, b) => b.amount - a.amount);

  // 3. Top accounts by inbound flow (excl. @world)
  const accMap = new Map();
  txs.forEach(tx => {
    tx.postings.forEach(p => {
      if (p.source !== '@world') {
        const prev = accMap.get(p.source) || { id: p.source, out: 0, txCount: 0 };
        prev.out += toHuman(p.amount, p.asset);
        prev.txCount += 1;
        accMap.set(p.source, prev);
      }
      const prev = accMap.get(p.destination) || { id: p.destination, out: 0, txCount: 0 };
      prev.txCount += 1;
      accMap.set(p.destination, prev);
    });
  });
  const topAccounts = Array.from(accMap.values())
    .filter(a => a.id !== '@world')
    .sort((a, b) => b.txCount - a.txCount)
    .slice(0, 10);

  // 4. Cumulative transaction count over time
  const sorted = [...txs].sort((a, b) => a.timestamp - b.timestamp);
  const cumulative = sorted.map((tx, i) => ({
    date: new Date(tx.timestamp),
    count: i + 1,
  }));

  return { volumeByDay, assetVolumes, topAccounts, cumulative, totalTxs: txs.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart: Volume by Day (bar)
// ─────────────────────────────────────────────────────────────────────────────

function VolumeByDayChart({ data }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0 || !ref.current) return;
    const margin = { top: 10, right: 16, bottom: 50, left: 36 };
    const totalW = ref.current.clientWidth || 440;
    const totalH = 200;
    const W = totalW - margin.left - margin.right;
    const H = totalH - margin.top - margin.bottom;

    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${totalW} ${totalH}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(data.map(d => d.date)).range([0, W]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).range([H, 0]).nice();

    // Grid lines
    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(4).tickSize(-W).tickFormat(''))
      .selectAll('line').attr('stroke', '#21262d').attr('stroke-dasharray', '2,4');
    g.select('.grid .domain').remove();

    // X axis (show only every N-th label)
    const step = Math.ceil(data.length / 8);
    g.append('g').attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(x)
        .tickValues(x.domain().filter((d, i) => i % step === 0))
        .tickSize(4))
      .selectAll('text')
      .attr('fill', '#6e7681').attr('font-size', 10)
      .attr('transform', 'rotate(-30)').attr('text-anchor', 'end').attr('dy', '0.5em');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(4).tickFormat(d => Number.isInteger(d) ? d : ''))
      .selectAll('text').attr('fill', '#6e7681').attr('font-size', 10);

    g.selectAll('.domain').attr('stroke', '#30363d');
    g.selectAll('.tick line').attr('stroke', '#30363d');

    // Bars
    g.selectAll('rect').data(data).join('rect')
      .attr('x', d => x(d.date))
      .attr('y', H)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', '#3fb950')
      .attr('rx', 2)
      .transition().duration(600).delay((d, i) => i * 20)
      .attr('y', d => y(d.count))
      .attr('height', d => H - y(d.count));

  }, [data]);

  return <svg ref={ref} style={{ width: '100%', height: 200, display: 'block' }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart: Asset Distribution (donut)
// ─────────────────────────────────────────────────────────────────────────────

function AssetDonutChart({ data }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0 || !ref.current) return;
    const size = Math.min(ref.current.clientWidth || 300, 240);
    const radius = size / 2;
    const inner  = radius * 0.52;

    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${size} ${size}`);

    const g = svg.append('g').attr('transform', `translate(${radius},${radius})`);

    const pie  = d3.pie().value(d => d.amount).sort(null);
    const arc  = d3.arc().innerRadius(inner).outerRadius(radius - 4);
    const arcH = d3.arc().innerRadius(inner).outerRadius(radius);

    const slices = g.selectAll('path').data(pie(data)).join('path')
      .attr('fill', (d, i) => CHART_COLORS[i % CHART_COLORS.length])
      .attr('stroke', '#0d1117')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    slices.transition().duration(700).delay((d, i) => i * 80)
      .attrTween('d', function(d) {
        const interp = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return t => arc(interp(t));
      });

    slices
      .on('mouseenter', function() {
        d3.select(this).transition().duration(120).attr('d', arcH);
      })
      .on('mouseleave', function() {
        d3.select(this).transition().duration(120).attr('d', arc);
      });

    // Center text
    g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.3em')
      .attr('fill', '#f0f6fc').attr('font-size', 13).attr('font-weight', 700)
      .text(data.length);
    g.append('text').attr('text-anchor', 'middle').attr('dy', '1.1em')
      .attr('fill', '#6e7681').attr('font-size', 10)
      .text('assets');

    // Legend
    const legend = g.append('g').attr('transform', `translate(${radius + 8}, ${-data.length * 9})`);
    data.slice(0, 6).forEach((d, i) => {
      const row = legend.append('g').attr('transform', `translate(0, ${i * 18})`);
      row.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2)
        .attr('fill', CHART_COLORS[i % CHART_COLORS.length]);
      row.append('text').attr('x', 14).attr('y', 9)
        .attr('fill', '#8b949e').attr('font-size', 10)
        .text(`${d.asset} (${shortNum(d.amount)})`);
    });

  }, [data]);

  return <svg ref={ref} style={{ width: '100%', height: 240, display: 'block' }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart: Cumulative transactions (area)
// ─────────────────────────────────────────────────────────────────────────────

function CumulativeChart({ data }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!data || data.length < 2 || !ref.current) return;
    const margin = { top: 10, right: 16, bottom: 40, left: 40 };
    const totalW = ref.current.clientWidth || 440;
    const totalH = 200;
    const W = totalW - margin.left - margin.right;
    const H = totalH - margin.top - margin.bottom;

    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${totalW} ${totalH}`);

    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'area-grad').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1);
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#388bfd').attr('stop-opacity', 0.35);
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#388bfd').attr('stop-opacity', 0.03);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, W]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).range([H, 0]).nice();

    // Grid
    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(4).tickSize(-W).tickFormat(''))
      .selectAll('line').attr('stroke', '#21262d').attr('stroke-dasharray', '2,4');
    g.select('.grid .domain').remove();

    // Axes
    g.append('g').attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat('%d/%m')))
      .selectAll('text').attr('fill', '#6e7681').attr('font-size', 10);
    g.append('g')
      .call(d3.axisLeft(y).ticks(4))
      .selectAll('text').attr('fill', '#6e7681').attr('font-size', 10);
    g.selectAll('.domain').attr('stroke', '#30363d');
    g.selectAll('.tick line').attr('stroke', '#30363d');

    // Area
    const area = d3.area().x(d => x(d.date)).y0(H).y1(d => y(d.count)).curve(d3.curveMonotoneX);
    const line = d3.line().x(d => x(d.date)).y(d => y(d.count)).curve(d3.curveMonotoneX);

    const clipId = 'clip-area';
    defs.append('clipPath').attr('id', clipId)
      .append('rect').attr('width', W).attr('height', H);

    const areaG = g.append('g').attr('clip-path', `url(#${clipId})`);

    areaG.append('path').datum(data)
      .attr('fill', 'url(#area-grad)')
      .attr('d', area);

    const linePath = areaG.append('path').datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#388bfd')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Animate line drawing
    const totalLen = linePath.node().getTotalLength();
    linePath.attr('stroke-dasharray', totalLen)
      .attr('stroke-dashoffset', totalLen)
      .transition().duration(900).ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0);

  }, [data]);

  return <svg ref={ref} style={{ width: '100%', height: 200, display: 'block' }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Top Accounts (HTML-based bar chart for simplicity + clickable links)
// ─────────────────────────────────────────────────────────────────────────────

function TopAccountsChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = d3.max(data, d => d.txCount) || 1;

  return (
    <div>
      {data.map((acc, i) => (
        <div className="top-account-row" key={acc.id}>
          <Link className="acc-id" to={`/accounts/${acc.id}`} title={acc.id}>
            {acc.id}
          </Link>
          <div className="bar-wrap">
            <div
              className="bar"
              style={{
                width: `${(acc.txCount / max) * 100}%`,
                background: CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
          </div>
          <span className="bar-val">{acc.txCount} tx</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Analytics page
// ─────────────────────────────────────────────────────────────────────────────

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState(null);

  useEffect(() => {
    const all = [];

    const fetchPage = query =>
      ledger().getTransactions(query).then(res => {
        const page = res.cursor.data || [];
        all.push(...page);
        if (page.length > 0 && page.length >= res.cursor.page_size) {
          return fetchPage({ after: page[page.length - 1].txid });
        }
        return all;
      });

    fetchPage({})
      .then(txs => {
        setData(processData(txs));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Wrapper>
      <div className="top-container mt20 mb40">

        <div className="page-header">
          <h1>Analytics</h1>
          <p>Transaction trends, asset distribution and account activity</p>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <span>Aggregating data…</span>
          </div>
        )}

        {!loading && data && (
          <div className="charts-grid">

            <div className="chart-card">
              <div className="chart-title">Transactions per day</div>
              <div className="chart-sub">{data.totalTxs} total transactions</div>
              <VolumeByDayChart data={data.volumeByDay} />
            </div>

            <div className="chart-card">
              <div className="chart-title">Asset distribution</div>
              <div className="chart-sub">Volume by asset (human units)</div>
              <AssetDonutChart data={data.assetVolumes} />
            </div>

            <div className="chart-card full-width">
              <div className="chart-title">Cumulative transaction count</div>
              <div className="chart-sub">Growth over time</div>
              <CumulativeChart data={data.cumulative} />
            </div>

            <div className="chart-card full-width">
              <div className="chart-title">Top accounts by activity</div>
              <div className="chart-sub">Ranked by number of transaction postings (excl. @world)</div>
              <TopAccountsChart data={data.topAccounts} />
            </div>

          </div>
        )}

      </div>
    </Wrapper>
  );
}

export default Analytics;
