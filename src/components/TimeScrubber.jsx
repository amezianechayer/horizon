import * as React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0 4px 0;
  margin-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.07);
`;

const PlayBtn = styled.button`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #13e07e;
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;

  &:hover { background: #0ec46e; }
  &:active { background: #0aaa5d; }
`;

const Slider = styled.input`
  flex: 1;
  accent-color: #13e07e;
  cursor: pointer;
  height: 4px;
`;

const BucketLabel = styled.span`
  flex-shrink: 0;
  font-size: 12px;
  font-family: 'Roboto Mono', monospace;
  color: #555;
  min-width: 120px;
  text-align: right;
`;

const Muted = styled.div`
  font-size: 12px;
  color: #aaa;
  padding: 8px 0 4px 0;
  margin-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.07);
`;

export default function TimeScrubber({ buckets, index, onChange, playing, onTogglePlay }) {
  if (!buckets || buckets.length <= 1) {
    return <Muted>Not enough time buckets to scrub.</Muted>;
  }

  return (
    <Wrapper>
      <PlayBtn onClick={onTogglePlay} title={playing ? 'Pause' : 'Play'}>
        {playing ? '⏸' : '▶'}
      </PlayBtn>
      <Slider
        type="range"
        min={0}
        max={buckets.length - 1}
        step={1}
        value={index}
        onChange={e => onChange(+e.target.value)}
      />
      <BucketLabel>
        {buckets[index]}
        <span style={{ opacity: 0.45, marginLeft: 4 }}>
          ({index + 1}/{buckets.length})
        </span>
      </BucketLabel>
    </Wrapper>
  );
}
