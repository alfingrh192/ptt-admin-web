export const setToken = (token: string) => {
  document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Strict`;
};

export const getToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
  return match ? match[2] : null;
};

export const removeToken = () => {
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};

export const decodeToken = (token: string) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};