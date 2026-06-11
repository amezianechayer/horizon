import * as React from 'react';

// identity = null when auth is disabled or no session: full access (dev mode)
// identity = {subject, role, kind, ledgers} when logged in
const SessionContext = React.createContext(null);

function canOperate(identity) {
  if (!identity) {
    return true; // auth disabled
  }
  return identity.role === 'operator' || identity.role === 'admin';
}

export {
  SessionContext,
  canOperate,
};
