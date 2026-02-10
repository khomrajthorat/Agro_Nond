const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Get current access token
async function getAccessToken() {
  return localStorage.getItem('auth_token');
}

// Authenticated API request wrapper
async function apiRequest(endpoint, options = {}) {
  const token = await getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      console.warn('Unauthorized - token may be expired');
      // Optional: Redirect to login
      // window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      // Try to parse error message from JSON, fallback to text if failed
      let errorMessage = 'API request failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If not JSON, use status text
        errorMessage = response.statusText;
      }
      throw new Error(errorMessage);
    }

    // Handle Blob response for downloads
    if (options.responseType === 'blob') {
      return await response.blob();
    }

    // Default: Handle JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Auth
  auth: {
    login: (phone) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone }) }),
    verify: (phone, otp) => apiRequest('/api/auth/verify', { method: 'POST', body: JSON.stringify({ phone, otp }) }),
    logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  },

  // --- GENERIC METHODS (Fixes "api.get is not a function" error) ---
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, data, options) => apiRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint, data, options) => apiRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),
  patch: (endpoint, data, options) => apiRequest(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' }),

  // Health
  health: () => apiRequest('/api/health', { method: 'GET' }),

  // Purchases
  purchases: {
    list: (params = {}) => {
      // Map frontend date range to backend 'date' param (backend supports single date filtering)
      const apiParams = { ...params };
      if (apiParams.startDate && !apiParams.date) {
        apiParams.date = apiParams.startDate;
      }

      const query = new URLSearchParams(apiParams).toString();
      return apiRequest(`/api/records/completed${query ? '?' + query : ''}`, { method: 'GET' });
    },
    get: (id) => apiRequest(`/api/purchases/${id}`, { method: 'GET' }),
    stats: () => apiRequest('/api/purchases/stats', { method: 'GET' }),
    create: (data) => apiRequest('/api/purchases', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiRequest(`/api/purchases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/api/purchases/${id}`, { method: 'DELETE' }),
  },

  // Farmer Contacts
  farmerContacts: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/api/farmer-contacts${query ? '?' + query : ''}`, { method: 'GET' });
    },
    get: (id) => apiRequest(`/api/farmer-contacts/${id}`, { method: 'GET' }),
    create: (data) => apiRequest('/api/farmer-contacts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiRequest(`/api/farmer-contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    updateStats: (id, transactionValue) => apiRequest(`/api/farmer-contacts/${id}/stats`, {
      method: 'PATCH',
      body: JSON.stringify({ transaction_value: transactionValue })
    }),
    delete: (id) => apiRequest(`/api/farmer-contacts/${id}`, { method: 'DELETE' }),
  },

  // Records (Weighing + Farmer Dashboard)
  records: {
    // --- Existing Weight Staff Methods ---
    searchFarmer: (phone) => apiRequest(`/api/records/search-farmer?phone=${phone}`, { method: 'GET' }),
    getPending: (farmerId) => apiRequest(`/api/records/pending/${farmerId}`, { method: 'GET' }),
    updateWeight: (id, weight) => apiRequest(`/api/records/${id}/weight`, {
      method: 'PATCH',
      body: JSON.stringify({ official_qty: weight })
    }),

    // --- Token Methods ---
    searchByToken: (token) => apiRequest(`/api/records/search-by-token?token=${token}`, { method: 'GET' }),
    myToken: () => apiRequest('/api/records/my-token', { method: 'GET' }),

    // --- NEW Farmer Dashboard Methods ---
    myRecords: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/api/records/my-records${query ? '?' + query : ''}`, { method: 'GET' });
    },
    myStats: () => apiRequest('/api/records/my-stats', { method: 'GET' }),
    add: (data) => apiRequest('/api/records/add', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiRequest(`/api/records/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/api/records/${id}`, { method: 'DELETE' }),
  },



  // User Profile
  users: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/api/users${query ? '?' + query : ''}`, { method: 'GET' });
    },
    getProfile: () => apiRequest('/api/users/profile', { method: 'GET' }),
    updateProfile: (data) => apiRequest('/api/users/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    setRole: (role) => apiRequest('/api/users/set-role', { method: 'POST', body: JSON.stringify({ role }) }),
  },

  // Admin
  admin: {
    metrics: () => apiRequest('/api/admin/metrics', { method: 'GET' }),
    farmers: () => apiRequest('/api/admin/farmers', { method: 'GET' }),
    traders: () => apiRequest('/api/admin/traders', { method: 'GET' }),
    weightRecords: () => apiRequest('/api/admin/weight-records', { method: 'GET' }),
    lilavBids: () => apiRequest('/api/admin/lilav-bids', { method: 'GET' }),
    committeeRecords: () => apiRequest('/api/admin/committee-records', { method: 'GET' }),
    configs: {
      list: () => apiRequest('/api/admin/configs', { method: 'GET' }),
      update: (data) => apiRequest('/api/admin/configs', { method: 'POST', body: JSON.stringify(data) }),
    },
    commissionRules: {
      list: () => apiRequest('/api/admin/commission-rules', { method: 'GET' }),
      create: (data) => apiRequest('/api/admin/commission-rules', { method: 'POST', body: JSON.stringify(data) }),
    },
    users: {
      list: (params = {}) => {
        const cleanParams = Object.fromEntries(
          Object.entries(params).filter(([_, v]) => v != null)
        );
        const query = new URLSearchParams(cleanParams).toString();
        return apiRequest(`/api/admin/users${query ? '?' + query : ''}`, { method: 'GET' });
      },
      updateRole: (id, role) => apiRequest(`/api/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
      create: (data) => apiRequest('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => apiRequest(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id) => apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' }),
    },
    auditLogs: {
      list: (params = {}) => {
        const cleanParams = Object.fromEntries(
          Object.entries(params).filter(([_, v]) => v != null)
        );
        const query = new URLSearchParams(cleanParams).toString();
        return apiRequest(`/api/admin/audit-logs${query ? '?' + query : ''}`, { method: 'GET' });
      },
      summary: () => apiRequest('/api/admin/audit-logs/summary', { method: 'GET' }),
    },
    settings: {
      list: () => apiRequest('/api/admin/settings', { method: 'GET' }),
      update: (key, value, description) => apiRequest(`/api/admin/settings/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ value, description })
      }),
    },
  },

  // Finance
  finance: {
    billingRecords: {
      list: (params = {}) => {
        const cleanParams = Object.fromEntries(
          Object.entries(params).filter(([_, v]) => v != null)
        );
        const query = new URLSearchParams(cleanParams).toString();
        return apiRequest(`/api/finance/billing-records${query ? '?' + query : ''}`, { method: 'GET' });
      },
    },
    commissionRates: {
      list: () => apiRequest('/api/finance/commission-rates', { method: 'GET' }),
    },
    payments: {
      create: (data) => apiRequest('/api/finance/payments', { method: 'POST', body: JSON.stringify(data) }),
      payFarmer: (id, data) => apiRequest(`/api/finance/pay-farmer/${id}`, { method: 'POST', body: JSON.stringify(data) }),
      receiveTrader: (id, data) => apiRequest(`/api/finance/receive-trader/${id}`, { method: 'POST', body: JSON.stringify(data) }),
      bulkReceiveTrader: (data) => apiRequest('/api/finance/bulk-receive-trader', { method: 'POST', body: JSON.stringify(data) }),
    },
    stats: () => apiRequest('/api/finance/stats', { method: 'GET' }),
    cashflow: () => apiRequest('/api/finance/cashflow', { method: 'GET' }),
  },

  // Trader
  trader: {
    stats: () => apiRequest('/api/trader/stats', { method: 'GET' }),
    transactions: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/api/records/my-purchases${query ? '?' + query : ''}`, { method: 'GET' });
    },


  },
  weight: {
    stats: () => apiRequest('/api/weight/stats', { method: 'GET' }),
    records: () => apiRequest('/api/weight/records', { method: 'GET' }),
    pendingRecords: () => apiRequest('/api/weight/pending', { method: 'GET' }),
    createRecord: (data) => apiRequest('/api/weight/record', { method: 'POST', body: JSON.stringify(data) }),
    updateRecord: (id, data) => apiRequest(`/api/weight/record/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteRecord: (id) => apiRequest(`/api/weight/record/${id}`, { method: 'DELETE' }),
    getProfile: () => apiRequest('/api/weight/profile', { method: 'GET' }),
    updateProfile: (data) => apiRequest('/api/weight/profile', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Vegetables
  vegetables: {
    list: () => apiRequest('/api/vegetables', { method: 'GET' }),
    create: (data) => apiRequest('/api/vegetables', { method: 'POST', body: JSON.stringify(data) }),
    bulkCreate: (vegetables) => apiRequest('/api/vegetables/bulk', { method: 'POST', body: JSON.stringify({ vegetables }) }),
    seed: () => apiRequest('/api/vegetables/seed', { method: 'POST' }),
    update: (id, data) => apiRequest(`/api/vegetables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    bulkUpdate: (ids, updates) => apiRequest('/api/vegetables/bulk-update', { method: 'POST', body: JSON.stringify({ ids, updates }) }),
    delete: (id) => apiRequest(`/api/vegetables/${id}`, { method: 'DELETE' }),
    bulkDelete: (ids) => apiRequest('/api/vegetables/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  },

  // Notifications
  notifications: {
    list: () => apiRequest('/api/notifications', { method: 'GET' }),
    markRead: (id) => apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => apiRequest('/api/notifications/read-all', { method: 'PATCH' }),
  },
};

export default api;