import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Cylinder Prices
export const getCylinderPrices = async () => {
  const response = await axios.get(`${API}/prices`);
  return response.data;
};

export const updateCylinderPrice = async (cylinderType, price) => {
  const response = await axios.put(
    `${API}/admin/prices/${cylinderType}`,
    { price },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// Customer Lookup
export const getCustomerByAgencyId = async (agencyId) => {
  const response = await axios.get(`${API}/customers/${agencyId}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Orders
export const createOrder = async (orderData) => {
  const response = await axios.post(`${API}/orders`, orderData, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getUserOrders = async () => {
  const response = await axios.get(`${API}/orders`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getOrderById = async (orderId) => {
  const response = await axios.get(`${API}/orders/${orderId}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Payment
export const initiatePayment = async (orderId, amount) => {
  const response = await axios.post(
    `${API}/payment/initiate`,
    { orderId, amount },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const verifyPayment = async (orderId, paymentId, success) => {
  const response = await axios.post(
    `${API}/payment/verify`,
    { orderId, paymentId, success },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// Admin Orders
export const getAllOrders = async () => {
  const response = await axios.get(`${API}/admin/orders`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const updateOrderStatus = async (orderId, orderStatus) => {
  const response = await axios.put(
    `${API}/admin/orders/${orderId}/status`,
    { orderStatus },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// Coupons
export const validateCoupon = async (code, amount) => {
  const response = await axios.post(
    `${API}/coupons/validate?code=${code}&amount=${amount}`,
    {},
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const createCoupon = async (couponData) => {
  const response = await axios.post(`${API}/admin/coupons`, couponData, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getAllCoupons = async () => {
  const response = await axios.get(`${API}/admin/coupons`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Offers
export const getActiveOffers = async () => {
  const response = await axios.get(`${API}/offers`);
  return response.data;
};

export const createOffer = async (offerData) => {
  const response = await axios.post(`${API}/admin/offers`, offerData, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getAllOffers = async () => {
  const response = await axios.get(`${API}/admin/offers`, {
    headers: getAuthHeaders()
  });
  return response.data;
};
