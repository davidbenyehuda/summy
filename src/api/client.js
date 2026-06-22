const TOKEN_KEY = 'sammy_access_token';

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

function createEntityClient(entityName, apiPath) {
  return {
    async filter(filters = {}, _sort, limit = 50) {
      const params = new URLSearchParams({ ...filters, limit: String(limit) });
      return apiFetch(`/entities/${apiPath}?${params}`);
    },
    async get(id) {
      const results = await this.filter({ id });
      return results[0] || null;
    },
    async create(data) {
      return apiFetch(`/entities/${apiPath}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async update(id, data) {
      return apiFetch(`/entities/${apiPath}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    async delete(id) {
      return apiFetch(`/entities/${apiPath}/${id}`, { method: 'DELETE' });
    },
  };
}

const auth = {
  async isAuthenticated() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    try {
      await this.me();
      return true;
    } catch {
      return false;
    }
  },

  async me() {
    return apiFetch('/auth/me');
  },

  setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  },

  async loginViaEmailPassword(email, password) {
    const { access_token } = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(access_token);
  },

  async register({ email, password }) {
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async verifyOtp({ email, otpCode }) {
    const result = await apiFetch('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode }),
    });
    if (result.access_token) this.setToken(result.access_token);
    return result;
  },

  async resendOtp(email) {
    await apiFetch('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async updateMe(data) {
    return apiFetch('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  logout(redirectUrl) {
    this.setToken(null);
    if (redirectUrl) {
      window.location.href = redirectUrl.startsWith('/') ? redirectUrl : '/login';
    }
  },

  redirectToLogin() {
    window.location.href = '/login';
  },

  async resetPasswordRequest(email) {
    await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword({ resetToken, newPassword }) {
    await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword }),
    });
  },
};

const entities = new Proxy(
  {},
  {
    get(_target, prop) {
      const map = {
        StudentProfile: 'student-profiles',
        SummaryHistory: 'summary-history',
      };
      const path = map[prop];
      if (!path) {
        return createEntityClient(String(prop), 'unknown');
      }
      return createEntityClient(String(prop), path);
    },
  }
);

const integrations = {
  Core: {
    async AnalyzeDocument({ file }) {
      const form = new FormData();
      form.append('file', file);
      return apiFetch('/integrations/analyze', { method: 'POST', body: form });
    },

    async InvokeLLM({ prompt }) {
      return apiFetch('/integrations/llm', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
    },
  },
};

export const db = { auth, entities, integrations };
export default db;
