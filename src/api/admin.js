import { http } from './http';

export function adminLogin(password) {
  return http('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
}

export function adminLogout() {
  return http('/api/admin/logout', { method: 'POST' });
}
