import * as React from 'react';
import styled from 'styled-components';
import { useParams, Link } from 'react-router-dom';
import ledger from '../lib/ledger';

const REQUIRED_TERMS = {
  MURABAHA:   ['markup', 'asset_description'],
  MUDARABAH:  ['profit_ratio', 'capital'],
  MUSHARAKAH: ['profit_ratio', 'loss_ratio'],
  IJARA:      ['rent_amount', 'asset_description', 'duration'],
  SUKUK:      ['underlying_asset', 'face_value'],
  QARD_HASSAN: [],
};
const FORBIDDEN_TERMS = {
  QARD_HASSAN: ['markup', 'interest', 'profit', 'return'],
};

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

  .back {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--text-3); margin-bottom: 20px;
    padding-top: 20px;
    &:hover { color: var(--text-1); }
  }

  .page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding-bottom: 18px; border-bottom: 1px solid var(--border); margin-bottom: 28px;
    flex-wrap: wrap; gap: 14px;
  }

  .contract-id {
    font-family: var(--font-mono); font-size: 22px; font-weight: 700;
    color: var(--text-1); letter-spacing: -0.02em;
  }

  .badges { display: flex; align-items: center; gap: 8px; margin-top: 8px; }

  .badge {
    display: inline-flex; align-items: center;
    padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid;
  }

  .status-actions {
    display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
  }

  .btn-status {
    padding: 6px 13px; border-radius: var(--r); font-size: 12px; font-weight: 600;
    border: 1px solid; cursor: pointer; transition: opacity var(--t); background: none;
    &:hover { opacity: 0.75; }
    &:disabled { opacity: 0.3; cursor: not-allowed; }
  }

  .grid-2 {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;
    @media (max-width: 640px) { grid-template-columns: 1fr; }
  }

  .card {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg);
    padding: 20px 22px;
  }

  .card-title {
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--text-3); margin-bottom: 14px; border-bottom: 1px solid var(--border);
    padding-bottom: 10px;
  }

  .field { margin-bottom: 12px; }
  .field-label { font-size: 10px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
  .field-val { font-family: var(--font-mono); font-size: 13px; color: var(--text-1); }
  .field-val-plain { font-size: 13px; color: var(--text-2); }

  .terms-block {
    background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r);
    padding: 14px 16px; font-family: var(--font-mono); font-size: 12px; color: var(--text-2);
    white-space: pre-wrap; word-break: break-all; overflow-y: auto; max-height: 260px;
    line-height: 1.7;
  }

  .certs-table {
    width: 100%; border-collapse: collapse; margin-bottom: 20px;
    th {
      text-align: left; padding: 9px 12px;
      font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em;
      color: var(--text-3); border-bottom: 1px solid var(--border);
    }
    td { padding: 12px 12px; font-size: 12px; color: var(--text-2); vertical-align: middle; border-bottom: 1px solid var(--border); }
    tr:last-child td { border-bottom: none; }
  }

  .cert-hash { font-family: var(--font-mono); font-size: 11px; color: var(--accent); }
  .no-certs { padding: 28px; text-align: center; color: var(--text-3); font-size: 13px; }

  .compliance-grid {
    display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px;
  }
  .term-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 500;
    border: 1px solid; font-family: var(--font-mono);
  }
  .term-ok    { color: var(--accent); border-color: var(--accent-dim, #00c97444); background: #00c97410; }
  .term-miss  { color: var(--red);    border-color: #ff444444;                    background: #ff444410; }
  .term-warn  { color: var(--yellow); border-color: #f5c51844;                    background: #f5c51810; }
  .compliance-msg {
    margin-top: 10px; font-size: 12px; padding: 8px 12px; border-radius: var(--r);
    border: 1px solid;
  }
  .compliance-msg.pass { color: var(--accent); border-color: #00c97433; background: #00c97408; }
  .compliance-msg.fail { color: var(--red);    border-color: #ff444433; background: #ff444408; }
  .compliance-msg.warn { color: var(--yellow); border-color: #f5c51833; background: #f5c51808; }

  .err { font-size: 13px; color: var(--red); padding: 20px 0; }
  .loading { padding: 60px 0; text-align: center; color: var(--text-3); font-size: 13px; }
`;

function badgeStyle(color) {
  return { color, borderColor: color + '44', background: color + '14' };
}

const TRANSITIONS = {
  PENDING:   ['ACTIVE', 'CANCELLED'],
  ACTIVE:    ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function TermsCompliance({ type, terms }) {
  const required = REQUIRED_TERMS[type] || [];
  const forbidden = FORBIDDEN_TERMS[type] || [];
  const keys = Object.keys(terms || {});

  const missing  = required.filter(f => !keys.includes(f));
  const present  = required.filter(f =>  keys.includes(f));
  const violated = forbidden.filter(f => keys.includes(f));

  const allOk = missing.length === 0 && violated.length === 0;

  if (required.length === 0 && forbidden.length === 0) {
    return (
      <div className="compliance-msg pass">No required terms for this contract type.</div>
    );
  }

  return (
    <>
      <div className="compliance-grid">
        {present.map(f  => <span key={f} className="term-chip term-ok">✓ {f}</span>)}
        {missing.map(f  => <span key={f} className="term-chip term-miss">✗ {f}</span>)}
        {violated.map(f => <span key={f} className="term-chip term-warn">⚠ {f}</span>)}
      </div>
      {allOk && (
        <div className="compliance-msg pass" style={{ marginTop: 10 }}>All required terms present — contract will pass Gharar validation.</div>
      )}
      {missing.length > 0 && (
        <div className="compliance-msg fail" style={{ marginTop: 10 }}>
          Missing: {missing.join(', ')} — script execution will be blocked (Gharar).
        </div>
      )}
      {violated.length > 0 && (
        <div className="compliance-msg warn" style={{ marginTop: 10 }}>
          Forbidden profit terms detected: {violated.join(', ')} — violates Qard Hassan rules (Riba prohibition).
        </div>
      )}
    </>
  );
}

function Contract() {
  const { id } = useParams();
  const [contract, setContract]   = React.useState(null);
  const [certs, setCerts]         = React.useState([]);
  const [err, setErr]             = React.useState('');
  const [busy, setBusy]           = React.useState('');

  function load() {
    ledger().getContract(id)
      .then(res => setContract(res.contract))
      .catch(() => setErr('Contract not found'));
    ledger().getCertificates(id)
      .then(res => setCerts(res.certificates || []))
      .catch(() => {});
  }

  React.useEffect(() => { load(); }, [id]);

  function setStatus(status) {
    setBusy(status);
    ledger().updateContractStatus(id, status)
      .then(() => { load(); setBusy(''); })
      .catch(e => { setErr(e?.response?.data?.err || 'Error updating status'); setBusy(''); });
  }

  if (err) return <Wrapper><div className="top-container"><div className="err">{err}</div></div></Wrapper>;
  if (!contract) return <Wrapper><div className="top-container"><div className="loading">Loading…</div></div></Wrapper>;

  const typeColor   = TYPE_COLOR[contract.type]   || 'var(--text-3)';
  const statusColor = STATUS_COLOR[contract.status] || 'var(--text-3)';
  const transitions = TRANSITIONS[contract.status] || [];

  let termsFormatted = '';
  try { termsFormatted = JSON.stringify(contract.terms, null, 2); } catch { termsFormatted = '{}'; }

  return (
    <Wrapper>
      <div className="top-container">
        <Link to="/contracts" className="back">← Contracts</Link>

        <div className="page-header">
          <div>
            <div className="contract-id">{contract.id}</div>
            <div className="badges">
              <span className="badge" style={badgeStyle(typeColor)}>{contract.type}</span>
              <span className="badge" style={badgeStyle(statusColor)}>{contract.status}</span>
              {contract.aaoifi_fas && (
                <span className="badge" style={{ color: 'var(--text-3)', borderColor: 'var(--border)', background: 'transparent' }}>
                  {contract.aaoifi_fas}
                </span>
              )}
            </div>
          </div>

          {transitions.length > 0 && (
            <div className="status-actions">
              {transitions.map(s => (
                <button
                  key={s}
                  className="btn-status"
                  style={{ color: STATUS_COLOR[s], borderColor: STATUS_COLOR[s] + '55' }}
                  disabled={busy === s}
                  onClick={() => setStatus(s)}
                >
                  {busy === s ? '…' : `→ ${s}`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-title">Parties</div>
            <div className="field">
              <div className="field-label">Client</div>
              <div className="field-val">{contract.parties?.client || '—'}</div>
            </div>
            <div className="field">
              <div className="field-label">Bank</div>
              <div className="field-val">{contract.parties?.bank || '—'}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Metadata</div>
            <div className="field">
              <div className="field-label">Ledger</div>
              <div className="field-val">{contract.ledger || '—'}</div>
            </div>
            <div className="field">
              <div className="field-label">Created</div>
              <div className="field-val-plain">{new Date(contract.created_at).toLocaleString()}</div>
            </div>
            <div className="field">
              <div className="field-label">Updated</div>
              <div className="field-val-plain">{new Date(contract.updated_at).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Terms</div>
          <div className="terms-block">{termsFormatted || '{}'}</div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Sharia Compliance — Terms</div>
          <TermsCompliance type={contract.type} terms={contract.terms} />
        </div>

        <div className="card">
          <div className="card-title">Certificates</div>
          {certs.length === 0 ? (
            <div className="no-certs">No certificates issued for this contract.</div>
          ) : (
            <table className="certs-table">
              <thead>
                <tr>
                  <th>Hash</th><th>Tx ID</th><th>Issued At</th>
                </tr>
              </thead>
              <tbody>
                {certs.map(cert => (
                  <tr key={cert.id}>
                    <td><span className="cert-hash">{cert.id?.slice(0, 16)}…</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{cert.txid ?? '—'}</td>
                    <td>{new Date(cert.issued_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

export default Contract;
