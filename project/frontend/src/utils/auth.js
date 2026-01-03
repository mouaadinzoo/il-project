const API_BASE = 'http://localhost:4000/api/auth';

const parseJson = async (res) => {
  try {
    return await res.json();
  } catch (err) {
    return null;
  }
};

export const fetchCurrentUser = async () => {
  const res = await fetch(`${API_BASE}/me`, { credentials: 'include' });
  if (!res.ok) return null;
  const data = await parseJson(res);
  return data?.user || null;
};

export const signIn = async ({ email, password }) => {
  const res = await fetch(`${API_BASE}/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data?.error || 'Sign in failed.');
  }
  return data.user;
};

export const signUp = async ({ name, email, password }) => {
  const res = await fetch(`${API_BASE}/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, password })
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data?.error || 'Sign up failed.');
  }
  return data.user;
};

export const signOut = async () => {
  const res = await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!res.ok) {
    const data = await parseJson(res);
    throw new Error(data?.error || 'Sign out failed.');
  }
  return true;
};
