/**
 * ET.TEE Store — Ops Core API client.
 * Dùng chung cho cả 3 khu vực Admin / Store Owner / CSKH.
 * Load file này ở CUỐI <body> (sau khi DOM đã có), auth-guard.js load riêng ở <head>.
 */
(function (global) {
  'use strict';

  // Đổi URL này khi deploy thật (hoặc set window.ETTEE_API_BASE trước khi load file này).
  const API_BASE = global.ETTEE_API_BASE || 'http://localhost:8080';

  const STORAGE_KEY = 'ettee_auth';

  function depthPrefix() {
    // Các trang nằm trong /admin/, /store-owner/, /cskh/ (1 cấp dưới root) -> cần "../" để về root.
    // Trang login.html/index.html ở root -> không cần prefix.
    const path = global.location.pathname;
    const segments = path.split('/').filter(Boolean);
    // Tên file luôn là segment cuối, nên độ sâu thư mục = segments.length - 1
    const depth = Math.max(segments.length - 1, 0);
    return '../'.repeat(depth);
  }

  function getAuth() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setAuth(auth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  }

  function clearAuth() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function goToLogin() {
    clearAuth();
    global.location.replace(depthPrefix() + 'login.html');
  }

  /**
   * Gọi API, tự đính JWT, tự parse envelope { success, data, message }.
   * Trả về `data` khi success=true; throw Error(message) khi success=false hoặc lỗi mạng.
   * Tự đăng xuất + chuyển về login khi gặp 401.
   */
  async function apiRequest(path, options = {}) {
    const auth = getAuth();
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      options.headers || {}
    );
    if (auth && auth.accessToken) {
      headers['Authorization'] = 'Bearer ' + auth.accessToken;
    }

    let response;
    try {
      response = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    } catch (networkErr) {
      throw new Error('Không kết nối được tới server (' + API_BASE + '). Kiểm tra backend đã chạy chưa.');
    }

    if (response.status === 401) {
      goToLogin();
      throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
    }

    let body;
    try {
      body = await response.json();
    } catch (e) {
      body = null;
    }

    if (!response.ok || !body || body.success === false) {
      const message = (body && body.message) || ('Lỗi HTTP ' + response.status);
      const err = new Error(message);
      err.details = body && body.details;
      err.errorCode = body && body.errorCode;
      throw err;
    }

    return body.data;
  }

  const api = {
    get: (path) => apiRequest(path, { method: 'GET' }),
    post: (path, body) => apiRequest(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
    put: (path, body) => apiRequest(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
    del: (path) => apiRequest(path, { method: 'DELETE' }),

    login: async function (usernameOrPhone, password) {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ usernameOrPhone, password })
      });
      setAuth(data);
      return data;
    },
    logout: goToLogin,
    getAuth,
    hasRole: function (roleCode) {
      const auth = getAuth();
      return !!auth && Array.isArray(auth.roles) && auth.roles.includes(roleCode);
    },
    hasPermission: function (permCode) {
      const auth = getAuth();
      return !!auth && Array.isArray(auth.permissions) && auth.permissions.includes(permCode);
    }
  };

  function ensureLogoutButton() {
    const auth = getAuth();
    if (!auth || !auth.accessToken) {
      return;
    }

    if (document.getElementById('ettee-logout-btn')) {
      return;
    }

    const button = document.createElement('button');
    button.id = 'ettee-logout-btn';
    button.type = 'button';
    button.textContent = 'Đăng xuất';
    button.style.border = 'none';
    button.style.borderRadius = '14px';
    button.style.padding = '12px 14px';
    button.style.fontSize = '14px';
    button.style.fontWeight = '600';
    button.style.background = '#DA1D26';
    button.style.color = '#fff';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 8px 24px rgba(218, 29, 38, 0.25)';
    button.style.transition = 'opacity 0.15s ease';
    button.style.width = '100%';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.onmouseenter = function () {
      button.style.opacity = '0.92';
    };
    button.onmouseleave = function () {
      button.style.opacity = '1';
    };
    button.onclick = function () {
      clearAuth();
      global.location.replace(depthPrefix() + 'login.html');
    };

    const sidebar = document.querySelector('.vt-sidebar') || document.querySelector('aside') || document.querySelector('nav');
    if (sidebar) {
      const sidebarContent = sidebar.firstElementChild || sidebar;
      sidebarContent.style.display = 'flex';
      sidebarContent.style.flexDirection = 'column';
      sidebarContent.style.gap = '8px';
      sidebarContent.style.height = '100%';
      sidebarContent.style.justifyContent = 'space-between';

      const footer = document.createElement('div');
      footer.style.marginTop = 'auto';
      footer.style.zIndex = '1';
      footer.style.paddingTop = '12px';
      footer.style.borderTop = '1px solid rgba(31,41,55,0.06)';
      footer.style.background = 'rgba(255,255,255,0.96)';
      footer.appendChild(button);
      sidebarContent.appendChild(footer);
    } else {
      button.style.position = 'fixed';
      button.style.bottom = '18px';
      button.style.right = '18px';
      button.style.zIndex = '9999';
      button.style.width = 'auto';
      document.body.appendChild(button);
    }
  }

  global.EtteeApi = api;
  ensureLogoutButton();
})(window);
