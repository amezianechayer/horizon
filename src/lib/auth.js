import * as axios from 'axios';
import {url} from './ledger';

const TOKEN_KEY = 'corren_token';

function getToken() {
  return window.localStorage.getItem(TOKEN_KEY) || '';
}

function setToken(token) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
  applyToken();
}

function applyToken() {
  const token = getToken();
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}

function login(username, password) {
  return axios
    .post(url('/auth/login'), {username, password})
    .then(res => {
      setToken(res.data.data.token);
      return res.data.data;
    });
}

function logout() {
  const done = () => setToken('');
  return axios.post(url('/auth/logout')).then(done).catch(done);
}

// me resolves to the identity, or null when auth is disabled / no session
function me() {
  return axios
    .get(url('/auth/me'))
    .then(res => res.data.data)
    .catch(() => null);
}

// installs a response interceptor that redirects to /login on 401
// (except on the login call itself)
function installUnauthorizedRedirect() {
  axios.interceptors.response.use(
    res => res,
    err => {
      const status = err.response && err.response.status;
      const reqUrl = (err.config && err.config.url) || '';
      // /auth/login failures are shown inline; /auth/me is a probe that
      // legitimately 401s when there is no session (e.g. auth disabled)
      if (status === 401
          && reqUrl.indexOf('/auth/login') === -1
          && reqUrl.indexOf('/auth/me') === -1
          && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(err);
    },
  );
}

applyToken();

export {
  getToken,
  setToken,
  login,
  logout,
  me,
  installUnauthorizedRedirect,
};
