import { useState, useEffect } from 'react';

const KEY = 'horizon-watchlist';

function load() {
  try {
    const v = localStorage.getItem(KEY);
    return v ? JSON.parse(v) : [];
  } catch (e) { return []; }
}

export default function useWatchlist() {
  const [list, setList] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }, [list]);

  function add(address) {
    setList(l => l.includes(address) ? l : [...l, address].slice(0, 8));
  }

  function remove(address) {
    setList(l => l.filter(a => a !== address));
  }

  function has(address) {
    return list.includes(address);
  }

  return { list, add, remove, has };
}
