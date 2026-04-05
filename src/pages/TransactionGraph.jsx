import * as React from 'react';
import styled from 'styled-components';
import ledger from '../lib/ledger';
import GraphVisualization from '../components/GraphVisualization.jsx';
import Panel from '../parts/Panel.jsx';

const Wrapper = styled.div`
  .top-container {
    h1 {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 700;
    }

    p {
      margin: 0 0 20px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
    }
  }

  .header-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
    padding: 16px 20px;
    background: #111;
    border-radius: 10px;
    border: 1px solid #222;
    color: white;

    .header-left h1 {
      margin: 0 0 2px;
      font-size: 20px;
    }

    .header-left p {
      margin: 0;
      font-size: 13px;
      opacity: 0.5;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 400px;
    color: rgba(255, 255, 255, 0.4);
    font-size: 14px;
    background: #0d1117;
    border-radius: 12px;
    border: 1px solid #21262d;
    flex-direction: column;
    gap: 10px;

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid #21262d;
      border-top-color: #3fb950;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
    flex-direction: column;
    gap: 8px;
    background: #0d1117;
    border-radius: 12px;
    border: 1px solid #21262d;
    color: rgba(255, 255, 255, 0.4);

    .empty-icon {
      font-size: 36px;
      opacity: 0.4;
    }
    p { margin: 0; font-size: 14px; }
  }

  .filter-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    flex-wrap: wrap;

    label {
      color: rgba(255,255,255,0.6);
      font-size: 13px;
    }

    select {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #c9d1d9;
      padding: 6px 10px;
      font-size: 13px;
      cursor: pointer;

      &:focus { outline: none; border-color: #58a6ff; }
    }

    .refresh-btn {
      margin-left: auto;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #c9d1d9;
      padding: 6px 14px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s;

      &:hover { background: #30363d; }
    }

    .hint {
      color: rgba(255,255,255,0.35);
      font-size: 12px;
    }
  }
`;

function nodeType(id) {
  if (!id) return 'account';
  if (id === '@world' || id.startsWith('@world')) return 'world';
  if (id.includes(':')) return 'sub';
  return 'account';
}

class TransactionGraph extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ready: false,
      loading: true,
      nodes: [],
      links: [],
      filterAsset: 'all',
      availableAssets: [],
      rawTransactions: [],
    };

    this.fetch = this.fetch.bind(this);
    this.buildGraph = this.buildGraph.bind(this);
    this.handleAssetFilter = this.handleAssetFilter.bind(this);
  }

  componentDidMount() {
    this.fetch();
  }

  // Fetch all pages of transactions
  fetch() {
    this.setState({ loading: true, ready: false });

    const allTransactions = [];

    const fetchPage = (query) => {
      return ledger().getTransactions(query).then(data => {
        const page = data.cursor.data || [];
        allTransactions.push(...page);

        // If full page, there might be more
        if (page.length > 0 && page.length >= data.cursor.page_size) {
          const lastTxid = page[page.length - 1].txid;
          return fetchPage({ after: lastTxid });
        }
        return allTransactions;
      });
    };

    fetchPage({})
      .then(transactions => {
        const assets = new Set();
        transactions.forEach(tx =>
          tx.postings.forEach(p => assets.add(p.asset))
        );
        this.setState({
          rawTransactions: transactions,
          availableAssets: Array.from(assets),
        }, () => this.buildGraph());
      })
      .catch(() => {
        this.setState({ loading: false, ready: true });
      });
  }

  buildGraph(assetFilter = null) {
    const filter = assetFilter || this.state.filterAsset;
    const { rawTransactions } = this.state;

    const accountsMap = new Map();
    const linksMap = new Map();

    rawTransactions.forEach(tx => {
      tx.postings.forEach(posting => {
        if (filter !== 'all' && posting.asset !== filter) return;

        const src = posting.source;
        const dst = posting.destination;

        if (!accountsMap.has(src)) {
          accountsMap.set(src, { id: src, type: nodeType(src) });
        }
        if (!accountsMap.has(dst)) {
          accountsMap.set(dst, { id: dst, type: nodeType(dst) });
        }

        const key = `${src}||${dst}||${posting.asset}`;
        if (linksMap.has(key)) {
          const existing = linksMap.get(key);
          existing.amount += posting.amount;
          existing.count += 1;
        } else {
          linksMap.set(key, {
            id: key,
            source: src,
            target: dst,
            asset: posting.asset,
            amount: posting.amount,
            count: 1,
          });
        }
      });
    });

    this.setState({
      ready: true,
      loading: false,
      nodes: Array.from(accountsMap.values()),
      links: Array.from(linksMap.values()),
    });
  }

  handleAssetFilter(e) {
    const value = e.target.value;
    this.setState({ filterAsset: value }, () => this.buildGraph(value));
  }

  render() {
    const { ready, loading, nodes, links, filterAsset, availableAssets } = this.state;

    return (
      <Wrapper>
        <div className="top-container mt20 mb40">
          <div className="header-panel">
            <div className="header-left">
              <h1>Transaction Graph</h1>
              <p>Interactive fund flow visualization between accounts</p>
            </div>
          </div>

          <div className="filter-bar">
            <label>Asset</label>
            <select value={filterAsset} onChange={this.handleAssetFilter}>
              <option value="all">All assets</option>
              {availableAssets.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            <span className="hint">Drag nodes · Scroll to zoom · Click account to open</span>

            <button className="refresh-btn" onClick={this.fetch}>
              Refresh
            </button>
          </div>

          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <span>Loading transactions…</span>
            </div>
          )}

          {ready && nodes.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">◎</div>
              <p>No transactions found</p>
              <p style={{ fontSize: 12 }}>Execute some FaRl scripts to see fund flows here</p>
            </div>
          )}

          {ready && nodes.length > 0 && (
            <GraphVisualization nodes={nodes} links={links} />
          )}
        </div>
      </Wrapper>
    );
  }
}

export default TransactionGraph;
