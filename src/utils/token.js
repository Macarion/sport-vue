const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

export const getAccess = () => sessionStorage.getItem(ACCESS_KEY);
export const setAccess = (token) => sessionStorage.setItem(ACCESS_KEY, token);
export const getRefresh = () => sessionStorage.getItem(REFRESH_KEY);
export const setRefresh = (token) => sessionStorage.setItem(REFRESH_KEY, token);
export const clearAuth = () => {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
};
