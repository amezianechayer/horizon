import * as axios from 'axios';

class Ledger {
  constructor(name) {
    this.name = name || 'quickstart';
  }

  getInfo() {
    const p = new Promise((resolve, reject) => {
      axios
      .get(url('/_info'))
      .then(res => {
        resolve(res.data);
      })
      .catch(() => {
        reject();
      })
    });
  
    return p;
  }

  getStats() {
    const p = new Promise((resolve, reject) => {
      axios
      .get(url(`/${this.name}/stats`))
      .then(res => {
        resolve(res.data);
      })
      .catch(() => {
        reject();
      })
    });
  
    return p;
  }

  getTransactions(query) {
    const params = query || {};
  
    console.log(params);
  
    const p = new Promise((resolve, reject) => {
      axios
        .get(url(`/${this.name}/transactions`), {
          params,
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((e) => {
          reject(e);
        });
    });
  
    return p;
  }

  getAccounts(query) {
    const params = query || {};

    const p = new Promise((resolve, reject) => {
      axios
        .get(url(`/${this.name}/accounts`), {
          params,
        })
        .then((res) => {
          console.log(res.data);
          resolve(res.data);
        })
        .catch(() => {
          reject();
        });
    });
  
    return p;
  }

  getAccount(address) {
    const p = new Promise((resolve, reject) => {
      axios
        .get(url(`/${this.name}/accounts/${address}`))
        .then((res) => {
          resolve(res.data);
        })
        .catch(() => {
          reject();
        });
    });

    return p;
  }

  // --- sharia contracts ---

  getContracts(query) {
    return axios
      .get(url(`/${this.name}/contracts`), {params: query || {}})
      .then(res => res.data.data);
  }

  getContract(id) {
    return axios
      .get(url(`/${this.name}/contracts/${id}`))
      .then(res => res.data.data); // {contract, schedule}
  }

  createContract(body) {
    return axios
      .post(url(`/${this.name}/contracts`), body)
      .then(res => res.data.data)
      .catch(rethrowApiError);
  }

  transition(id, name, input) {
    return axios
      .post(url(`/${this.name}/contracts/${id}/transitions/${name}`), input || {})
      .then(res => res.data.data)
      .catch(rethrowApiError);
  }

  getAudit(id) {
    return axios
      .get(url(`/${this.name}/contracts/${id}/audit`), {params: {verify: 'true'}})
      .then(res => res.data.data); // {events, chain_valid}
  }
}

// normalizes API errors: sharia errors carry {error, message, standard_ref},
// legacy errors carry {error_message}
function rethrowApiError(err) {
  const data = (err.response && err.response.data) || {};
  const e = new Error(data.message || data.error_message || 'request failed');
  e.code = data.error;
  e.standardRef = data.standard_ref;
  throw e;
}

function url(path) {
  return `http://localhost:3068${path || ''}`;
}

function getInfo() {
  const p = new Promise((resolve, reject) => {
    axios
    .get(url('/_info'))
    .then(res => {
      resolve(res.data);
    })
    .catch(e => {
      reject(e);
    })
  });

  return p;
}

export default (name) => {
  return new Ledger(name);
};

export {
  getInfo,
  url,
};