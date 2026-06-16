import axios from "axios";
import { useSecurityStore } from "@/stores/security";
import router from "@/router";
import { getAccess, getRefresh, setAccess, clearAuth } from "@/utils/token";

const baseURL = "http://localhost:8090/"; // 业务接口
const authBaseURL = "http://121.196.163.155:8080"; // 远程鉴权服务
const api = axios.create({
  baseURL,
  timeout: 10000,
});

const NO_JWT_ENDPOINTS = ["/api/login/", "/api/register/"];

const getDeviceId = () => {
  const key = "device_id";
  if (typeof window === "undefined") return "";
  let cached = localStorage.getItem(key);
  if (cached) return cached;
  const seed = `${navigator.userAgent}-${navigator.platform}-${Date.now()}-${Math.random()}`;
  const uuid = (crypto.randomUUID && crypto.randomUUID()) || btoa(seed).replace(/=/g, "");
  localStorage.setItem(key, uuid);
  return uuid;
};

const requiresJWT = (config) => {
  const url = config.url?.toLowerCase() || "";
  return !NO_JWT_ENDPOINTS.some((endpoint) =>
    url.includes(endpoint.toLowerCase())
  );
};

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(token);
    }
  });
  refreshQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const deviceId = getDeviceId();
    if (deviceId) {
      config.headers["X-Client-Device"] = deviceId;
    }
    if (requiresJWT(config)) {
      const token = getAccess();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response) {
      return Promise.reject(error);
    }

    // 登录未授权时，直接弹窗提示
    const isLoginRequest =
      config?.url && config.url.toLowerCase().includes("/api/login");
    const unauthorizedLogin =
      (response.status === 401 || response.status === 403) &&
      isLoginRequest &&
      (response.data === "user_not_authorized" ||
        response.data?.error === "user_not_authorized" ||
        response.data?.detail === "user_not_authorized" ||
        (typeof response.data?.error === "string" &&
          response.data.error.includes("未授权")) ||
        (typeof response.data?.detail === "string" &&
          response.data.detail.includes("未授权")));
    if (unauthorizedLogin) {
      window.alert("账户未授权，请联系管理员后再登录");
      return Promise.reject(error);
  }

  // 情况一：远端明确告知 token 已失效/被撤销（例如被顶号），直接退出，不再尝试刷新
  if (response.status === 401) {
    const detail = response.data?.detail;
    if (
      detail === "Token invalid or revoked" ||
      detail === "Token revoked or expired"
    ) {
      handleLogout("账号已在其他设备登录或登录已失效，请重新登录");
      return Promise.reject(error);
    }
  }

    if ((response.status === 401 || response.status === 419) && !config._retry) {
      config._retry = true;
      return handleTokenRefresh(config, error);
    }

    if (
      response.status === 403 &&
      response.data?.code === "require_totp" &&
      !config._totpRetry
    ) {
      return handleTotpVerification(config);
    }

    return Promise.reject(error);
  }
);

async function handleTokenRefresh(originalRequest, error) {
  const refreshToken = getRefresh();
  if (!refreshToken) {
    handleLogout();
    return Promise.reject(error);
  }

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    })
      .then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      })
      .catch((err) => Promise.reject(err));
  }

  isRefreshing = true;
  try {
    const refreshResp = await axios.post(
      `${baseURL}api/token/refresh/`,
      {
        refresh: refreshToken,
      },
      {
        headers: { "X-Client-Device": getDeviceId() },
      }
    );
    const newAccess = refreshResp.data.access;
    setAccess(newAccess);
    isRefreshing = false;
    processQueue(null, newAccess);
    originalRequest.headers.Authorization = `Bearer ${newAccess}`;
    return api(originalRequest);
  } catch (refreshErr) {
    isRefreshing = false;
    processQueue(refreshErr, null);

    // 根据后端返回的 detail，给出更明确的提示
    const detail = refreshErr?.response?.data?.detail;
    if (
      detail === "Token invalid or revoked" ||
      detail === "Token revoked or expired"
    ) {
      // 典型场景：账号在其他地方登录 / 远端主动撤销令牌
      handleLogout("账号已在其他设备登录或登录已失效，请重新登录");
    } else if (detail === "Introspection failed") {
      handleLogout("鉴权服务异常，请稍后再试");
    } else {
      handleLogout("登录已过期，请重新登录");
    }

    return Promise.reject(refreshErr);
  }
}

async function handleTotpVerification(originalRequest) {
  originalRequest._totpRetry = true;
  try {
    const securityStore = useSecurityStore();
    const totpCode = await securityStore.openTotpDialog();

    if (totpCode) {
      originalRequest.headers["X-TOTP-Code"] = totpCode;
      return api(originalRequest);
    }
    return Promise.reject(new Error("TOTP verification canceled"));
  } catch (dialogError) {
    return Promise.reject(dialogError);
  }
}

function handleLogout(message) {
  clearAuth();
  // if (window.__heartbeatTimer) {
  //   clearInterval(window.__heartbeatTimer);
  //   delete window.__heartbeatTimer;
  // }
  if (message) {
    // 这里可以换成 ElMessage / ElNotification 等组件
    window.alert(message);
  }
  router.push("/login");
}

export default api;
export { baseURL, authBaseURL, getDeviceId };
