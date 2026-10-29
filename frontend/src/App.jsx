import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight,
  Camera, CircleUserRound, Heart, Leaf, Menu, MessageCircle, Minus, Moon, PackageCheck, Plus,
  Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Star, Sun, Truck, X,
} from 'lucide-react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import AdminCatalog from './AdminCatalog.jsx';
import AdminOrders from './AdminOrders.jsx';
import AdminUsers from './AdminUsers.jsx';
import AdminAssets from './AdminAssets.jsx';
import AdminSiteImages from './AdminSiteImages.jsx';
import AdminContact from './AdminContact.jsx';
import AdminNewsletter from './AdminNewsletter.jsx';
import AdminReviews from './AdminReviews.jsx';
import AdminNav from './AdminNav.jsx';

const ASSET = `${import.meta.env.BASE_URL}assets/`;
const siteImageOverrides = {};
const image = (name) => siteImageOverrides[name] || `${ASSET}${name}`;
const API_HOST = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:4000`;
const API_BASE = `${API_HOST}/api/v1`;
const csrf = () => decodeURIComponent(document.cookie.split('; ').find((item) => item.startsWith('nrh_csrf='))?.split('=').slice(1).join('=') || '');

const products = [
  {
    id: 'testo-boost-capsules',
    name: 'Testo Boost Capsules',
    category: 'Daily vitality',
    price: 199,
    originalPrice: 221.11,
    discount: 10,
    size: '60 capsules',
    image: image('testo-boost-capsules.jpg'),
    gallery: [
      image('testo-boost-capsules.jpg'),
      image('product-gallery-detail.jpg'),
      image('journal-slower-routine.jpg'),
    ],
    details: 'A thoughtfully composed capsule format for an intentional daily routine.',
    ingredients: 'Please refer to the final product label for complete ingredients and recommended use.',
  },
  {
    id: 'dr-sebi-herbal-kit',
    name: 'Dr. Sebi Herbal Kit',
    category: 'Herbal collection',
    price: 199,
    originalPrice: 248.75,
    discount: 20,
    size: '60 tablets',
    image: image('dr-sebi-herbal-kit.jpg'),
    gallery: [
      image('dr-sebi-herbal-kit.jpg'),
      image('triphala-powder.jpg'),
      image('product-gallery-detail.jpg'),
    ],
    details: 'A considered herbal kit designed to sit beautifully within a mindful wellness ritual.',
    ingredients: 'Please refer to the final product label for complete ingredients and recommended use.',
  },
];

const CatalogContext = createContext({ products, loading: false });
const useCatalogProducts = () => useContext(CatalogContext).products;
const mapCatalogProduct = (product) => ({
  id: product.slug,
  name: product.name,
  category: product.category?.name || '',
  price: product.finalPriceMinor / 100,
  originalPrice: product.listPriceMinor / 100,
  discount: product.discount?.value || 0,
  size: product.size,
  image: product.images?.[0]?.reference || '',
  gallery: (product.images || []).map((item) => item.reference),
  details: product.details || product.description,
  ingredients: product.ingredients || '',
});

const articles = [
  {
    slug: 'the-art-of-a-slower-routine',
    type: 'Rituals',
    title: 'The art of a slower wellness routine',
    date: 'October 12, 2026',
    image: image('journal-slower-routine.jpg'),
    excerpt: 'A few small ways to make the beginning and end of each day feel more intentional.',
  },
  {
    slug: 'a-gentle-introduction-to-ayurveda',
    type: 'Ayurveda',
    title: 'A gentle introduction to Ayurveda',
    date: 'October 6, 2026',
    image: image('journal-ayurveda.jpg'),
    excerpt: 'An approachable starting point for exploring a tradition rooted in observation and balance.',
  },
  {
    slug: 'bringing-botanicals-into-your-home',
    type: 'Living well',
    title: 'Bringing botanicals into your home',
    date: 'September 28, 2026',
    image: image('journal-botanicals.jpg'),
    excerpt: 'Natural materials, thoughtful light, and pockets of calm for your everyday spaces.',
  },
];

function applySiteImageOverrides(images) {
  images.forEach(({ key, reference }) => { siteImageOverrides[key] = reference; });
  const replace = (reference) => { const key = Object.keys(siteImageOverrides).find((name) => reference.endsWith(`/${name}`)); return key ? siteImageOverrides[key] : reference; };
  products.forEach((product) => { product.image = replace(product.image); product.gallery = product.gallery.map(replace); });
  articles.forEach((article) => { article.image = replace(article.image); });
}

const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(price);
const formatOrderDate = (date) => date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date)) : 'Date unavailable';
const loadRazorpay = () => new Promise((resolve, reject) => { if (window.Razorpay) { resolve(window.Razorpay); return; } const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = () => resolve(window.Razorpay); script.onerror = () => reject(new Error('Payment checkout could not be loaded.')); document.body.appendChild(script); });
const phaseDate = (order, label) => {
  const phase = { Payment: 'payment', Order: 'preparation', Delivery: 'delivery' }[label];
  return order?.statusHistory?.filter((entry) => entry.phase === phase).at(-1)?.changedAt;
};
const ProductPrice = ({ product }) => <span className="product-price"><b>{formatPrice(product.price)}</b><del>{formatPrice(product.originalPrice)}</del><small>{product.discount}% off</small></span>;
const addressDraft = ({ recipientName = '', phone = '', addressLine1 = '', addressLine2 = '', city = '', region = '', postalCode = '', country = '', isDefault = false } = {}) => ({ recipientName, phone, addressLine1, addressLine2, city, region, postalCode, country, isDefault });
const orderAddresses = (addresses) => [...addresses].sort((first, second) => Number(second.isDefault) - Number(first.isDefault));
const statusMeta = {
  order: {
    'pending-payment': ['Awaiting payment', 'We are waiting for payment confirmation.'],
    confirmed: ['Confirmed', 'Your payment is confirmed and the order is accepted.'],
    processing: ['Being prepared', 'Our team is preparing your order.'],
    shipped: ['Shipped', 'Your package has left us and is with the courier.'],
    delivered: ['Delivered', 'Your order has been delivered.'],
    cancelled: ['Cancelled', 'This order will not be fulfilled.'],
  },
  payment: {
    pending: ['Pending', 'Payment has not been verified yet.'],
    paid: ['Paid', 'Payment was successfully verified.'],
    failed: ['Unsuccessful', 'Payment could not be verified.'],
    refunded: ['Refunded', 'This payment has been returned to you.'],
  },
  fulfillment: {
    unfulfilled: ['Not started', 'Your order has not entered preparation yet.'],
    processing: ['Preparing', 'Your package is being prepared.'],
    shipped: ['With courier', 'Your package has been handed to the courier.'],
    delivered: ['Delivered', 'The courier marked your package as delivered.'],
    returned: ['Returned', 'The package was returned to the store.'],
  },
};
const statusInfo = (group, status) => {
  const [label, description] = statusMeta[group]?.[status] || ['Unavailable', 'Status information is unavailable.'];
  return { label, description };
};
const canonicalStatus = (order) => order?.order_status || null;
const customerOrderInfo = (order) => {
  if (!order) return statusInfo('order');
  const canonical = canonicalStatus(order);
  if (canonical) {
    if (order.cancellation) return { label: 'Order cancelled', description: order.cancellation.reason || 'This order will not be fulfilled.' };
    if (canonical.payment === 'failed') return { label: 'Payment failed', description: 'Payment could not be confirmed for this order.' };
    if (canonical.payment === 'refunded') return { label: 'Refunded', description: 'The payment for this order has been refunded.' };
    if (canonical.payment === 'awaiting_payment') return { label: 'Awaiting payment', description: 'We are waiting for payment confirmation.' };
    if (canonical.prep === 'pending') return { label: 'Payment confirmed', description: 'Your payment is confirmed and the order is accepted.' };
    if (canonical.prep === 'being_prepared') return { label: 'Order being prepared', description: 'Our team is preparing your order.' };
    if (canonical.delivery === 'pending') return { label: 'Order prepared', description: 'Your order is prepared for the next delivery step.' };
    if (canonical.delivery === 'processing') return { label: 'With delivery partner', description: 'Your package is with the delivery partner.' };
    return { label: 'Order delivered', description: 'Your order has been delivered.' };
  }
  if (order.orderStatus === 'cancelled') return { label: 'Cancelled', description: 'This order will not be fulfilled.' };
  if (order.paymentStatus === 'pending' || order.orderStatus === 'pending-payment') return { label: 'Awaiting payment', description: 'We are waiting for payment confirmation.' };
  if (order.orderStatus === 'confirmed') return { label: 'Payment confirmed', description: 'Your payment is confirmed and the order is accepted.' };
  if (order.orderStatus === 'processing') return { label: 'Order being prepared', description: 'Our team is preparing your order.' };
  if (order.orderStatus === 'shipped' && !order.trackingId) return { label: 'Being processed by delivery partner', description: 'Your package is being processed by the delivery partner.' };
  if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') return { label: 'Order shipped', description: order.trackingId ? 'Your package has shipped and can be tracked below.' : 'Your package has left us and is with the courier.' };
  return { label: 'Order prepared', description: 'Your order is prepared for the next delivery step.' };
};
const customerOrderProgress = (order) => {
  const canonical = canonicalStatus(order);
  if (canonical) {
    if (order.cancellation) return { current: 'Cancelled', next: 'No further step', phase: -1 };
    if (canonical.payment === 'failed') return { current: 'Payment failed', next: 'No further step', phase: -1 };
    if (canonical.payment === 'refunded') return { current: 'Refunded', next: 'No further step', phase: -1 };
    if (canonical.payment === 'awaiting_payment') return { current: 'Awaiting payment', next: 'Payment confirmed', phase: 0 };
    if (canonical.prep === 'pending') return { current: 'Payment confirmed', next: 'Order being prepared', phase: 1 };
    if (canonical.prep === 'being_prepared') return { current: 'Order being prepared', next: 'Order prepared', phase: 2 };
    if (canonical.delivery === 'pending') return { current: 'Order prepared', next: 'With delivery partner', phase: 3 };
    if (canonical.delivery === 'processing') return { current: 'With delivery partner', next: 'Delivered', phase: 4 };
    return { current: 'Order delivered', next: 'No further step', phase: 5 };
  }
  const paymentStatus = order?.payment?.status || (order?.paymentStatus === 'pending' ? 'awaiting_payment' : order?.paymentStatus);
  const preparationStatus = order?.preparation?.status || (order?.fulfillmentStatus === 'processing' ? 'being_prepared' : order?.fulfillmentStatus === 'shipped' ? 'prepared' : 'pending');
  const deliveryStatus = order?.delivery?.status || (['delivered'].includes(order?.orderStatus) || order?.fulfillmentStatus === 'delivered' ? 'delivered' : order?.trackingId ? 'shipped' : order?.orderStatus === 'shipped' ? 'processing' : 'awaiting_handover');
  if (order?.orderStatus === 'cancelled' || paymentStatus === 'failed') return { current: 'Cancelled', next: 'No further step', phase: -1 };
  if (paymentStatus === 'awaiting_payment') return { current: 'Awaiting payment', next: 'Payment confirmed', phase: 0 };
  if (preparationStatus === 'pending') return { current: 'Payment confirmed', next: 'Order being prepared', phase: 1 };
  if (preparationStatus === 'being_prepared') return { current: 'Order being prepared', next: 'Order prepared', phase: 2 };
  if (deliveryStatus === 'awaiting_handover') return { current: 'Order prepared', next: 'Being processed by delivery partner', phase: 3 };
  if (deliveryStatus === 'processing') return { current: 'Being processed by delivery partner', next: 'Order shipped', phase: 4 };
  if (deliveryStatus === 'delivered') return { current: 'Order delivered', next: 'No further step', phase: 5 };
  return { current: 'Order shipped', next: 'No further step', phase: 5 };
};
const customerPhaseInfo = (order) => {
  const canonical = canonicalStatus(order);
  if (canonical) {
    const cancelled = Boolean(order.cancellation);
    return {
      payment: cancelled ? ['Cancelled', order.cancellation.reason || 'This order will not be fulfilled.'] : canonical.payment === 'awaiting_payment' ? ['Awaiting payment', 'We are waiting for payment confirmation.'] : canonical.payment === 'failed' ? ['Payment failed', 'Payment could not be confirmed.'] : canonical.payment === 'refunded' ? ['Refunded', 'The payment for this order has been refunded.'] : ['Payment confirmed', 'Your payment is confirmed.'],
      preparation: cancelled ? ['Cancelled', 'This order will not be fulfilled.'] : canonical.prep === 'prepared' ? ['Order prepared', 'Your order is prepared for delivery.'] : canonical.prep === 'being_prepared' ? ['Order being prepared', 'Our team is preparing your order.'] : ['Waiting for preparation', 'Your order is waiting to be prepared.'],
      delivery: cancelled ? ['Cancelled', 'This order will not be fulfilled.'] : canonical.delivery === 'delivered' ? ['Order delivered', 'The delivery partner marked your order as delivered.'] : canonical.delivery === 'processing' ? ['With delivery partner', `${canonical.tracking.carrier || 'Carrier'} tracking: ${canonical.tracking.tracking_id || 'Pending'}`] : ['Awaiting DHL handover', 'Your order is waiting for delivery-partner handover.'],
    };
  }
  const paymentStatus = order?.payment?.status || (order?.paymentStatus === 'pending' ? 'awaiting_payment' : order?.paymentStatus);
  const preparationStatus = order?.preparation?.status || (order?.fulfillmentStatus === 'processing' ? 'being_prepared' : ['shipped', 'delivered'].includes(order?.orderStatus) ? 'prepared' : 'pending');
  const deliveryStatus = order?.delivery?.status || (order?.orderStatus === 'delivered' || order?.fulfillmentStatus === 'delivered' ? 'delivered' : order?.trackingId ? 'shipped' : order?.orderStatus === 'shipped' ? 'processing' : 'awaiting_handover');
  if (!order) return { payment: ['Awaiting payment', 'We are waiting for payment confirmation.'], preparation: ['Order being prepared', 'Our team is preparing your order.'], delivery: ['Being processed by delivery partner', 'Your package is being processed by the delivery partner.'] };
  const cancelled = order.orderStatus === 'cancelled' || paymentStatus === 'failed';
  return {
    payment: cancelled ? ['Cancelled', 'This order will not be fulfilled.'] : paymentStatus === 'awaiting_payment' ? ['Awaiting payment', 'We are waiting for payment confirmation.'] : ['Payment confirmed', 'Your payment is confirmed.'],
    preparation: cancelled ? ['Cancelled', 'This order will not be fulfilled.'] : preparationStatus === 'prepared' ? ['Order prepared', 'Your order is prepared for delivery.'] : ['Order being prepared', 'Our team is preparing your order.'],
    delivery: cancelled ? ['Cancelled', 'This order will not be fulfilled.'] : deliveryStatus === 'delivered' ? ['Order delivered', 'The delivery partner marked your order as delivered.'] : deliveryStatus === 'shipped' ? ['Order shipped', `${order.delivery?.carrier || order.trackingCarrier || 'Carrier'} tracking: ${order.delivery?.trackingId || order.trackingId}`] : ['Being processed by delivery partner', 'Your package is being processed by the delivery partner.'],
  };
};
const customerPhaseRows = (order) => {
  const canonical = canonicalStatus(order);
  if (canonical) {
    if (order.cancellation) return [{ label: 'Order', status: 'Cancelled', detail: order.cancellation.reason || 'This order will not be fulfilled.', done: false }];
    if (canonical.payment === 'failed' || canonical.payment === 'refunded') return [{ label: 'Payment', status: canonical.payment === 'failed' ? 'Payment failed' : 'Refunded', detail: canonical.payment === 'failed' ? 'Payment could not be confirmed.' : 'The payment for this order has been refunded.', done: false }];
    const rows = [
      { label: 'Payment', status: canonical.payment === 'awaiting_payment' ? 'Awaiting payment' : canonical.payment === 'confirmed' ? 'Payment confirmed' : canonical.payment, detail: canonical.payment === 'awaiting_payment' ? 'We are waiting for payment confirmation.' : 'Your payment is confirmed.', done: canonical.payment === 'confirmed' },
      { label: 'Order', status: canonical.prep === 'pending' ? 'Waiting for preparation' : canonical.prep === 'being_prepared' ? 'Order being prepared' : 'Order prepared', detail: canonical.prep === 'prepared' ? 'Your order is prepared for delivery.' : 'Our team is preparing your order.', done: canonical.prep === 'prepared' },
      { label: 'Delivery', status: canonical.delivery === 'pending' ? 'Awaiting DHL handover' : canonical.delivery === 'processing' ? 'With delivery partner' : 'Order delivered', detail: canonical.delivery === 'processing' ? `${canonical.tracking.carrier || 'Carrier'} tracking: ${canonical.tracking.tracking_id || 'Pending'}` : canonical.delivery === 'delivered' ? 'The delivery partner marked your order as delivered.' : 'Your order is waiting for delivery-partner handover.', done: canonical.delivery === 'delivered' },
    ];
    const activeIndex = rows.findIndex((row) => !row.done);
    return rows.map((row, index) => index > activeIndex ? { ...row, status: 'Pending', detail: 'Pending', current: false } : { ...row, current: index === activeIndex });
  }
  const paymentStatus = order?.payment?.status || (order?.paymentStatus === 'pending' ? 'awaiting_payment' : order?.paymentStatus);
  const preparationStatus = order?.preparation?.status || (order?.fulfillmentStatus === 'processing' ? 'being_prepared' : ['shipped', 'delivered'].includes(order?.orderStatus) ? 'prepared' : 'pending');
  const deliveryStatus = order?.delivery?.status || (order?.orderStatus === 'delivered' || order?.fulfillmentStatus === 'delivered' ? 'delivered' : order?.trackingId ? 'shipped' : order?.orderStatus === 'shipped' ? 'processing' : 'awaiting_handover');
  const cancelled = order?.orderStatus === 'cancelled' || paymentStatus === 'failed';
  if (cancelled) return [{ label: 'Order', status: 'Cancelled', detail: 'This order will not be fulfilled.', done: false }];
  const rows = [
    { label: 'Payment', status: paymentStatus === 'awaiting_payment' ? 'Awaiting payment' : 'Payment confirmed', detail: paymentStatus === 'awaiting_payment' ? 'We are waiting for payment confirmation.' : 'Your payment is confirmed.', done: ['confirmed', 'paid'].includes(paymentStatus) },
    { label: 'Order', status: preparationStatus === 'prepared' ? 'Order prepared' : 'Order being prepared', detail: preparationStatus === 'prepared' ? 'Your order is prepared for delivery.' : 'Our team is preparing your order.', done: preparationStatus === 'prepared' },
    { label: 'Delivery', status: deliveryStatus === 'delivered' ? 'Order delivered' : deliveryStatus === 'shipped' ? 'Order shipped' : 'Being processed by delivery partner', detail: deliveryStatus === 'delivered' ? 'The delivery partner marked your order as delivered.' : deliveryStatus === 'shipped' ? `${order?.delivery?.carrier || order?.trackingCarrier || 'Carrier'} tracking: ${order?.delivery?.trackingId || order?.trackingId}` : 'Your package is being processed by the delivery partner.', done: ['shipped', 'delivered'].includes(deliveryStatus) },
  ];
  const currentIndex = rows.findIndex((row) => !row.done);
  const activeIndex = currentIndex === -1 ? rows.length - 1 : currentIndex;
  return rows.map((row, index) => index > activeIndex
    ? { ...row, status: 'Pending', detail: 'Pending', current: false }
    : { ...row, current: index === activeIndex });
};

function Brand({ light = false }) {
  return (
    <Link className={`brand ${light ? 'brand--light' : ''}`} to="/" aria-label="Natural Root Healing home">
      <img className="brand__logo" src={image('brand-logo.png')} alt="Natural Root Healing" />
    </Link>
  );
}

function useCart() {
  const readGuest = () => { try { return JSON.parse(localStorage.getItem('nrh-cart')) || []; } catch { return []; } };
  const csrf = () => decodeURIComponent(document.cookie.split('; ').find((item) => item.startsWith('nrh_csrf='))?.split('=').slice(1).join('=') || '');
  const [cart, setCart] = useState(readGuest);
  const [authenticated, setAuthenticated] = useState(null);
  const [error, setError] = useState('');
  const displayItem = (item) => {
    const local = products.find((product) => product.id === item.id) || {};
    return { ...local, ...item, category: item.category || local.category, image: item.image || local.image, gallery: local.gallery || [] };
  };
  const applyRemoteCart = (payload) => {
    setCart((payload.data.cart.items || []).map(displayItem));
    localStorage.removeItem('nrh-cart');
    if (payload.data.cart.removedProductIds?.length) setError('One or more unavailable products were removed from your bag.');
  };
  const loadRemote = async () => {
    try {
      const authResponse = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
      if (!authResponse.ok) { setAuthenticated(false); setCart(readGuest()); return; }
      setAuthenticated(true);
      const guest = readGuest();
      const response = await fetch(`${API_BASE}/cart${guest.length ? '/merge' : ''}`, {
        method: guest.length ? 'POST' : 'GET',
        credentials: 'include',
        headers: guest.length ? { 'Content-Type': 'application/json', 'x-csrf-token': csrf() } : undefined,
        body: guest.length ? JSON.stringify({ items: guest.map((item) => ({ productId: item.id, quantity: item.quantity })) }) : undefined,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Unable to load your bag.');
      applyRemoteCart(payload);
      setError(payload.data.cart.ignoredProductIds?.length ? 'Some unavailable products were skipped.' : '');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load your bag.'); }
  };
  useEffect(() => { loadRemote(); const onAuthChanged = () => loadRemote(); window.addEventListener('nrh-auth-changed', onAuthChanged); return () => window.removeEventListener('nrh-auth-changed', onAuthChanged); }, []);
  useEffect(() => { if (authenticated === false) localStorage.setItem('nrh-cart', JSON.stringify(cart)); }, [cart, authenticated]);
  const mutateRemote = async (path, options) => {
    const response = await fetch(`${API_BASE}/cart${path}`, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf(), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { if (response.status === 401) { setAuthenticated(false); } throw new Error(payload.error?.message || 'Unable to update your bag.'); }
    applyRemoteCart(payload);
    return payload;
  };
  const add = (product, quantity = 1) => {
    setError('');
    if (authenticated === true) { void mutateRemote('/items', { method: 'POST', body: JSON.stringify({ productId: product.id, quantity }) }).catch((requestError) => setError(requestError.message)); return; }
    setCart((current) => { const existing = current.find((item) => item.id === product.id); return existing ? current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(99, item.quantity + quantity) } : item) : [...current, { ...product, quantity }]; });
  };
  const update = (id, quantity) => {
    setError('');
    if (authenticated === true) { void mutateRemote(`/items/${id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }).catch((requestError) => setError(requestError.message)); return; }
    setCart((current) => quantity < 1 ? current.filter((item) => item.id !== id) : current.map((item) => item.id === id ? { ...item, quantity: Math.min(99, quantity) } : item));
  };
  const remove = (id) => update(id, 0);
  const clear = () => {
    setError('');
    if (authenticated === true) { void mutateRemote('', { method: 'DELETE' }).catch((requestError) => setError(requestError.message)); return; }
    setCart([]);
  };
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const productCount = cart.length;
  const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  return { cart, add, update, remove, clear, count, productCount, subtotal, error };
}

function App() {
  const cart = useCart();
  const [catalogProducts, setCatalogProducts] = useState(products);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nrh-theme') === 'dark');
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [toast, setToast] = useState('');
  const [, refreshSiteImages] = useState(0);
  const location = useLocation();

  useEffect(() => { setDrawer(false); setSearch(false); window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('nrh-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  useEffect(() => { const syncTheme = () => setDarkMode(localStorage.getItem('nrh-theme') === 'dark'); window.addEventListener('nrh-theme-change', syncTheme); return () => window.removeEventListener('nrh-theme-change', syncTheme); }, []);
  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/catalog/products?limit=50`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (active && payload?.data?.products) setCatalogProducts(payload.data.products.map(mapCatalogProduct)); })
      .catch(() => undefined)
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/catalog/site-images`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (active && payload?.data?.images) { applySiteImageOverrides(payload.data.images); refreshSiteImages((value) => value + 1); } })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  const addToCart = (product, quantity) => { cart.add(product, quantity); setToast(`${product.name} added to your bag`); };
  const toggleTheme = () => {
    const update = () => setDarkMode((current) => !current);
    if (typeof document.startViewTransition === 'function') document.startViewTransition(update);
    else update();
  };
  const isAdminPortal = location.pathname.startsWith('/admin/');

  return (
    <CatalogContext.Provider value={{ products: catalogProducts, loading: catalogLoading }}>
    <>
      {!isAdminPortal && <Header count={cart.productCount} onCart={() => setDrawer(true)} onSearch={() => setSearch(true)} darkMode={darkMode} onToggleTheme={toggleTheme} />}
      <main className={isAdminPortal ? 'admin-portal' : undefined}>
        {isAdminPortal && <div className="admin-nav-shell"><AdminNav /></div>}
        <Routes>
          <Route path="/" element={<Home onAdd={addToCart} />} />
          <Route path="/shop" element={<Shop onAdd={addToCart} />} />
          <Route path="/shop/:productId" element={<ProductDetail onAdd={addToCart} />} />
          <Route path="/about" element={<About />} />
          <Route path="/ayurveda" element={<Ayurveda />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:articleSlug" element={<Article />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<CartPage cart={cart} onCart={() => setDrawer(true)} />} />
          <Route path="/checkout" element={<Checkout cart={cart} />} />
          <Route path="/orders/:orderId" element={<OrderDetail />} />
          <Route path="/order-confirmation" element={<Confirmation />} />
          <Route path="/account" element={<Account />} />
          <Route path="/admin/catalog" element={<AdminCatalog />} />
          <Route path="/admin/catalog/assets" element={<AdminAssets />} />
          <Route path="/admin/catalog/site-images" element={<AdminSiteImages />} />
          <Route path="/admin/contact" element={<AdminContact />} />
          <Route path="/admin/contacts" element={<AdminNewsletter />} />
          <Route path="/admin/reviews" element={<AdminReviews />} />
          <Route path="/admin/products" element={<Navigate to="/admin/catalog" replace />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/privacy" element={<Legal title="Privacy policy" />} />
          <Route path="/terms" element={<Legal title="Terms & conditions" />} />
          <Route path="/shipping" element={<Legal title="Shipping policy" />} />
          <Route path="/returns" element={<Legal title="Returns & refunds" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdminPortal && <Footer />}
      {!isAdminPortal && <CartDrawer open={drawer} close={() => setDrawer(false)} cart={cart} />}
      {!isAdminPortal && <SearchDialog open={search} close={() => setSearch(false)} />}
      {toast && <div className="toast" role="status"><Check size={17} />{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={16} /></button></div>}
    </>
    </CatalogContext.Provider>
  );
}

function Header({ count, onCart, onSearch, darkMode, onToggleTheme }) {
  const [menu, setMenu] = useState(false);
  const [profile, setProfile] = useState(null);
  const location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
  useEffect(() => {
    let active = true;
    const refreshProfile = () => fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (active) setProfile(payload?.data?.user || null); })
      .catch(() => { if (active) setProfile(null); });
    refreshProfile();
    window.addEventListener('nrh-auth-changed', refreshProfile);
    return () => { active = false; window.removeEventListener('nrh-auth-changed', refreshProfile); };
  }, []);
  const nav = [
    ['Home', '/'], ['Shop', '/shop'], ['About us', '/about'], ['Ayurveda', '/ayurveda'], ['Journal', '/blog'], ['Contact', '/contact'],
  ];
  return (
    <header className="site-header">
      <div className="announcement"><Sparkles size={13} /> A considered approach to everyday wellbeing <span>•</span> Rooted in nature</div>
      <div className="nav-shell">
        <button className="icon-button mobile-menu" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Open menu"><Menu size={22} /></button>
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map(([label, path]) => <NavLink key={path} to={path} end={path === '/'}>{label}</NavLink>)}
        </nav>
        <div className="nav-actions">
          <button className="icon-button" onClick={onSearch} aria-label="Search"><Search size={20} /></button>
          <button className="icon-button theme-toggle" onClick={onToggleTheme} aria-label={darkMode ? 'Use light mode' : 'Use dark mode'} title={darkMode ? 'Use light mode' : 'Use dark mode'}>{darkMode ? <Sun size={19} /> : <Moon size={19} />}</button>
          <div className="profile-menu">
            <Link className="icon-button account-link" to="/account" aria-label="Your account" aria-describedby={profile ? 'profile-preview' : undefined}><CircleUserRound size={20} /></Link>
            {profile && <div className="profile-preview" id="profile-preview" role="status"><span className="eyebrow">Your account</span><strong>{profile.name}</strong><small>{profile.email}</small><Link to="/account">View profile <ArrowUpRight size={13} /></Link></div>}
          </div>
          <button className="icon-button bag-button" onClick={onCart} aria-label={`Shopping bag with ${count} item${count === 1 ? '' : 's'}`}><ShoppingBag size={20} /><b>{count}</b></button>
        </div>
      </div>
      <div className={`mobile-nav ${menu ? 'mobile-nav--open' : ''}`} aria-hidden={!menu}>
        {nav.map(([label, path]) => <NavLink key={path} to={path} end={path === '/'}>{label}<ArrowUpRight /></NavLink>)}
      </div>
    </header>
  );
}

function Home({ onAdd }) {
  const products = useCatalogProducts();
  const [stripReviews, setStripReviews] = useState([]);
  useEffect(() => { fetch(`${API_BASE}/catalog/products/strip`).then((response) => response.ok ? response.json() : null).then((payload) => setStripReviews(payload?.data?.reviews || [])).catch(() => setStripReviews([])); }, []);
  return (
    <>
      <section className="hero">
        <img className="hero__image" src={image('home-hero-image.png')} alt="" />
        <div className="hero__veil"></div>
        <div className="page-container hero__content">
          <p className="eyebrow eyebrow--light">Ancient wisdom <span>•</span> Modern wellness</p>
          <h1>Rooted in nature.<br />Made for your <em>wellness.</em></h1>
          <p className="hero__intro">Discover thoughtfully crafted Ayurvedic wellness products inspired by nature and traditional wisdom.</p>
          <div className="button-row">
            <Link className="button button--cream" to="/shop">Discover <ArrowUpRight /></Link>
            <Link className="text-link text-link--light" to="/about">Explore story <ArrowRight /></Link>
          </div>
        </div>
      </section>
      <Benefits />
      <ReviewStrip reviews={stripReviews} />
      <section className="section intro-section botanical-panel">
        <div className="page-container intro-section__inner">
          <p className="eyebrow">Our philosophy</p>
          <h2>Wellness, inspired<br />by <em>nature.</em></h2>
          <p>We believe the most meaningful routines are the ones that feel easy to return to. Natural Root Healing brings together time-honoured Ayurvedic thinking and a refined, modern approach to daily care.</p>
          <Link className="text-link" to="/about">The Natural Root approach <ArrowRight /></Link>
        </div>
      </section>
      <section className="section product-section">
        <div className="page-container">
          <div className="section-heading section-heading--split">
            <div><p className="eyebrow">Shop our collection</p><h2>Rituals with deep<br /><em>roots.</em></h2></div>
            <div className="section-heading__aside"><p>Explore our selection of botanical products, made to bring a little more intention to each day.</p><Link className="text-link" to="/shop">View all products <ArrowRight /></Link></div>
          </div>
          <div className="featured-products">
            {products.slice(0, 2).map((product, index) => <ProductCard key={product.id} product={product} onAdd={onAdd} feature index={index} />)}
          </div>
        </div>
      </section>
      <section className="story-banner">
        <img src={image('philosophy-banner.png')} alt="Ayurvedic herbs in the hills" />
        <div className="story-banner__shade"></div>
        <div className="page-container story-banner__content">
          <p className="eyebrow eyebrow--light">Our philosophy</p>
          <h2>More than products.<br />A more natural way<br />of <em>living.</em></h2>
          <p>Slow down, tune in, and make space for small rituals that help you feel connected to yourself and the world around you.</p>
          <Link className="button button--cream" to="/about">Discover our story <ArrowUpRight /></Link>
        </div>
      </section>
      <JournalPreview />
      <Newsletter />
    </>
  );
}

function ReviewStrip({ reviews }) {
  if (!reviews.length) return null;
  const renderReview = (review) => <Link className="review-strip__card" key={review.id} to={`/shop/${review.productSlug}`}><div className="review-strip__meta"><strong>{review.authorName}</strong><span aria-label={`${review.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={13} fill={star <= review.rating ? 'currentColor' : 'none'} />)}</span></div><p><b>{review.productName}:</b> {review.summary}</p></Link>;
  return <section className="review-strip" aria-label="Customer reviews"><div className="page-container"><p className="eyebrow">Customer notes</p></div><div className="review-strip__viewport"><div className="review-strip__track">{[0, 1, 2, 3].map((group) => <div className="review-strip__group" aria-hidden={group > 0 || undefined} key={group}>{reviews.map((review) => renderReview({ ...review, id: `${group}-${review.id}` }))}</div>)}</div></div></section>;
}

function Benefits() {
  const benefits = [[Leaf, 'Plant-led', 'Thoughtful formulas'], [Sparkles, 'Considered', 'Everyday rituals'], [ShieldCheck, 'Made with care', 'Clarity first'], [PackageCheck, 'Consciously packed', 'For your shelf']];
  return <section className="benefits"><div className="page-container benefits__grid">{benefits.map(([Icon, title, sub]) => <div className="benefit" key={title}><Icon /><div><b>{title}</b><span>{sub}</span></div></div>)}</div></section>;
}

function ProductCard({ product, onAdd, feature, index }) {
  return <article className={`product-card ${feature ? 'product-card--featured' : ''}`}>
    <Link className="product-card__image" to={`/shop/${product.id}`}><img src={product.image} alt={product.name} loading={feature ? 'eager' : 'lazy'} /><span>{index === 0 ? 'Daily ritual' : 'Botanical blend'}</span><button aria-label={`Save ${product.name}`} onClick={(event) => event.preventDefault()}><Heart size={18} /></button></Link>
    <div className="product-card__body">
      <p>{product.category}</p><h3><Link to={`/shop/${product.id}`}>{product.name}</Link></h3><small>{product.size}</small>
      <div className="product-card__buy"><ProductPrice product={product} /><button onClick={() => onAdd(product)} aria-label={`Add ${product.name} to bag`}>Add <Plus size={16} /></button></div>
    </div>
  </article>;
}

function Shop({ onAdd }) {
  const products = useCatalogProducts();
  const [stripReviews, setStripReviews] = useState([]);
  useEffect(() => { fetch(`${API_BASE}/catalog/products/strip`).then((response) => response.ok ? response.json() : null).then((payload) => setStripReviews(payload?.data?.reviews || [])).catch(() => setStripReviews([])); }, []);
  const [filter, setFilter] = useState('All products');
  const filters = ['All products', 'Daily vitality', 'Herbal collection'];
  const shown = filter === 'All products' ? products : products.filter((product) => product.category === filter);
  return <>
    <PageHero eyebrow="Shop Natural Root" title={<>Wellness for your<br /><em>everyday rhythm.</em></>} text="A tightly considered collection of products to accompany the quiet moments of your day." imageSrc={image('shop-banner.png')} />
    <section className="section shop-page"><div className="page-container"><div className="shop-toolbar"><p><b>{shown.length}</b> thoughtfully selected products</p><div className="filter-wrap"><SlidersHorizontal size={17} /><label htmlFor="collection-filter" className="sr-only">Filter collection</label><select id="collection-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>{filters.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={16} /></div></div><div className="product-grid">{shown.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} />)}</div></div></section>
    <ReviewStrip reviews={stripReviews} />
    <section className="collection-note"><div className="page-container"><Leaf /><p>Every routine is personal. Please take a moment to read each product label and choose what feels right for you.</p></div></section>
  </>;
}

function ProductDetail({ onAdd }) {
  const { productId } = useParams(); const navigate = useNavigate(); const products = useCatalogProducts(); const product = products.find((item) => item.id === productId);
  const [activeImage, setActiveImage] = useState(0); const [quantity, setQuantity] = useState(1); const [tab, setTab] = useState('Details'); const [reviews, setReviews] = useState([]); const [reviewsLoading, setReviewsLoading] = useState(true); const [reviewUser, setReviewUser] = useState(null); const [reviewForm, setReviewForm] = useState({ rating: 0, title: '', body: '' }); const [reviewError, setReviewError] = useState(''); const [reviewMessage, setReviewMessage] = useState('');
  useEffect(() => { setActiveImage(0); setQuantity(1); }, [productId]);
  useEffect(() => { let active = true; setReviewsLoading(true); Promise.all([fetch(`${API_BASE}/catalog/products/${productId}/reviews`).then((response) => response.ok ? response.json() : null), fetch(`${API_BASE}/auth/me`, { credentials: 'include' }).then((response) => response.ok ? response.json() : null)]).then(([reviewPayload, userPayload]) => { if (!active) return; setReviews(reviewPayload?.data?.reviews || []); setReviewUser(userPayload?.data?.user || null); }).catch(() => { if (active) setReviewError('Reviews could not be loaded.'); }).finally(() => { if (active) setReviewsLoading(false); }); return () => { active = false; }; }, [productId]);
  const submitReview = async (event) => { event.preventDefault(); setReviewError(''); setReviewMessage(''); try { const response = await fetch(`${API_BASE}/catalog/products/${productId}/reviews`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf() }, body: JSON.stringify(reviewForm) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error?.message || 'Your review could not be submitted.'); setReviewForm({ rating: 0, title: '', body: '' }); setReviewMessage('Thank you. Your review was submitted for approval.'); } catch (error) { setReviewError(error instanceof Error ? error.message : 'Your review could not be submitted.'); } };
  if (!product) return <NotFound />;
  return <section className="product-detail page-container"><button className="back-link" onClick={() => navigate('/shop')}><ArrowLeft size={17} /> All products</button><div className="product-detail__grid"><div className="product-gallery"><div className="product-gallery__main"><img src={product.gallery[activeImage]} alt={product.name} /><button className="gallery-arrow gallery-arrow--prev" onClick={() => setActiveImage((activeImage - 1 + product.gallery.length) % product.gallery.length)} aria-label="Previous product image"><ChevronLeft /></button><button className="gallery-arrow gallery-arrow--next" onClick={() => setActiveImage((activeImage + 1) % product.gallery.length)} aria-label="Next product image"><ChevronRight /></button></div><div className="product-gallery__thumbs">{product.gallery.map((src, index) => <button key={src} className={index === activeImage ? 'is-active' : ''} onClick={() => setActiveImage(index)}><img src={src} alt="" /></button>)}</div></div><div className="product-detail__info"><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><p className="product-detail__size">{product.size}</p><p className="product-detail__price"><ProductPrice product={product} /></p><p className="product-detail__summary">{product.details}</p><div className="product-detail__line"></div><div className="quantity-row"><span>Quantity</span><Quantity quantity={quantity} setQuantity={setQuantity} /></div><button className="button button--green button--wide" onClick={() => onAdd(product, quantity)}>Add to bag <ArrowUpRight /></button><div className="product-reassurance"><div><Truck /><span><b>Shipping</b>Calculated at checkout</span></div><div><ShieldCheck /><span><b>Secure checkout</b>Payment setup coming soon</span></div></div><div className="accordions">{['Details', 'Ingredients & use', 'Shipping & returns'].map((title) => <div key={title} className={tab === title ? 'accordion is-open' : 'accordion'}><button onClick={() => setTab(tab === title ? '' : title)}>{title}<Plus /></button>{tab === title && <p>{title === 'Details' ? product.details : title === 'Ingredients & use' ? product.ingredients : 'Shipping and returns details will be confirmed before checkout is enabled.'}</p>}</div>)}</div></div></div><ProductReviews reviews={reviews} loading={reviewsLoading} user={reviewUser} form={reviewForm} setForm={setReviewForm} submit={submitReview} error={reviewError} message={reviewMessage} /><div className="related-products"><p className="eyebrow">You may also enjoy</p><h2>Continue your <em>ritual.</em></h2><div className="product-grid">{products.filter((item) => item.id !== product.id).slice(0, 3).map((item) => <ProductCard key={item.id} product={item} onAdd={onAdd} />)}</div></div></section>;
}

function ProductReviews({ reviews, loading, user, form, setForm, submit, error, message }) { const [reviewPage, setReviewPage] = useState(0); useEffect(() => setReviewPage(0), [reviews]); const reviewPages = Math.ceil(reviews.length / 3); const visibleReviews = reviews.slice(reviewPage * 3, reviewPage * 3 + 3); return <section className="product-reviews" aria-labelledby="product-reviews-title"><div className="product-reviews__heading"><div><p className="eyebrow">Customer notes</p><h2 id="product-reviews-title">What customers <em>say.</em></h2></div>{!loading && reviewPages > 1 && <div className="product-reviews__controls"><button type="button" className="product-reviews__arrow" onClick={() => setReviewPage((current) => current - 1)} disabled={reviewPage === 0} aria-label="Previous reviews"><ArrowLeft size={18} /></button><span>{reviewPage + 1} / {reviewPages}</span><button type="button" className="product-reviews__arrow" onClick={() => setReviewPage((current) => current + 1)} disabled={reviewPage >= reviewPages - 1} aria-label="Next reviews"><ArrowRight size={18} /></button></div>}</div>{loading ? <p className="product-reviews__empty">Loading reviews...</p> : reviews.length ? <div className="product-reviews__grid">{visibleReviews.map((review) => <article className="product-review" key={review.id}><div className="product-review__meta"><div className="product-review__rating" aria-label={`${review.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <StarIcon key={star} active={star <= review.rating} />)}</div><small>{review.authorName} · {formatOrderDate(review.createdAt)}</small></div><h3>{review.title}</h3><p>{review.body}</p></article>)}</div> : <p className="product-reviews__empty">Reviews will appear here once they have been selected by our team.</p>}<div className="product-review-form">{user ? <form onSubmit={submit}><div><p className="eyebrow">Share your experience</p><h3>Leave a review</h3></div><fieldset className="star-rating-field"><legend>Rating</legend><StarRating value={form.rating} onChange={(rating) => setForm({ ...form, rating })} /></fieldset><label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="A short summary" /></label><label>Review<textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required placeholder="Tell us about your experience" rows="4" /></label>{error && <p role="alert" className="auth-message auth-message--error">{error}</p>}{message && <p role="status" className="contact-success">{message}</p>}<button className="button button--green" type="submit" disabled={!form.rating}>Submit review <ArrowUpRight /></button></form> : <div><h3>Have you tried this product?</h3><p><Link to="/account">Sign in</Link> to leave a review. Reviews are checked by our team before appearing here.</p></div>}</div></section>; }
function StarIcon({ active }) { return <Star size={15} fill={active ? 'currentColor' : 'none'} />; }
function StarRating({ value, onChange }) { return <div className="star-rating" role="group" aria-label="Choose a rating">{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} className={star <= value ? 'is-selected' : ''} onClick={() => onChange(star)} aria-label={`${star} star${star === 1 ? '' : 's'}`} aria-pressed={star === value}><Star size={24} fill={star <= value ? 'currentColor' : 'none'} /></button>)}</div>; }

function Quantity({ quantity, setQuantity }) { return <div className="quantity"><button onClick={() => setQuantity(quantity - 1)} disabled={quantity <= 1} aria-label="Decrease quantity"><Minus size={15} /></button><b>{quantity}</b><button onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity"><Plus size={15} /></button></div>; }

function About() {
  return <><PageHero eyebrow="Our story" title={<>A life in better<br /><em>balance.</em></>} text="Natural Root Healing is a gentle invitation to bring more intention, connection, and care into your everyday." imageSrc={image('about-hero.jpg')} /><section className="section editorial"><div className="page-container editorial__grid"><div><p className="eyebrow">The Natural Root approach</p><h2>A quiet return to the <em>essential.</em></h2></div><div><p>In a world that moves quickly, we make space for a more considered pace. We look to the richness of the natural world and the enduring perspective of Ayurveda as inspiration for thoughtful, everyday rituals.</p><p>Our vision is uncomplicated: to create a beautiful, grounded place for your wellness routine to begin.</p><Link to="/shop" className="text-link">Explore the collection <ArrowRight /></Link></div></div></section><section className="image-statement"><img src={image('about-ritual.jpg')} alt="Natural Root product collection" /><div><p className="eyebrow eyebrow--light">Made for your ritual</p><h2>Beautifully simple.<br /><em>Deeply rooted.</em></h2></div></section><Values /></>;
}

function Values() { const values = [['01', 'Thoughtful by nature', 'We choose a calmer, more considered approach at every touchpoint.'], ['02', 'Designed for real life', 'Wellness should be a welcoming part of your day, never another demand.'], ['03', 'Rooted in respect', 'We honour the history and nuance of the traditions that inspire us.']]; return <section className="section values"><div className="page-container"><p className="eyebrow">Our values</p><div className="values__grid">{values.map(([number, title, text]) => <div key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></div>)}</div></div></section>; }

function Ayurveda() {
  const steps = [['Observe', 'Notice the small patterns that shape your day.'], ['Simplify', 'Choose routines that feel nourishing and sustainable.'], ['Return', 'Keep coming back to what helps you feel grounded.']];
  return <><PageHero eyebrow="A gentle guide" title={<>Ayurveda, for a<br /><em>modern life.</em></>} text="A timeless philosophy that invites us to be more attentive to the rhythms within and around us." imageSrc={image('ayurveda-hero.jpg')} /><section className="section ayurveda-intro"><div className="page-container ayurveda-intro__grid"><div className="quote-mark">“</div><div><p className="eyebrow">A way of seeing</p><h2>Start where you are.</h2><p>Ayurveda is often described as the science of life. At its heart is a simple idea: when we pay attention to our individual nature, surroundings, and seasons, we can make more caring choices for ourselves.</p><p>This space is for curiosity, not perfection. It is not a substitute for professional medical advice.</p></div></div></section><section className="section practice"><div className="page-container"><div className="section-heading"><p className="eyebrow">A daily practice</p><h2>Small rituals, lasting <em>presence.</em></h2></div><div className="practice__grid">{steps.map(([number, title, text]) => <div key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p><ArrowDownRight /></div>)}</div></div></section><JournalPreview /></>;
}

function Blog() { return <><PageHero eyebrow="The Natural Root journal" title={<>Notes for a more<br /><em>considered life.</em></>} text="Ideas, rituals, and reflections from the world of natural wellness." imageSrc={image('journal-banner.png')} /><section className="section blog-list"><div className="page-container"><div className="blog-list__bar"><p>Latest articles</p><div><button className="is-active">All</button><button>Ayurveda</button><button>Rituals</button><button>Living well</button></div></div><div className="article-grid">{articles.map((article) => <ArticleCard key={article.slug} article={article} />)}</div></div></section><Newsletter /></>;
}

function JournalPreview() { return <section className="section journal"><div className="page-container"><div className="section-heading section-heading--split"><div><p className="eyebrow">The journal</p><h2>Notes from<br /><em>the root.</em></h2></div><Link className="text-link" to="/blog">Read all articles <ArrowRight /></Link></div><div className="article-grid">{articles.map((article) => <ArticleCard key={article.slug} article={article} />)}</div></div></section>; }

function ArticleCard({ article }) { return <article className="article-card"><Link to={`/blog/${article.slug}`}><img src={article.image} alt="" /></Link><div><p>{article.type} <span>•</span> {article.date}</p><h3><Link to={`/blog/${article.slug}`}>{article.title}</Link></h3><Link className="text-link" to={`/blog/${article.slug}`}>Read article <ArrowRight /></Link></div></article>; }

function Article() { const { articleSlug } = useParams(); const article = articles.find((item) => item.slug === articleSlug); if (!article) return <NotFound />; return <article className="article"><header className="article__header"><div className="page-container"><Link className="back-link" to="/blog"><ArrowLeft size={17} /> The journal</Link><p className="eyebrow">{article.type}</p><h1>{article.title}</h1><p>{article.date} <span>•</span> 4 minute read</p></div></header><img className="article__hero" src={article.image} alt="Natural botanicals" /><div className="article__body"><p className="article__lead">Wellness has a way of asking us to notice the little things: the changing light, the cadence of our days, the small decisions that add up to how we feel.</p><p>There is no single formula for feeling at home in your routine. Instead, we can begin with attention. We can choose a slower morning, a cup of something warm, or five quiet minutes before the day starts asking for us.</p><h2>Make room for what matters</h2><p>Creating a ritual does not need to mean adding more. Sometimes it is about making space for the things already there. Keep it simple, repeat it with care, and let it evolve with you.</p><blockquote>“The most enduring rituals are the ones that leave room for real life.”</blockquote><p>Let your routine be an expression of curiosity rather than a list of rules. One small, grounded choice is enough to begin.</p><div className="article__share"><span>Share this note</span><button aria-label="Share with photo app"><Camera /></button><button aria-label="Share as a message"><MessageCircle /></button></div></div><JournalPreview /></article>; }

function Contact() { const [user, setUser] = useState(undefined); const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' }); const [sending, setSending] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState(''); useEffect(() => { fetch(`${API_BASE}/auth/me`, { credentials: 'include' }).then((response) => response.ok ? response.json() : null).then((payload) => { const nextUser = payload?.data?.user || null; setUser(nextUser); if (nextUser) setForm((current) => ({ ...current, name: nextUser.name || '', email: nextUser.email || '' })); }).catch(() => setUser(null)); }, []); const submit = async (event) => { event.preventDefault(); setSending(true); setError(''); try { const response = await fetch(`${API_BASE}/contact`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf() }, body: JSON.stringify(form) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error?.message || 'Your message could not be sent.'); setSent(true); setForm((current) => ({ ...current, topic: '', message: '' })); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Your message could not be sent.'); } finally { setSending(false); } }; return <><PageHero eyebrow="Get in touch" title={<>We'd love to<br /><em>hear from you.</em></>} text="For product, order, or general questions, our team is here to help." imageSrc={image('contact-hero.jpg')} /><section className="section contact"><div className="page-container contact__grid"><div><p className="eyebrow">Contact Natural Root</p><h2>Start a <em>conversation.</em></h2><p>Send us a note and we’ll be in touch as soon as we can.</p><div className="contact__details"><a href="mailto:hello@naturalroothealing.com">hello@naturalroothealing.com</a><span>Monday to Friday, 9am to 5pm IST</span></div></div>{user === undefined ? <div className="contact-form"><p>Checking your sign-in...</p></div> : user ? <form onSubmit={submit} className="contact-form"><label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" /></label><label>Email address<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label><label>What can we help with?<select required value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })}><option value="" disabled>Select a topic</option><option value="product_question">Product question</option><option value="order_support">Order support</option><option value="something_else">Something else</option></select></label><label>Message<textarea required value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Tell us a little more" rows="4"></textarea></label>{error && <p role="alert" className="auth-message auth-message--error">{error}</p>}<button className="button button--green" type="submit" disabled={sending}>{sent ? <>Message sent <Check /></> : <>{sending ? 'Sending...' : 'Send message'} <ArrowUpRight /></>}</button>{sent && <p role="status" className="contact-success">Your message has been sent to our team.</p>}</form> : <div className="contact-form contact-login-note"><h3>Sign in to send a message.</h3><p>Please sign in to contact Natural Root Healing. Your message will be attached to your customer account.</p><Link className="button button--green" to="/account">Go to account <ArrowUpRight /></Link></div>}</div></section></>; }

function CartPage({ cart, onCart }) { return <section className="cart-page section"><div className="page-container"><p className="eyebrow">Your selection</p><h1>Your <em>bag.</em></h1>{cart.error && <p role="status" className="auth-message auth-message--error cart-status">{cart.error}</p>}{cart.count ? <div className="cart-page__layout"><CartItems cart={cart} /><OrderSummary subtotal={cart.subtotal} /><div className="cart-page__cta"><Link className="button button--green" to="/checkout">Continue to checkout <ArrowUpRight /></Link></div></div> : <EmptyCart onCart={onCart} />}</div></section>; }

function CartItems({ cart }) { return <div className="cart-items">{cart.cart.map((item) => <div className="cart-item" key={item.id}><Link className="cart-item__image-link" to={`/shop/${item.id}`} aria-label={`View ${item.name}`}><img src={item.image} alt="" /></Link><div><h3>{item.name}</h3><button onClick={() => cart.remove(item.id)}>Remove</button></div><div><b>{formatPrice(item.price * item.quantity)}</b><Quantity quantity={item.quantity} setQuantity={(quantity) => cart.update(item.id, quantity)} /></div></div>)}</div>; }

function EmptyCart() { return <div className="empty-cart"><ShoppingBag /><h2>Your bag is waiting.</h2><p>Explore the collection and find a ritual that feels right for you.</p><Link className="button button--green" to="/shop">Explore products <ArrowUpRight /></Link></div>; }

function OrderSummary({ subtotal }) { return <aside className="order-summary"><h3>Order summary</h3><div><span>Subtotal</span><b>{formatPrice(subtotal)}</b></div><div><span>Shipping</span><b>Complimentary</b></div><p>Taxes are currently set to zero.</p><div className="order-summary__total"><span>Total</span><b>{formatPrice(subtotal)}</b></div></aside>; }

function Checkout({ cart }) { const [step, setStep] = useState(1); const [user, setUser] = useState(null); const [addresses, setAddresses] = useState([]); const [selectedAddressId, setSelectedAddressId] = useState(''); const [error, setError] = useState(''); const [placing, setPlacing] = useState(false); const [idempotencyKey] = useState(() => crypto.randomUUID()); const navigate = useNavigate(); useEffect(() => { fetch(`${API_BASE}/auth/me`, { credentials: 'include' }).then((response) => response.ok ? response.json() : null).then((payload) => setUser(payload?.data?.user || null)).catch(() => setUser(null)); }, []); useEffect(() => { fetch(`${API_BASE}/account/addresses`, { credentials: 'include' }).then(async (response) => { const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error?.message || 'Sign in to choose a delivery address.'); setAddresses(payload.data.addresses); setSelectedAddressId(payload.data.addresses.find((address) => address.isDefault)?.id || payload.data.addresses[0]?.id || ''); }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load delivery addresses.')); }, []); const placeOrder = async () => { setPlacing(true); setError(''); try { if (!selectedAddressId) throw new Error('Choose a saved delivery address before placing the order.'); const csrf = decodeURIComponent(document.cookie.split('; ').find((item) => item.startsWith('nrh_csrf='))?.split('=').slice(1).join('=') || ''); const orderResponse = await fetch(`${API_BASE}/orders`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf, 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ addressId: selectedAddressId }) }); const orderPayload = await orderResponse.json().catch(() => ({})); if (!orderResponse.ok) throw new Error(orderPayload.error?.message || 'Unable to create your order.'); const order = orderPayload.data.order; const paymentResponse = await fetch(`${API_BASE}/payments/razorpay/order`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf, 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ orderId: order.id }) }); const paymentPayload = await paymentResponse.json().catch(() => ({})); if (!paymentResponse.ok) throw new Error(paymentPayload.error?.message || 'Unable to start payment.'); const Razorpay = await loadRazorpay(); if (!Razorpay) throw new Error('Payment checkout could not be loaded.'); await new Promise((resolve, reject) => { const checkout = new Razorpay({ key: paymentPayload.data.keyId, amount: paymentPayload.data.amount, currency: paymentPayload.data.currency, name: 'Natural Root Healing', order_id: paymentPayload.data.providerOrderId, handler: async (response) => { try { const verification = await fetch(`${API_BASE}/payments/razorpay/verify`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify({ orderId: order.id, razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature }) }); const verificationPayload = await verification.json().catch(() => ({})); if (!verification.ok) throw new Error(verificationPayload.error?.message || 'Payment verification failed.'); if (verificationPayload.data.status !== 'confirmed') throw new Error('Payment is still being verified. Please refresh your order shortly.'); resolve(); } catch (verificationError) { reject(verificationError); } }, modal: { ondismiss: async () => { await fetch(`${API_BASE}/payments/razorpay/abandon`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify({ orderId: order.id }) }).catch(() => undefined); reject(new Error('Payment was not completed. Your items were returned to your cart.')); } } }); checkout.open(); }); navigate('/order-confirmation', { state: { orderNumber: order.orderNumber } }); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to complete payment.'); } finally { setPlacing(false); } }; const selectedAddress = addresses.find((address) => address.id === selectedAddressId); const next = () => step === 3 ? void placeOrder() : setStep(step + 1); return <section className="checkout section"><div className="page-container"><div className="checkout__brand"><Brand /></div><div className="checkout__steps">{['Contact', 'Delivery', 'Review'].map((item, index) => <span className={index + 1 <= step ? 'is-active' : ''} key={item}><b>{index + 1}</b>{item}</span>)}</div><div className="checkout__layout"><div className="checkout-form"><p className="eyebrow">Step {step} of 3</p><h1>{step === 1 ? 'Contact details' : step === 2 ? 'Delivery address' : 'Review your order'}</h1>{error && <p role="alert" className="auth-message auth-message--error">{error}</p>}{step === 1 && <div className="checkout-contact-summary"><p className="checkout-note">Your account details and saved address will be used for this order.</p><div className="checkout-summary-card"><div><p className="eyebrow">Account details</p><strong>{user?.name || 'Your account'}</strong><span>{user?.email || 'Signed-in account'}</span>{user?.phone && <span>{user.phone}</span>}</div><Link className="plain-button" to="/account">Edit</Link></div><div className="checkout-summary-card"><div><p className="eyebrow">Saved address</p>{selectedAddress ? <><strong>{selectedAddress.recipientName}</strong><span>{selectedAddress.phone}</span><span>{selectedAddress.addressLine1}{selectedAddress.addressLine2 ? `, ${selectedAddress.addressLine2}` : ''}</span><span>{selectedAddress.city}, {selectedAddress.region} {selectedAddress.postalCode}</span><span>{selectedAddress.country}</span></> : <span>No saved address selected.</span>}</div><button className="plain-button" type="button" onClick={() => setStep(2)}>{selectedAddress ? 'Edit' : 'Choose'}</button></div></div>}{step === 2 && <div className="form-grid"><label className="full">Saved address<select value={selectedAddressId} onChange={(event) => setSelectedAddressId(event.target.value)} required><option value="" disabled>Select an address</option>{addresses.map((address) => <option key={address.id} value={address.id}>{address.recipientName} - {address.addressLine1}, {address.city}</option>)}</select></label>{!addresses.length && <p className="checkout-note full">No saved address found. <Link to="/account">Add one in your account</Link> before checkout.</p>}</div>}{step === 3 && <div className="review-block">{cart.cart.length ? <CartItems cart={cart} /> : <p>Your bag is empty.</p>}<div className="payment-placeholder"><ShieldCheck /><div><b>Secure test payment</b><span>You will be redirected to Razorpay test checkout. Your order is confirmed only after the server verifies payment.</span></div></div></div>}<div className="checkout-form__buttons"><button className="text-link" onClick={() => step > 1 ? setStep(step - 1) : navigate('/cart')}>{step === 1 ? 'Return to bag' : 'Back'}</button><button className="button button--green" onClick={next} disabled={placing || !cart.count}>{placing ? 'Placing order...' : step === 3 ? 'Place order' : 'Continue'} <ArrowUpRight /></button></div></div><OrderSummary subtotal={cart.subtotal} /></div></div></section>; }

function OrderDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`${API_BASE}/orders/${orderId}`, { credentials: 'include' }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Unable to load this order.');
      setOrder(payload.data.order);
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load this order.'));
  }, [orderId]);
  const progress = customerOrderProgress(order);
  const phaseRows = customerPhaseRows(order);
  const trackingUrl = order?.delivery?.trackingUrl || order?.trackingUrl;
  return <section className="account section"><div className="page-container account-dashboard">{error ? <p role="alert" className="auth-message auth-message--error">{error}</p> : !order ? <p>Loading order...</p> : <><h1>Order details</h1><p className="order-number-label">Order number: <strong>{order.orderNumber}</strong></p><p className="order-placed-date">Placed on: {formatOrderDate(order.createdAt)}</p><ol className="order-phase-list" aria-label="Order phases">{phaseRows.map((phase) => <li className={phase.current ? 'is-current' : phase.done ? 'is-complete' : ''} key={phase.label}><strong>{phase.label}</strong><span>{phase.status}{phaseDate(order, phase.label) && <> · {formatOrderDate(phaseDate(order, phase.label))}</>}{phase.label === 'Delivery' && (order.delivery?.trackingId || order.trackingId) && <> · {order.delivery?.carrier || order.trackingCarrier || 'Carrier'} tracking: <b>{order.delivery?.trackingId || order.trackingId}</b>{trackingUrl && <> · <a href={trackingUrl} target="_blank" rel="noreferrer">Track shipment</a></>}</>}</span></li>)}</ol><details className="order-price-details"><summary><span className="order-detail-summary__copy"><b>Order details</b><small>Total: {formatPrice(order.totalMinor / 100)}</small></span><ChevronDown className="order-detail-summary__arrow" size={17} /></summary><div className="order-history__list">{order.items.map((item) => <div className="order-history__row" key={item.productId}><span><b>{item.name}</b><small>{item.quantity} × {formatPrice(item.unitPriceMinor / 100)}</small></span><strong>{formatPrice(item.lineTotalMinor / 100)}</strong></div>)}</div><div className="order-history__row"><b>Total</b><strong>{formatPrice(order.totalMinor / 100)}</strong></div></details><details className="order-delivery-details"><summary><span className="order-detail-summary__copy"><b>Delivery detail</b><small>{order.delivery?.status === 'delivered' || order.orderStatus === 'delivered' ? 'Delivered to' : 'To be delivered to'} {order.shippingAddress?.recipientName || 'recipient'}</small></span><ChevronDown className="order-detail-summary__arrow" size={17} /></summary><div><b>{order.shippingAddress?.recipientName}</b><p>{order.shippingAddress?.phone}<br />{order.shippingAddress?.addressLine1}{order.shippingAddress?.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}<br />{order.shippingAddress?.city}, {order.shippingAddress?.region} {order.shippingAddress?.postalCode}<br />{order.shippingAddress?.country}</p></div></details><Link className="button button--outline" to="/account">Back to account</Link></>}</div></section>;
}

function Confirmation() { const location = useLocation(); const orderNumber = location.state?.orderNumber || 'Pending payment'; return <section className="confirmation section"><div className="page-container"><div><span><Check /></span><p className="eyebrow">Order received</p><h1>Thank you for<br />your <em>order.</em></h1><p className="confirmation__copy">Your order has been created and is waiting for payment confirmation.</p><div className="confirmation__number"><small>Reference</small><b>{orderNumber}</b></div><Link className="button button--green" to="/shop">Continue exploring <ArrowUpRight /></Link></div></div></section>; }

function AccountProfile({ user, form, update, saveProfile, submitting, addresses, orders: allOrders, showAddressForm, setShowAddressForm, addressForm, addressField, saveAddress, editingAddress, setEditingAddress, setAddressForm, emptyAddress, addressAction, logout, status }) {
  const [orderPage, setOrderPage] = useState(0);
  const [paymentIssuePage, setPaymentIssuePage] = useState(0);
  const [orderHistoryTab, setOrderHistoryTab] = useState('paid');
  const orders = allOrders.filter((order) => !['awaiting_payment', 'failed'].includes(order.order_status?.payment));
  const paymentIssueOrders = allOrders.filter((order) => ['awaiting_payment', 'failed'].includes(order.order_status?.payment));
  const orderPageCount = Math.ceil(orders.length / 5);
  const paymentIssuePageCount = Math.ceil(paymentIssueOrders.length / 5);
  const currentOrderPage = Math.min(orderPage, Math.max(orderPageCount - 1, 0));
  const currentPaymentIssuePage = Math.min(paymentIssuePage, Math.max(paymentIssuePageCount - 1, 0));
  const visibleOrders = orders.slice(currentOrderPage * 5, currentOrderPage * 5 + 5);
  const addressRules = { recipientName: 'Name shown on the delivery label.', phone: 'Include a reachable contact number.', addressLine1: 'Street, house, or building details.', addressLine2: 'Apartment, floor, or landmark (optional).', city: 'Town or city for delivery.', region: 'State, province, or region.', postalCode: 'Postal or ZIP code.', country: 'Country where the parcel will be delivered.' };
  const visiblePaymentIssues = paymentIssueOrders.slice(currentPaymentIssuePage * 5, currentPaymentIssuePage * 5 + 5);
  const startAddress = (address = emptyAddress) => {
    setEditingAddress(address.id || '');
    setAddressForm(address);
    setShowAddressForm(true);
  };
  const cancelAddress = () => { setEditingAddress(''); setAddressForm(emptyAddress); setShowAddressForm(false); };
  const renderAddress = (address) => <article className={`address-card ${address.isDefault ? 'address-card--default' : ''}`} key={address.id}><div className="address-card__body"><div className="address-card__title"><b>{address.recipientName}</b>{address.isDefault && <small>Default address</small>}</div><p>{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}<br />{address.city}, {address.region} {address.postalCode}<br />{address.country}<br />{address.phone}</p></div><div className="address-card__actions"><button type="button" className="plain-button" onClick={() => startAddress(address)}>Edit</button>{!address.isDefault && <button type="button" className="plain-button" onClick={() => addressAction(`/account/addresses/${address.id}/default`, 'Default address updated.')}>Make default</button>}<button type="button" className="plain-button plain-button--danger" onClick={() => addressAction(`/account/addresses/${address.id}`, 'Address removed.')}>Remove</button></div></article>;
  return <section className="account section"><div className="page-container account-dashboard"><div className="account__member-heading"><div><p className="eyebrow">Your Natural Root</p><h1>Welcome, <em>{form.name.split(' ')[0] || 'friend'}.</em></h1><p>Keep your details and delivery preferences ready for your next ritual.</p></div><button className="plain-button" type="button" onClick={logout}>Sign out</button></div>{status.message && <p role="status" className={`auth-message auth-message--${status.type}`}>{status.message}</p>}<div className="account-dashboard__grid"><form className="login-form account-card" onSubmit={saveProfile}><div className="account-card__heading"><div><p className="eyebrow">Personal details</p><h2>Your profile</h2></div><CircleUserRound /></div><p className="account-card__intro">Keep your contact details up to date for a smoother checkout.</p><label>Full name<input value={form.name} onChange={update('name')} autoComplete="name" required /></label><label>Email address<input value={user.email} disabled autoComplete="email" /></label><label>Phone<input value={form.phone} onChange={update('phone')} autoComplete="tel" placeholder="Optional phone number" /></label><button className="button button--green" type="submit" disabled={submitting}>Save changes <Check /></button></form><section className="address-panel account-card"><div className="account-card__heading"><div><p className="eyebrow">Delivery</p><h2>Saved addresses</h2></div><span className="address-count">{addresses.length}</span></div><div className="address-panel__intro"><p>Choose where your orders should arrive. Your default address is used first at checkout.</p><button type="button" className="button button--outline" onClick={() => startAddress()}>Add address <Plus size={15} /></button></div>{addresses.length ? <div className="address-book">{addresses.map(renderAddress)}</div> : <div className="account__empty"><p>Your address book is empty.</p><p>Add an address once and checkout will be ready when you are.</p></div>}{showAddressForm && <form className="address-form" onSubmit={saveAddress}><div className="address-book__heading"><div><p className="eyebrow">{editingAddress ? 'Update saved address' : 'New saved address'}</p><h3>{editingAddress ? 'Edit address' : 'Add an address'}</h3></div><button type="button" className="plain-button" onClick={cancelAddress}>Cancel</button></div><div className="form-grid">{[['recipientName', 'Recipient name'], ['phone', 'Phone'], ['addressLine1', 'Address line 1'], ['addressLine2', 'Address line 2'], ['city', 'City'], ['region', 'State / region'], ['postalCode', 'Postal code'], ['country', 'Country']].map(([field, label]) => <label key={field} className={field.startsWith('addressLine') ? 'full' : ''}>{label}<small>{addressRules[field]}</small><input value={addressForm[field]} onChange={addressField(field)} minLength={field === 'phone' ? 3 : field === 'country' ? 2 : undefined} required={field !== 'addressLine2'} /></label>)}<label className="check-line full"><input type="checkbox" checked={addressForm.isDefault} onChange={addressField('isDefault')} /> Make this my default address</label></div><button className="button button--green" type="submit" disabled={submitting}>{editingAddress ? 'Update address' : 'Save address'} <Check /></button></form>}</section></div><section className="order-history account-card"><div className="account-card__heading"><div><h2>Order history</h2></div><span className="address-count">{orderHistoryTab === 'paid' ? orders.length : paymentIssueOrders.length}</span></div><div className="order-history-tabs" role="tablist" aria-label="Order history views"><button type="button" role="tab" aria-selected={orderHistoryTab === 'paid'} className={orderHistoryTab === 'paid' ? 'is-active' : ''} onClick={() => setOrderHistoryTab('paid')}>Paid</button><button type="button" role="tab" aria-selected={orderHistoryTab === 'unpaid'} className={orderHistoryTab === 'unpaid' ? 'is-active' : ''} onClick={() => setOrderHistoryTab('unpaid')}>Unpaid</button></div>{orderHistoryTab === 'paid' ? (orders.length ? <><div className="order-history__list">{visibleOrders.map((order) => <Link className="order-history__row" to={`/orders/${order.id}`} key={order.id}><span><b>{order.items?.map((item) => `${item.name} × ${item.quantity}`).join(', ') || 'Order items'}</b><small>{formatOrderDate(order.createdAt)}</small><small>{customerOrderProgress(order).current}</small></span><strong>{formatPrice(order.totalMinor / 100)}</strong></Link>)}</div>{orderPageCount > 1 && <div className="order-history__pager"><button className="button button--outline" type="button" onClick={() => setOrderPage(currentOrderPage - 1)} disabled={currentOrderPage === 0}><ChevronLeft size={16} /> Previous</button><span>Page {currentOrderPage + 1} of {orderPageCount}</span><button className="button button--outline" type="button" onClick={() => setOrderPage(currentOrderPage + 1)} disabled={currentOrderPage === orderPageCount - 1}>Next <ChevronRight size={16} /></button></div>}</> : null) : (paymentIssueOrders.length ? <><div className="order-history__list">{visiblePaymentIssues.map((order) => <Link className="order-history__row" to={`/orders/${order.id}`} key={order.id}><span><b>{order.items?.map((item) => `${item.name} × ${item.quantity}`).join(', ') || 'Order items'}</b><small>{formatOrderDate(order.createdAt)}</small><small>{customerOrderProgress(order).current}</small></span><strong>{formatPrice(order.totalMinor / 100)}</strong></Link>)}</div>{paymentIssuePageCount > 1 && <div className="order-history__pager"><button className="button button--outline" type="button" onClick={() => setPaymentIssuePage(currentPaymentIssuePage - 1)} disabled={currentPaymentIssuePage === 0}><ChevronLeft size={16} /> Previous</button><span>Page {currentPaymentIssuePage + 1} of {paymentIssuePageCount}</span><button className="button button--outline" type="button" onClick={() => setPaymentIssuePage(currentPaymentIssuePage + 1)} disabled={currentPaymentIssuePage === paymentIssuePageCount - 1}>Next <ChevronRight size={16} /></button></div>}</> : null)}</section></div></section>;
}

function Account() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editingAddress, setEditingAddress] = useState('');
  const [showAddresses, setShowAddresses] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const emptyAddress = { recipientName: '', phone: '', addressLine1: '', addressLine2: '', city: '', region: '', postalCode: '', country: '', isDefault: false };
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const setAddressDraft = (address) => setAddressForm(addressDraft(address));

  const isRegistering = mode === 'register';
  const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || 'Unable to complete that request.');
    return payload;
  };
  const csrf = () => decodeURIComponent(document.cookie.split('; ').find((item) => item.startsWith('nrh_csrf='))?.split('=').slice(1).join('=') || '');
  const mutate = (path, options = {}) => request(path, { ...options, headers: { ...(options.headers || {}), 'x-csrf-token': csrf() } });
  const loadAccount = async () => {
    const [profileResult, savedResult, ordersResult] = await Promise.allSettled([
      request('/auth/me'),
      request('/account/addresses'),
      request('/orders'),
    ]);
    if (profileResult.status === 'rejected') {
      setUser(null);
      setAccountLoading(false);
      return;
    }
    const profile = profileResult.value;
    setUser(profile.data.user);
    setForm((current) => ({ ...current, name: profile.data.user.name, phone: profile.data.user.phone || '' }));
    if (savedResult.status === 'fulfilled') setAddresses(orderAddresses(savedResult.value.data.addresses));
    if (ordersResult.status === 'fulfilled') setOrders(ordersResult.value.data.orders);
    else setStatus({ type: 'error', message: 'Your profile loaded, but order history is temporarily unavailable.' });
    setAccountLoading(false);
  };
  useEffect(() => { loadAccount(); }, []);
  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setStatus({ type: '', message: '' });
  };
  const toggleMode = () => {
    setMode(isRegistering ? 'login' : 'register');
    setStatus({ type: '', message: '' });
  };
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: '', message: '' });
    try {
      const response = await fetch(`${API_BASE}/auth/${isRegistering ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(isRegistering
            ? { ...form, ...(form.phone.trim() ? {} : { phone: undefined }) }
          : { email: form.email, password: form.password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error?.message || 'Unable to complete that request.');
      }
      setStatus({
        type: 'success',
        message: isRegistering ? 'Your account has been created.' : `Welcome back, ${payload.data.user.name}.`,
      });
      if (!isRegistering) {
        window.dispatchEvent(new Event('nrh-auth-changed'));
        navigate('/');
        return;
      }
      setUser(payload.data.user);
      setForm((current) => ({ ...current, name: payload.data.user.name, phone: payload.data.user.phone || '' }));
      window.dispatchEvent(new Event('nrh-auth-changed'));
      const saved = await request('/account/addresses');
      setAddresses(orderAddresses(saved.data.addresses));
      setOrders([]);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to complete that request.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault(); setSubmitting(true);
    try { const result = await mutate('/account/profile', { method: 'PATCH', body: JSON.stringify({ name: form.name, phone: form.phone || null }) }); setUser(result.data.user); setStatus({ type: 'success', message: 'Profile saved.' }); }
    catch (error) { setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Unable to save profile.' }); }
    finally { setSubmitting(false); }
  };
  const saveAddress = async (event) => {
    event.preventDefault(); setSubmitting(true);
    try {
      const path = editingAddress ? `/account/addresses/${editingAddress}` : '/account/addresses';
      await mutate(path, { method: editingAddress ? 'PATCH' : 'POST', body: JSON.stringify(addressForm) });
      await loadAccount();
      setAddressForm(emptyAddress); setEditingAddress(''); setShowAddresses(true); setShowAddressForm(false); setStatus({ type: 'success', message: 'Address saved.' });
    } catch (error) { setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Unable to save address.' }); }
    finally { setSubmitting(false); }
  };
  const addressField = (field) => (event) => setAddressForm((current) => ({ ...current, [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const addressAction = async (path, message) => {
    try { await mutate(path, { method: path.endsWith('/default') ? 'POST' : 'DELETE' }); await loadAccount(); setStatus({ type: 'success', message }); }
    catch (error) { setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Unable to update address.' }); }
  };
  const logout = async () => { try { await mutate('/auth/logout', { method: 'POST' }); window.dispatchEvent(new Event('nrh-auth-changed')); setUser(null); setAddresses([]); setOrders([]); setStatus({ type: 'success', message: 'You have been signed out.' }); } catch (error) { setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Unable to sign out.' }); } };

  if (user) return <AccountProfile user={user} form={form} update={update} saveProfile={saveProfile} submitting={submitting} addresses={addresses} orders={orders} showAddressForm={showAddressForm} setShowAddressForm={setShowAddressForm} addressForm={addressForm} addressField={addressField} saveAddress={saveAddress} editingAddress={editingAddress} setEditingAddress={setEditingAddress} setAddressForm={setAddressDraft} emptyAddress={emptyAddress} addressAction={addressAction} logout={logout} status={status} />;

  if (user) {
    const addressPreview = addresses[0];
    const openAddressForm = () => {
      setShowAddresses(true);
      setShowAddressForm(true);
    };
    return <section className="account section"><div className="page-container account__member"><div className="account__member-heading"><div><p className="eyebrow">Your Natural Root</p><h1>Your <em>profile.</em></h1><p>Keep your details and delivery addresses ready for your next ritual.</p></div><button className="plain-button" type="button" onClick={logout}>Sign out</button></div>{status.message && <p role="status" className={`auth-message auth-message--${status.type}`}>{status.message}</p>}<div className="account__profile-layout"><form className="login-form" onSubmit={saveProfile}><h2>Profile details</h2><label>Full name<input value={form.name} onChange={update('name')} required /></label><label>Email address<input value={user.email} disabled /></label><label>Phone<input value={form.phone} onChange={update('phone')} /></label><button className="button button--green" type="submit" disabled={submitting}>Save profile <Check /></button></form><div className="address-panel"><div className="address-panel__heading"><h2>Delivery address</h2>{addressPreview && <span>1</span>}</div>{addressPreview ? <><article className="address-card"><div><b>{addressPreview.recipientName}</b>{addressPreview.isDefault && <small>Default</small>}<p>{addressPreview.addressLine1}{addressPreview.addressLine2 ? `, ${addressPreview.addressLine2}` : ''}<br />{addressPreview.city}, {addressPreview.region} {addressPreview.postalCode}<br />{addressPreview.country}<br />{addressPreview.phone}</p></div><button type="button" className="plain-button" onClick={() => { setEditingAddress(addressPreview.id); setAddressForm(addressPreview); setShowAddresses(true); setShowAddressForm(true); }}>Edit</button></article><button type="button" className="plain-button" onClick={() => setShowAddresses((current) => !current)}>{showAddresses ? 'Hide saved addresses' : 'View or add address'}</button></> : <div className="account__empty"><p>No address saved.</p><button type="button" className="plain-button" onClick={openAddressForm}>View or add address</button></div>}{showAddresses && <><div className="address-panel__heading address-panel__heading--expanded"><h2>Saved addresses</h2><span>{addresses.length}</span></div>{addresses.slice(1).map((address) => <article className="address-card" key={address.id}><div><b>{address.recipientName}</b>{address.isDefault && <small>Default</small>}<p>{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}<br />{address.city}, {address.region} {address.postalCode}<br />{address.country}<br />{address.phone}</p></div><div className="address-card__actions"><button type="button" className="plain-button" onClick={() => { setEditingAddress(address.id); setAddressForm(address); setShowAddressForm(true); }}>Edit</button>{!address.isDefault && <button type="button" className="plain-button" onClick={() => addressAction(`/account/addresses/${address.id}/default`, 'Default address updated.')}>Make default</button>}<button type="button" className="plain-button" onClick={() => addressAction(`/account/addresses/${address.id}`, 'Address removed.')}>Remove</button></div></article>)}<button type="button" className="plain-button address-add-button" onClick={openAddressForm}>Add another address</button>{showAddressForm && <form className="address-form" onSubmit={saveAddress}><h3>{editingAddress ? 'Edit address' : 'Add an address'}</h3><div className="form-grid">{[['recipientName', 'Recipient name'], ['phone', 'Phone'], ['addressLine1', 'Address line 1'], ['addressLine2', 'Address line 2'], ['city', 'City'], ['region', 'State / region'], ['postalCode', 'Postal code'], ['country', 'Country']].map(([field, label]) => <label key={field} className={field.startsWith('addressLine') ? 'full' : ''}>{label}<input value={addressForm[field]} onChange={addressField(field)} required={field !== 'addressLine2'} /></label>)}<label className="check-line full"><input type="checkbox" checked={addressForm.isDefault} onChange={addressField('isDefault')} /> Make this my default address</label></div><button className="button button--green" type="submit" disabled={submitting}>{editingAddress ? 'Update address' : 'Save address'} <ArrowUpRight /></button>{editingAddress && <button type="button" className="plain-button" onClick={() => { setEditingAddress(''); setAddressForm(emptyAddress); setShowAddressForm(false); }}>Cancel</button>}</form>}</>}</div></div></div></section>;
  }
  if (accountLoading) return <section className="account section account--loading" aria-busy="true"><div className="page-container"><p className="eyebrow">Your Natural Root</p><p>Loading your account...</p></div></section>;

  return <section className="account section"><div className="page-container account__grid"><div><p className="eyebrow">Your Natural Root</p><h1>{isRegistering ? <>Begin your <em>ritual.</em></> : <>Welcome <em>back.</em></>}</h1><p>{isRegistering ? 'Create an account to keep your details and rituals together.' : 'Sign in to view your orders and save your favourite rituals.'}</p></div><form className="login-form" onSubmit={submit}><h2>{isRegistering ? 'Create an account' : 'Sign in'}</h2>{isRegistering && <label>Full name<input value={form.name} onChange={update('name')} autoComplete="name" placeholder="Your full name" required /></label>}<label>Email address<input value={form.email} onChange={update('email')} autoComplete="email" type="email" placeholder="you@example.com" required /></label><label>Password<input value={form.password} onChange={update('password')} autoComplete={isRegistering ? 'new-password' : 'current-password'} type="password" placeholder={isRegistering ? 'At least 12 characters' : '••••••••'} minLength={isRegistering ? 12 : 1} required /></label>{!isRegistering && <div><label className="check-line"><input type="checkbox" /> Remember me</label><button type="button" className="plain-button" onClick={() => setStatus({ type: 'error', message: 'Password recovery is not available yet.' })}>Forgot password?</button></div>}{status.message && <p role="status" className={`auth-message auth-message--${status.type}`}>{status.message}</p>}<button className="button button--green" type="submit" disabled={submitting}>{submitting ? 'Please wait...' : isRegistering ? 'Create account' : 'Sign in'} <ArrowUpRight /></button><p>{isRegistering ? 'Already have an account?' : 'New here?'} <button type="button" className="plain-button" onClick={toggleMode}>{isRegistering ? 'Sign in' : 'Create an account'}</button></p></form></div></section>;
}

function Legal({ title }) { return <section className="legal section"><div className="page-container"><p className="eyebrow">Natural Root Healing</p><h1>{title}</h1><p className="legal__updated">Last updated: October 24, 2026</p><div className="legal__content"><h2>Our commitment to clarity</h2><p>This design preview contains placeholder policy copy. Before launch, this page should be updated with approved business, legal, fulfillment, and customer-service details.</p><h2>Information for customers</h2><p>We believe important information should be easy to find and easy to understand. Details about orders, privacy, terms, delivery, and returns will be presented here once the store’s operating policies are finalised.</p><h2>Need a hand?</h2><p>Please contact our team if you have a question about this website experience.</p></div></div></section>; }

function PageHero({ eyebrow, title, text, imageSrc }) { return <section className="page-hero"><img src={imageSrc} alt="" /><div className="page-hero__overlay"></div>{eyebrow && <div className="page-container page-hero__content"><p className="eyebrow eyebrow--light">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>}</section>; }

function Newsletter() { const [submitted, setSubmitted] = useState(false); const [error, setError] = useState(''); const submit = async (event) => { event.preventDefault(); setError(''); try { const email = event.currentTarget.elements.email.value; const response = await fetch(`${API_BASE}/newsletter`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error?.message || 'Unable to join the list.'); setSubmitted(true); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to join the list.'); } }; return <section className="newsletter"><div className="page-container newsletter__inner"><div><p className="eyebrow eyebrow--light">A little note from us</p><h2>Stay close to<br /><em>the root.</em></h2></div><div><p>Thoughtful notes, new rituals, and occasional invitations delivered quietly to your inbox.</p><form onSubmit={submit}><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" name="email" type="email" placeholder="Your email address" required /><button aria-label="Subscribe" type="submit">{submitted ? <Check /> : <ArrowUpRight />}</button></form>{submitted && <small>Thank you - you’re on the list.</small>}{error && <small role="alert">{error}</small>}</div></div></section>; }

function Footer() { return <footer className="footer"><div className="page-container"><div className="footer__top"><Brand light /><div className="footer__links"><div><b>Explore</b><Link to="/shop">Shop</Link><Link to="/about">Our story</Link><Link to="/ayurveda">Ayurveda</Link><Link to="/blog">Journal</Link></div><div><b>Help</b><Link to="/contact">Contact</Link><Link to="/shipping">Shipping</Link><Link to="/returns">Returns</Link><Link to="/account">Account</Link></div><div className="footer__social"><b>Follow along</b><div><a href="#instagram" aria-label="Photo updates"><Camera /></a><a href="#messages" aria-label="Messages"><MessageCircle /></a></div></div></div></div><div className="footer__bottom"><span>© 2026 Natural Root Healing</span><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div><span>Rooted in nature</span></div></div></footer>; }

function CartDrawer({ open, close, cart }) { return <div className={`drawer-layer ${open ? 'is-open' : ''}`} aria-hidden={!open}><button className="drawer-layer__scrim" onClick={close} aria-label="Close shopping bag"></button><aside className="cart-drawer" aria-label="Shopping bag"><header><h2>Your bag <small>({cart.count})</small></h2><button className="icon-button" onClick={close} aria-label="Close shopping bag"><X /></button></header>{cart.error && <p role="status" className="auth-message auth-message--error cart-status">{cart.error}</p>}{cart.count ? <><CartItems cart={cart} /><div className="cart-drawer__bottom"><OrderSummary subtotal={cart.subtotal} /><Link className="button button--green button--wide" to="/checkout" onClick={close}>Checkout <ArrowUpRight /></Link><Link className="text-link center-link" to="/cart" onClick={close}>View bag</Link></div></> : <EmptyCart />}</aside></div>; }

function SearchDialog({ open, close }) { const navigate = useNavigate(); const products = useCatalogProducts(); const [term, setTerm] = useState(''); const filtered = useMemo(() => products.filter((product) => product.name.toLowerCase().includes(term.toLowerCase())), [products, term]); useEffect(() => { if (!open) setTerm(''); }, [open]); if (!open) return null; return <div className="search-dialog" role="dialog" aria-modal="true" aria-label="Search products"><button className="search-dialog__scrim" onClick={close} aria-label="Close search"></button><div className="search-dialog__panel"><div><Search /><input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search the collection" /><button onClick={close} className="icon-button"><X /></button></div>{term && <ul>{filtered.length ? filtered.map((product) => <li key={product.id}><button onClick={() => { navigate(`/shop/${product.id}`); close(); }}><img src={product.image} alt="" /><span><b>{product.name}</b><small>{product.category} · {formatPrice(product.price)}</small></span><ArrowUpRight /></button></li>) : <li className="search-empty">No products found. Try another word.</li>}</ul>} {!term && <p>Try “Testo” or “Dr. Sebi”</p>}</div></div>; }

function NotFound() { return <section className="not-found section"><div className="page-container"><p className="eyebrow">404</p><h1>This path needs<br />a new <em>root.</em></h1><p>We couldn’t find the page you were looking for.</p><Link className="button button--green" to="/">Return home <ArrowUpRight /></Link></div></section>; }

export default App;
