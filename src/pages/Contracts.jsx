import * as React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import ledger from '../lib/ledger';

const TYPE_COLOR = {
  MURABAHA:   'var(--accent)',
  MUDARABAH:  'var(--blue)',
  MUSHARAKAH: 'var(--purple)',
  IJARA:      'var(--orange)',
  SUKUK:      'var(--yellow)',
  QARD_HASSAN:'var(--text-3)',
};

const STATUS_COLOR = {
  PENDING:   'var(--yellow)',
  ACTIVE:    'var(--accent)',
  COMPLETED: 'var(--blue)',
  CANCELLED: 'var(--red)',
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

  table { width: 100%; border-collapse: collapse; }
  thead th {
    text-align: left; padding: 10px 14px;
    font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--text-3); border-bottom: 1px solid var(--border);
  }
  tbody tr {
    border-bottom: 1px solid var(--border);
    cursor: pointer; transition: background var(--t);
    &:hover { background: var(--surface-2); }
    &:last-child { border-bottom: none; }
  }
  td { padding: 14px 14px; font-size: 13px; color: var(--text-2); vertical-align: middle; }

  .id-cell {
    font-family: var(--font-mono); font-size: 12px; color: var(--accent);
    &:hover { text-decoration: underline; }
  }

  .badge {
    display: inline-flex; align-items: center;
    padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid;
  }

  .table-wrap {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg);
    overflow: hidden;
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
    padding: 28px 32px; width: 100%; max-width: 520px; box-shadow: var(--shadow-lg);
    max-height: 90vh; overflow-y: auto;
  }

  .modal-title { font-size: 16px; font-weight: 700; color: var(--text-1); margin-bottom: 20px; }

  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .form-full { grid-column: 1 / -1; }

  .form-group {
    display: flex; flex-direction: column; gap: 5px;
    label { font-size: 11px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; }
    input, select, textarea {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r);
      color: var(--text-1); padding: 8px 10px; font-size: 13px; font-family: var(--font-mono);
      &:focus { outline: none; border-color: var(--accent); }
    }
    textarea { resize: vertical; min-height: 80px; }
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

  .terms-hint {
    margin-top: 6px; padding: 8px 10px; border-radius: var(--r);
    background: var(--surface-2); border: 1px solid var(--border);
    font-size: 11px; color: var(--text-3); line-height: 1.6;
    .hint-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
    .hint-chip {
      padding: 2px 7px; border-radius: 20px; font-family: var(--font-mono); font-size: 10px;
      background: var(--surface); border: 1px solid var(--border-2); color: var(--text-2);
    }
    .hint-chip.forbidden { color: var(--red); border-color: #ff444444; background: #ff444410; }
  }
`;

function badgeStyle(color) {
  return { color, borderColor: color + '44', background: color + '14' };
}

const TYPES = ['MURABAHA','MUDARABAH','MUSHARAKAH','IJARA','SUKUK','QARD_HASSAN'];
const BLANK = { id: '', type: 'MURABAHA', client: '', bank: '', terms: '{}' };

const TERMS_HINT = {
  MURABAHA:   { required: ['markup', 'asset_description'], note: 'markup must be fixed and disclosed (FAS-2)' },
  MUDARABAH:  { required: ['profit_ratio', 'capital'],     note: 'profit_ratio as percentage, e.g. "40%"' },
  MUSHARAKAH: { required: ['profit_ratio', 'loss_ratio'],  note: 'both ratios required (FAS-4)' },
  IJARA:      { required: ['rent_amount', 'asset_description', 'duration'], note: 'asset must be identified (FAS-32)' },
  SUKUK:      { required: ['underlying_asset', 'face_value'], note: 'must be backed by a real asset (FAS-33)' },
  QARD_HASSAN:{ required: [], forbidden: ['markup','interest','profit'], note: 'no profit terms allowed — benevolent loan only' },
};

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = React.useState(BLANK);
  const [err, setErr]   = React.useState('');
  const [busy, setBusy] = React.useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function submit(e) {
    e.preventDefault();
    if (!form.id) { setErr('Contract ID is required'); return; }
    let terms = {};
    try { terms = JSON.parse(form.terms || '{}'); } catch { setErr('Terms must be valid JSON'); return; }
    setBusy(true); setErr('');
    ledger().createContract({
      id: form.id,
      type: form.type,
      ledger: 'quickstart',
      parties: { client: form.client, bank: form.bank },
      terms,
    })
      .then(() => { onCreated(); onClose(); })
      .catch(e => { setErr(e?.response?.data?.err || 'Error creating contract'); setBusy(false); });
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">New contract</div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group form-full">
              <label>Contract ID</label>
              <input placeholder="murabaha-001" value={form.id} onChange={e => set('id', e.target.value)} />
            </div>
            <div className="form-group form-full">
              <label>Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Client account</label>
              <input placeholder="@client:ali" value={form.client} onChange={e => set('client', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Bank account</label>
              <input placeholder="@bank:cpa" value={form.bank} onChange={e => set('bank', e.target.value)} />
            </div>
            <div className="form-group form-full">
              <label>Terms (JSON)</label>
              <textarea value={form.terms} onChange={e => set('terms', e.target.value)} />
              {TERMS_HINT[form.type] && (
                <div className="terms-hint">
                  {TERMS_HINT[form.type].note}
                  {TERMS_HINT[form.type].required.length > 0 && (
                    <div className="hint-chips">
                      {TERMS_HINT[form.type].required.map(f => (
                        <span key={f} className="hint-chip">required: {f}</span>
                      ))}
                    </div>
                  )}
                  {TERMS_HINT[form.type].forbidden && (
                    <div className="hint-chips">
                      {TERMS_HINT[form.type].forbidden.map(f => (
                        <span key={f} className="hint-chip forbidden">forbidden: {f}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {err && <div className="err">{err}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Contracts() {
  const [contracts, setContracts] = React.useState(null);
  const [modal, setModal]         = React.useState(false);

  function load() {
    ledger().getContracts().then(res => {
      const data = res.cursor?.data || [];
      setContracts(data);
    }).catch(() => setContracts([]));
  }

  React.useEffect(() => { load(); }, []);

  return (
    <Wrapper>
      {modal && <CreateModal onClose={() => setModal(false)} onCreated={load} />}
      <div className="top-container">
        <div className="page-header">
          <span className="page-title">Contracts</span>
          <button className="btn-primary" onClick={() => setModal(true)}>+ New</button>
        </div>

        {contracts === null && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Type</th><th>Status</th><th>AAOIFI</th><th>Created</th></tr></thead>
              <tbody>{[1,2,3].map(i => (
                <tr key={i}><td colSpan={5}><div className="skeleton" style={{ height: 16, width: '60%' }} /></td></tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {contracts !== null && contracts.length === 0 && (
          <div className="empty">
            No contracts yet.<br />Click <strong>+ New</strong> to create the first one.
          </div>
        )}

        {contracts !== null && contracts.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Type</th><th>Status</th><th>AAOIFI</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/contracts/${c.id}`} className="id-cell">{c.id}</Link>
                    </td>
                    <td>
                      <span className="badge" style={badgeStyle(TYPE_COLOR[c.type] || 'var(--text-3)')}>
                        {c.type}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={badgeStyle(STATUS_COLOR[c.status] || 'var(--text-3)')}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.aaoifi_fas || '—'}</td>
                    <td style={{ fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Wrapper>
  );
}

export default Contracts;
