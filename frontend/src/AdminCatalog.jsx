import { useEffect, useState } from 'react';
import { apiFetch } from './api';

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:4000`}/api/v1`;
const fetch = apiFetch;
const csrf = () => decodeURIComponent(document.cookie.split('; ').find((item) => item.startsWith('nrh_csrf='))?.split('=').slice(1).join('=') || '');
const slugifyName = (value) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'product';
const blankProduct = { name: '', slug: '', description: '', details: '', ingredients: '', size: '', categoryId: '', imagesText: '', currency: 'USD', listPriceMinor: 100, discount: 0, status: 'draft' };
const blankCategory = { name: '', slug: '', description: '', sortOrder: 0, status: 'active' };
const readableError = (error, fallback) => { const message = error instanceof Error ? error.message : ''; if (!message || /unexpected|internal server/i.test(message)) return fallback; if (/slug/i.test(message) && /duplicate|exists|unique/i.test(message)) return 'This slug is already in use. Choose a different product slug.'; if (/category/i.test(message)) return 'Select a valid active category before saving the product.'; if (/image|reference/i.test(message)) return 'Use a safe local image reference and include alternative text after the | character.'; if (/price|discount/i.test(message)) return 'Check that the price is not negative and the discount is between 0 and 100%.'; if (/inventory|stock/i.test(message)) return 'Check the stock change and provide a clear reason.'; return message; };

export default function AdminCatalog() {
  const [admin, setAdmin] = useState(null);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [editing, setEditing] = useState(null);
  const [slugEditable, setSlugEditable] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(blankProduct);
  const [categoryForm, setCategoryForm] = useState(blankCategory);
  const [stock, setStock] = useState({ delta: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { if (!error && !message) return undefined; const timer = window.setTimeout(() => { setError(''); setMessage(''); }, 5000); return () => window.clearTimeout(timer); }, [error, message]);

  const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...(options.method && options.method !== 'GET' ? { 'x-csrf-token': csrf() } : {}), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || 'Request failed');
    return payload;
  };

  const load = async (nextPage = page) => {
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams({ page: String(nextPage), limit: '10', ...(filters.search ? { search: filters.search } : {}), ...(filters.status ? { status: filters.status } : {}) });
      const [productPayload, categoryPayload] = await Promise.all([request(`/admin/catalog/products?${query}`), request('/admin/catalog/categories')]);
      setProducts(productPayload.data.products); setPagination(productPayload.data.pagination); setCategories(categoryPayload.data.categories); setPage(nextPage);
    } catch (requestError) { setError(readableError(requestError, 'The catalog could not be loaded. Please try again.')); } finally { setLoading(false); }
  };

  useEffect(() => {
    request('/admin/auth/me').then((payload) => { setAdmin(payload.data.user); return load(1); }).catch(() => { setAdmin(false); setLoading(false); });
  }, []);

  const submitLogin = async (event) => {
    event.preventDefault(); setError(''); setLoading(true);
    try { const payload = await request('/admin/auth/login', { method: 'POST', body: JSON.stringify(login) }); setAdmin(payload.data.user); window.dispatchEvent(new Event('admin-session-changed')); await load(1); }
    catch (requestError) { setError(readableError(requestError, 'Sign-in failed. Check the admin credentials and try again.')); setLoading(false); }
  };

  const beginEdit = (product) => {
    setEditing(product.id); setSlugEditable(false); setForm({ ...product, categoryId: product.category?.id || '', discount: product.discount?.value || 0, imagesText: (product.images || []).map((image) => `${image.reference}|${image.altText}`).join('\n') }); setStock({ delta: '', reason: '' }); setMessage(''); setError(''); setEditorOpen(true);
  };

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value, ...(field === 'name' && !slugEditable ? { slug: slugifyName(event.target.value) } : {}) }));
  const toggleSlugEditing = () => { if (slugEditable) setForm((current) => ({ ...current, slug: slugifyName(current.name) })); setSlugEditable((current) => !current); };

  const saveProduct = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const listPriceMinor = Number(form.listPriceMinor);
      if (!Number.isInteger(listPriceMinor) || listPriceMinor < 100) throw new Error('USD products must be at least $1.00 (100 cents) for Razorpay checkout.');
      const discount = Number(form.discount);
      if (Math.round(listPriceMinor * (100 - discount) / 100) < 100) throw new Error('The final price after discount must be at least $1.00 for Razorpay checkout.');
      const body = { name: form.name, slug: form.slug, description: form.description, details: form.details, ingredients: form.ingredients, size: form.size, categoryId: form.categoryId, currency: 'USD', listPriceMinor, discount: { type: 'percentage', value: discount }, status: form.status, images: form.imagesText.split('\n').filter(Boolean).map((line) => { const [reference, ...alt] = line.split('|'); return { reference: reference.trim(), altText: (alt.join('|').trim() || form.name).slice(0, 240) }; }) };
      const path = editing ? `/admin/catalog/products/${editing}` : '/admin/catalog/products';
      await request(path, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) }); setMessage('Product saved.'); await load(page); setForm(blankProduct); setEditing(null); setSlugEditable(false); setEditorOpen(false);
    } catch (requestError) { setError(readableError(requestError, 'The product could not be saved. Check the fields and try again.')); } finally { setSaving(false); }
  };

  const adjustStock = async () => {
    if (!editing) return; setSaving(true); setError('');
    try { await request(`/admin/catalog/inventory/${editing}/adjust`, { method: 'PATCH', body: JSON.stringify({ delta: Number(stock.delta), reason: stock.reason }) }); setStock({ delta: '', reason: '' }); setMessage('Inventory adjusted.'); await load(page); }
    catch (requestError) { setError(readableError(requestError, 'Inventory could not be adjusted. Check the quantity and reason.')); } finally { setSaving(false); }
  };
  const archiveProduct = async () => {
    if (!editing || !window.confirm('Archive this product? It will be removed from the active storefront but historical orders will be preserved.')) return;
    setSaving(true); setError('');
    try { await request(`/admin/catalog/products/${editing}`, { method: 'PATCH', body: JSON.stringify({ status: 'archived' }) }); setMessage('Product archived.'); setEditorOpen(false); setEditing(null); await load(page); }
    catch (requestError) { setError(readableError(requestError, 'The product could not be archived.')); } finally { setSaving(false); }
  };

  const saveCategory = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await request('/admin/catalog/categories', { method: 'POST', body: JSON.stringify({ ...categoryForm, sortOrder: Number(categoryForm.sortOrder) }) }); setCategoryForm(blankCategory); setMessage('Category created.'); await load(page); }
    catch (requestError) { setError(readableError(requestError, 'The category could not be saved. Check the name and slug.')); } finally { setSaving(false); }
  };

  if (admin === false) return <section className="admin-login-screen"><div className="admin-login-console"><p className="eyebrow">Admin console</p><h1>Welcome <em>back.</em></h1><p>Sign in to manage products and orders.</p><form className="login-form admin-login" onSubmit={submitLogin}><label>Email<input type="email" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} required /></label><label>Password<input type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} required /></label>{error && <p role="alert" className="auth-message auth-message--error">{error}</p>}<button className="button button--green" disabled={loading}>{loading ? 'Signing in...' : 'Sign in to console'}</button></form></div></section>;
  if (!admin) return <section className="account section"><div className="page-container admin-panel"><p>Loading admin access...</p></div></section>;

  return <section className="account section"><div className="page-container admin-panel"><div className="account__member-heading"><div><p className="eyebrow">Admin catalog</p><h1>Manage your <em>collection.</em></h1></div><button className="plain-button" onClick={async () => { await request('/admin/auth/logout', { method: 'POST' }); setAdmin(false); }}>Sign out</button></div>{message && <p role="status" className="auth-message auth-message--success">{message}</p>}{error && <p role="alert" className="auth-message auth-message--error">{error}</p>}<div className="admin-toolbar"><input placeholder="Search products" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select><button className="button button--outline" onClick={() => load(1)}>Search</button><button className="button button--green" onClick={() => { setEditing(null); setSlugEditable(false); setForm(blankProduct); setStock({ delta: '', reason: '' }); setError(''); setEditorOpen(true); }}>Create new product</button></div><section className="account-card admin-products-list"><div className="account-card__heading"><div><p className="eyebrow">Products</p><h2>{loading ? 'Loading...' : `${pagination.total || 0} products`}</h2></div></div>{!loading && !products.length && <p className="account-card__intro">No products match these filters.</p>}{products.map((product) => <article className="admin-product-row" key={product.id}><div><b>{product.name}</b><small>{product.status} · {product.category?.name || 'No category'} · ${(product.finalPriceMinor / 100).toFixed(2)}</small><small>Stock: {product.inventory?.available ?? 0}{product.inventory?.lowStock ? ' · Low stock' : ''}</small></div><button className="plain-button" onClick={() => beginEdit(product)}>Edit</button></article>)}{pagination.pages > 1 && <div className="order-history__pager"><button className="button button--outline" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button><span>Page {page} of {pagination.pages}</span><button className="button button--outline" disabled={page >= pagination.pages} onClick={() => load(page + 1)}>Next</button></div>}</section><form className="admin-category-form admin-category-panel" onSubmit={saveCategory}><div><p className="eyebrow">Catalog tools</p><h2>Categories</h2></div><label>Category name<input placeholder="Category name" value={categoryForm.name} onChange={(event) => { const name = event.target.value; setCategoryForm({ ...categoryForm, name, slug: slugifyName(name) }); }} required /></label><label>Category slug<input placeholder="category-slug" value={categoryForm.slug} readOnly aria-readonly="true" /></label><button className="button button--outline" disabled={saving}>Add category</button></form>{editorOpen && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditorOpen(false); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="product-editor-title"><header className="admin-modal__header"><div><p className="eyebrow">{editing ? 'Edit product' : 'New product'}</p><h2 id="product-editor-title">{editing ? 'Update details' : 'Create product'}</h2></div><button type="button" className="plain-button" onClick={() => !saving && setEditorOpen(false)} aria-label="Close product editor">Close</button></header><form className="admin-form" onSubmit={saveProduct}>{[['name', 'Name'], ['slug', 'Slug'], ['size', 'Size'], ['listPriceMinor', 'List price (cents)'], ['discount', 'Discount %']].map(([field, label]) => field === 'slug' ? <label key={field}>{label}<div className="admin-slug-control"><input value={form[field]} onChange={updateField(field)} readOnly={!slugEditable} required /><button type="button" className="button button--outline" onClick={toggleSlugEditing}>{slugEditable ? 'Use generated slug' : 'Edit anyway'}</button></div></label> : <label key={field}>{label}<input value={form[field]} onChange={updateField(field)} type={['listPriceMinor', 'discount'].includes(field) ? 'number' : 'text'} required /></label>)}<label>Category<select value={form.categoryId} onChange={updateField('categoryId')} required><option value="">Select category</option>{categories.filter((category) => category.status === 'active').map((category) => <option value={category._id} key={category._id}>{category.name}</option>)}</select></label><label>Status<select value={form.status} onChange={updateField('status')}><option>draft</option><option>active</option><option>archived</option></select></label><label>Image references<textarea value={form.imagesText} onChange={updateField('imagesText')} placeholder="/assets/product.jpg|Alt text" required /></label><label>Description<textarea value={form.description} onChange={updateField('description')} required /></label><label>Details<textarea value={form.details} onChange={updateField('details')} required /></label><label>Ingredients<textarea value={form.ingredients} onChange={updateField('ingredients')} required /></label><div className="button-row"><button className="button button--green" disabled={saving}>{saving ? 'Saving...' : 'Save product'}</button><button type="button" className="button button--outline" disabled={saving} onClick={() => setEditorOpen(false)}>Cancel</button></div></form>{editing && <div className="admin-stock"><p className="eyebrow">Inventory adjustment</p><input type="number" placeholder="Change in units" value={stock.delta} onChange={(event) => setStock({ ...stock, delta: event.target.value })} /><input placeholder="Reason" value={stock.reason} onChange={(event) => setStock({ ...stock, reason: event.target.value })} /><button type="button" className="button button--outline" disabled={saving || !stock.delta || !stock.reason} onClick={adjustStock}>Adjust stock</button></div>}{editing && <button type="button" className="plain-button plain-button--danger admin-product-archive" disabled={saving} onClick={archiveProduct}>Archive product</button>}</section></div>}</div></section>;
}
