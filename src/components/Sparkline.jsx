import * as React from 'react';
import styled from 'styled-components';

const SVGWrapper = styled.div`
  svg {
    display: block;
    width: 100%;
  }

  .sparkline-label {
    font-size: 11px;
    opacity: 0.45;
    font-family: Arial, Helvetica, sans-serif;
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
  }

  .empty {
    opacity: 0.45;
    font-size: 13px;
    padding: 8px 0;
  }

  .legend {
    display: flex;
    gap: 16px;
    margin-top: 8px;
    font-size: 12px;
  }

  .legend-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 4px;
    vertical-align: middle;
  }
`;

const W = 320;
const H = 80;
const PAD_X = 8;
const PAD_Y = 8;

function toPoints(series, key, maxVal, count) {
  return series.map((d, i) => {
    const x = PAD_X + (i / Math.max(count - 1, 1)) * (W - PAD_X * 2);
    const y = H - PAD_Y - ((Number(d[key]) || 0) / maxVal) * (H - PAD_Y * 2);
    return `${x},${y}`;
  }).join(' ');
}

function fmtBucket(str) {
  if (!str) return '';
  // time_bucket is typically an ISO date string; just show the date portion
  return String(str).slice(0, 10);
}

class Sparkline extends React.Component {
  render() {
    const { series } = this.props;

    if (!series || series.length < 2) {
      return (
        <SVGWrapper>
          <span className="empty">Not enough data.</span>
        </SVGWrapper>
      );
    }

    const count = series.length;
    const maxIn  = Math.max(...series.map(d => Number(d['in'])  || 0));
    const maxOut = Math.max(...series.map(d => Number(d['out']) || 0));
    const maxVal = Math.max(maxIn, maxOut, 1);

    const inPoints  = toPoints(series, 'in',  maxVal, count);
    const outPoints = toPoints(series, 'out', maxVal, count);

    const baselineY = H - PAD_Y;

    return (
      <SVGWrapper>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {/* baseline */}
          <line
            x1={PAD_X} y1={baselineY}
            x2={W - PAD_X} y2={baselineY}
            stroke="rgba(0,0,0,0.08)" strokeWidth="1"
          />
          {/* inflow line */}
          <polyline
            points={inPoints}
            fill="none"
            stroke="#13e07e"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* outflow line */}
          <polyline
            points={outPoints}
            fill="none"
            stroke="#fe7676"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        <div className="sparkline-label">
          <span>{fmtBucket(series[0].time_bucket)}</span>
          <span>{fmtBucket(series[series.length - 1].time_bucket)}</span>
        </div>

        <div className="legend">
          <span>
            <span className="legend-dot" style={{background: '#13e07e'}} />
            In
          </span>
          <span>
            <span className="legend-dot" style={{background: '#fe7676'}} />
            Out
          </span>
        </div>
      </SVGWrapper>
    );
  }
}

export default Sparkline;
