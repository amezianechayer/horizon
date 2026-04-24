import * as React from 'react';
import styled from 'styled-components';
import ledger from '../lib/ledger';

const CATEGORY_COLOR = {
  COMMODITY:   'var(--orange)',
  CURRENCY:    'var(--accent)',
  EQUITY:      'var(--blue)',
  REAL_ESTATE: 'var(--purple)',
  DEBT:        'var(--red)',
};

const Wrapper = styled.div`
  padding-bottom: 60px;

  .page-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 0 18px; border-bottom: 1px solid var(--border); margin-bottom: 24px;
  }
  .page-title { font-size: 18px; font-weight: 700; letter-spacing: -0.03em; color: var(--text-1); }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: var(--r); font-size: 13px; font-weight: 600;
    background: var(--accent); color: #000; border: none; cursor: pointer;
    transition: opacity var(--t);
    &:hover { opacity: 0.85; }
  }

  .assets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
  }

  .asset-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg);
    padding: 20px 22px; transition: border-color var(--t), box-shadow var(--t);
    &:hover { border-color: var(--border-2); box-shadow: var(--shadow); }
  }

  .asset-header {
    display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px;
  }

  .asset-id {
    font-family: var(--font-mono); font-size: 16px; font-weight: 600; color: var(--text-1);
  }

  .asset-name { font-size: 12px; color: var(--text-3); margin-top: 2px; }

  .cat-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.06em;
    border: 1px solid; flex-shrink: 0;
  }

  .asset-meta {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;
    padding-top: 12px; border-top: 1px solid var(--border);
  }

  .meta-item {
    .meta-label { font-size: 10px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
    .meta-val { font-family: var(--font-mono); font-size: 12px; color: var(--text-2); }
  }

  .empty {
    padding: 48px; text-align: center; background: var(--surface);
    border: 1px dashed var(--border-2); border-radius: var(--r-lg);
    color: var(--text-3); font-size: 13px; line-height: 1.7;
    strong { color: var(--text-2); }
  }

  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px;
  }

  .modal {
    background: var(--surface); border: 1px solid var(--border-2); border-radius: var(--r-xl);
    padding: 28px 32px; width: 100%; max-width: 480px; box-shadow: var(--shadow-lg);
  }

  .modal-title { font-size: 16px; font-weight: 700; color: var(--text-1); margin-bottom: 20px; }

  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .form-full { grid-column: 1 / -1; }

  .form-group {
    display: flex; flex-direction: column; gap: 5px;
    label { font-size: 11px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; }
    input, select {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r);
      color: var(--text-1); padding: 8px 10px; font-size: 13px; font-family: var(--font-mono);
      &:focus { outline: none; border-color: var(--accent); }
    }
    select option { background: var(--surface-2); }
  }

  .modal-actions {
    display: flex; justify-content: flex-end; gap: 8px; margin-top: 22px;
  }

  .btn-ghost {
    padding: 7px 14px; border-radius: var(--r); font-size: 13px; font-weight: 500;
    background: none; border: 1px solid var(--border); color: var(--text-2); cursor: pointer;
    transition: all var(--t);
    &:hover { border-color: var(--border-2); color: var(--text-1); }
  }

  .err { font-size: 12px; color: var(--red); margin-top: 10px; }
`;

function catStyle(cat) {
  const c = CATEGORY_COLOR[cat] || 'var(--text-3)';
  return { color: c, borderColor: c + '44', background: c + '12' };
}

function AssetCard({ asset }) {
  return (
    <div className="asset-card">
      <div className="asset-header">
        <div>
          <div className="asset-id">{asset.id}</div>
          <div className="asset-name">{asset.name}</div>
        </div>
        <span className="cat-badge" style={catStyle(asset.category)}>{asset.category}</span>
      </div>
      <div className="asset-meta">
        <div className="meta-item">
          <div className="meta-label">Precision</div>
          <div className="meta-val">{asset.precision}</div>
        </div>
        <div className="meta-item">
          <div className="meta-label">AAOIFI</div>
          <div className="meta-val">{asset.aaoifi_class || '—'}</div>
        </div>
        <div className="meta-item" style={{ gridColumn: '1/-1' }}>
          <div className="meta-label">Created</div>
          <div className="meta-val">{new Date(asset.created_at).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
}

const BLANK = { id: '', name: '', precision: 2, category: 'CURRENCY', aaoifi_class: '' };

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = React.useState(BLANK);
  const [err, setErr]   = React.useState('');
  const [busy, setBusy] = React.useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function submit(e) {
    e.preventDefault();
    if (!form.id || !form.name) { setErr('ID and Name are required'); return; }
    setBusy(true); setErr('');
    ledger().createAsset({ ...form, precision: Number(form.precision) })
      .then(() => { onCreated(); onClose(); })
      .catch(e => { setErr(e?.response?.data?.err || 'Error creating asset'); setBusy(false); });
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Register asset</div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Asset ID</label>
              <input placeholder="EUR.2" value={form.id} onChange={e => set('id', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Name</label>
              <input placeholder="Euro" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Precision</label>
              <input type="number" min="0" max="18" value={form.precision} onChange={e => set('precision', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                {['CURRENCY','COMMODITY','EQUITY','REAL_ESTATE','DEBT'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group form-full">
              <label>AAOIFI Class</label>
              <input placeholder="FAS-2" value={form.aaoifi_class} onChange={e => set('aaoifi_class', e.target.value)} />
            </div>
          </div>
          {err && <div className="err">{err}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Assets() {
  const [assets, setAssets] = React.useState(null);
  const [modal, setModal]   = React.useState(false);

  function load() {
    ledger().getAssets().then(res => setAssets(res.assets || [])).catch(() => setAssets([]));
  }

  React.useEffect(() => { load(); }, []);

  return (
    <Wrapper>
      {modal && <CreateModal onClose={() => setModal(false)} onCreated={load} />}
      <div className="top-container">
        <div className="page-header">
          <span className="page-title">Assets</span>
          <button className="btn-primary" onClick={() => setModal(true)}>+ Register</button>
        </div>

        {assets === null && (
          <div className="assets-grid">
            {[1,2,3].map(i => <div key={i} className="asset-card skeleton" style={{ height: 140 }} />)}
          </div>
        )}

        {assets !== null && assets.length === 0 && (
          <div className="empty">
            No assets registered yet.<br />
            Click <strong>+ Register</strong> to add the first one.
          </div>
        )}

        {assets !== null && assets.length > 0 && (
          <div className="assets-grid">
            {assets.map(a => <AssetCard key={a.id} asset={a} />)}
          </div>
        )}
      </div>
    </Wrapper>
  );
}

export default Assets;
