import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight,
  Camera, CircleUserRound, Heart, Leaf, Menu, MessageCircle, Minus, PackageCheck, Plus,
  Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Truck, X,
} from 'lucide-react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

const ASSET = `${import.meta.env.BASE_URL}assets/`;
const image = (name) => `${ASSET}${name}`;

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

const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(price);
const ProductPrice = ({ product }) => <span className="product-price"><b>{formatPrice(product.price)}</b><del>{formatPrice(product.originalPrice)}</del><small>{product.discount}% off</small></span>;

function Brand({ light = false }) {
  return (
    <Link className={`brand ${light ? 'brand--light' : ''}`} to="/" aria-label="Natural Root Healing home">
      <img className="brand__logo" src={image('brand-logo.png')} alt="Natural Root Healing" />
    </Link>
  );
}

function useCart() {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nrh-cart')) || []; } catch { return []; }
  });
  useEffect(() => localStorage.setItem('nrh-cart', JSON.stringify(cart)), [cart]);
  const add = (product, quantity = 1) => setCart((current) => {
    const existing = current.find((item) => item.id === product.id);
    return existing
      ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)
      : [...current, { ...product, quantity }];
  });
  const update = (id, quantity) => setCart((current) => quantity < 1 ? current.filter((item) => item.id !== id) : current.map((item) => item.id === id ? { ...item, quantity } : item));
  const remove = (id) => setCart((current) => current.filter((item) => item.id !== id));
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  return { cart, add, update, remove, count, subtotal };
}

function App() {
  const cart = useCart();
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [toast, setToast] = useState('');
  const location = useLocation();

  useEffect(() => { setDrawer(false); setSearch(false); window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const addToCart = (product, quantity) => { cart.add(product, quantity); setToast(`${product.name} added to your bag`); };

  return (
    <>
      <Header count={cart.count} onCart={() => setDrawer(true)} onSearch={() => setSearch(true)} />
      <main>
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
          <Route path="/order-confirmation" element={<Confirmation />} />
          <Route path="/account" element={<Account />} />
          <Route path="/privacy" element={<Legal title="Privacy policy" />} />
          <Route path="/terms" element={<Legal title="Terms & conditions" />} />
          <Route path="/shipping" element={<Legal title="Shipping policy" />} />
          <Route path="/returns" element={<Legal title="Returns & refunds" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer open={drawer} close={() => setDrawer(false)} cart={cart} />
      <SearchDialog open={search} close={() => setSearch(false)} />
      {toast && <div className="toast" role="status"><Check size={17} />{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={16} /></button></div>}
    </>
  );
}

function Header({ count, onCart, onSearch }) {
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
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
          <Link className="icon-button account-link" to="/account" aria-label="Your account"><CircleUserRound size={20} /></Link>
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
  const [filter, setFilter] = useState('All products');
  const filters = ['All products', 'Daily vitality', 'Herbal collection'];
  const shown = filter === 'All products' ? products : products.filter((product) => product.category === filter);
  return <>
    <PageHero eyebrow="Shop Natural Root" title={<>Wellness for your<br /><em>everyday rhythm.</em></>} text="A tightly considered collection of products to accompany the quiet moments of your day." imageSrc={image('shop-banner.png')} />
    <section className="section shop-page"><div className="page-container"><div className="shop-toolbar"><p><b>{shown.length}</b> thoughtfully selected products</p><div className="filter-wrap"><SlidersHorizontal size={17} /><label htmlFor="collection-filter" className="sr-only">Filter collection</label><select id="collection-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>{filters.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={16} /></div></div><div className="product-grid">{shown.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} />)}</div></div></section>
    <section className="collection-note"><div className="page-container"><Leaf /><p>Every routine is personal. Please take a moment to read each product label and choose what feels right for you.</p></div></section>
  </>;
}

function ProductDetail({ onAdd }) {
  const { productId } = useParams(); const navigate = useNavigate();
  const product = products.find((item) => item.id === productId);
  const [activeImage, setActiveImage] = useState(0); const [quantity, setQuantity] = useState(1); const [tab, setTab] = useState('Details');
  useEffect(() => { setActiveImage(0); setQuantity(1); }, [productId]);
  if (!product) return <NotFound />;
  return <section className="product-detail page-container"><button className="back-link" onClick={() => navigate('/shop')}><ArrowLeft size={17} /> All products</button><div className="product-detail__grid"><div className="product-gallery"><div className="product-gallery__main"><img src={product.gallery[activeImage]} alt={product.name} /><button className="gallery-arrow gallery-arrow--prev" onClick={() => setActiveImage((activeImage - 1 + product.gallery.length) % product.gallery.length)} aria-label="Previous product image"><ChevronLeft /></button><button className="gallery-arrow gallery-arrow--next" onClick={() => setActiveImage((activeImage + 1) % product.gallery.length)} aria-label="Next product image"><ChevronRight /></button></div><div className="product-gallery__thumbs">{product.gallery.map((src, index) => <button key={src} className={index === activeImage ? 'is-active' : ''} onClick={() => setActiveImage(index)}><img src={src} alt="" /></button>)}</div></div><div className="product-detail__info"><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><p className="product-detail__size">{product.size}</p><p className="product-detail__price"><ProductPrice product={product} /></p><p className="product-detail__summary">{product.details}</p><div className="product-detail__line"></div><div className="quantity-row"><span>Quantity</span><Quantity quantity={quantity} setQuantity={setQuantity} /></div><button className="button button--green button--wide" onClick={() => onAdd(product, quantity)}>Add to bag <ArrowUpRight /></button><div className="product-reassurance"><div><Truck /><span><b>Shipping</b>Calculated at checkout</span></div><div><ShieldCheck /><span><b>Secure checkout</b>Payment setup coming soon</span></div></div><div className="accordions">{['Details', 'Ingredients & use', 'Shipping & returns'].map((title) => <div key={title} className={tab === title ? 'accordion is-open' : 'accordion'}><button onClick={() => setTab(tab === title ? '' : title)}>{title}<Plus /></button>{tab === title && <p>{title === 'Details' ? product.details : title === 'Ingredients & use' ? product.ingredients : 'Shipping and returns details will be confirmed before checkout is enabled.'}</p>}</div>)}</div></div></div><div className="related-products"><p className="eyebrow">You may also enjoy</p><h2>Continue your <em>ritual.</em></h2><div className="product-grid">{products.filter((item) => item.id !== product.id).slice(0, 3).map((item) => <ProductCard key={item.id} product={item} onAdd={onAdd} />)}</div></div></section>;
}

function Quantity({ quantity, setQuantity }) { return <div className="quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity"><Minus size={15} /></button><b>{quantity}</b><button onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity"><Plus size={15} /></button></div>; }

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

function Contact() { const [sent, setSent] = useState(false); return <><PageHero eyebrow="Get in touch" title={<>We'd love to<br /><em>hear from you.</em></>} text="For product, order, or general questions, our team is here to help." imageSrc={image('contact-hero.jpg')} /><section className="section contact"><div className="page-container contact__grid"><div><p className="eyebrow">Contact Natural Root</p><h2>Start a <em>conversation.</em></h2><p>Send us a note and we’ll be in touch as soon as we can.</p><div className="contact__details"><a href="mailto:hello@naturalroothealing.com">hello@naturalroothealing.com</a><span>Monday to Friday, 9am to 5pm IST</span></div></div><form onSubmit={(event) => { event.preventDefault(); setSent(true); }} className="contact-form"><label>Name<input required placeholder="Your name" /></label><label>Email address<input required type="email" placeholder="you@example.com" /></label><label>What can we help with?<select defaultValue=""><option value="" disabled>Select a topic</option><option>Product question</option><option>Order support</option><option>Something else</option></select></label><label>Message<textarea required placeholder="Tell us a little more" rows="4"></textarea></label><button className="button button--green" type="submit">{sent ? <>Message sent <Check /></> : <>Send message <ArrowUpRight /></>}</button></form></div></section></>;
}

function CartPage({ cart, onCart }) { return <section className="cart-page section"><div className="page-container"><p className="eyebrow">Your selection</p><h1>Your <em>bag.</em></h1>{cart.count ? <div className="cart-page__layout"><CartItems cart={cart} /><OrderSummary subtotal={cart.subtotal} /><div className="cart-page__cta"><Link className="button button--green" to="/checkout">Continue to checkout <ArrowUpRight /></Link></div></div> : <EmptyCart onCart={onCart} />}</div></section>; }

function CartItems({ cart }) { return <div className="cart-items">{cart.cart.map((item) => <div className="cart-item" key={item.id}><img src={item.image} alt="" /><div><p>{item.category}</p><h3>{item.name}</h3><span>{item.size}</span><button onClick={() => cart.remove(item.id)}>Remove</button></div><div><b>{formatPrice(item.price * item.quantity)}</b><Quantity quantity={item.quantity} setQuantity={(quantity) => cart.update(item.id, quantity)} /></div></div>)}</div>; }

function EmptyCart() { return <div className="empty-cart"><ShoppingBag /><h2>Your bag is waiting.</h2><p>Explore the collection and find a ritual that feels right for you.</p><Link className="button button--green" to="/shop">Explore products <ArrowUpRight /></Link></div>; }

function OrderSummary({ subtotal }) { const shipping = subtotal > 1500 ? 0 : 99; return <aside className="order-summary"><h3>Order summary</h3><div><span>Subtotal</span><b>{formatPrice(subtotal)}</b></div><div><span>Shipping</span><b>{shipping ? formatPrice(shipping) : 'Complimentary'}</b></div><p>Taxes are calculated at checkout.</p><div className="order-summary__total"><span>Total</span><b>{formatPrice(subtotal + shipping)}</b></div></aside>; }

function Checkout({ cart }) { const [step, setStep] = useState(1); const navigate = useNavigate(); const next = () => step === 3 ? navigate('/order-confirmation') : setStep(step + 1); return <section className="checkout section"><div className="page-container"><div className="checkout__brand"><Brand /></div><div className="checkout__steps">{['Contact', 'Delivery', 'Review'].map((item, index) => <span className={index + 1 <= step ? 'is-active' : ''} key={item}><b>{index + 1}</b>{item}</span>)}</div><div className="checkout__layout"><div className="checkout-form"><p className="eyebrow">Step {step} of 3</p><h1>{step === 1 ? 'Contact details' : step === 2 ? 'Delivery address' : 'Review your order'}</h1>{step === 1 && <div className="form-grid"><label>Full name<input placeholder="Your full name" /></label><label>Email address<input type="email" placeholder="you@example.com" /></label><label className="full">Mobile number<input type="tel" placeholder="Your phone number" /></label><label className="check-line full"><input type="checkbox" /> Keep me in the loop with Natural Root notes and offers.</label></div>}{step === 2 && <div className="form-grid"><label className="full">Address<input placeholder="Street address" /></label><label>City<input placeholder="City" /></label><label>State<input placeholder="State" /></label><label>Postal code<input placeholder="Postal code" /></label><label>Country<select defaultValue="India"><option>India</option></select></label></div>}{step === 3 && <div className="review-block">{cart.cart.length ? <CartItems cart={cart} /> : <p>Your bag is empty. Add a product before confirming a design checkout.</p>}<div className="payment-placeholder"><ShieldCheck /><div><b>Payment integration coming next</b><span>This design flow does not collect or process payment details.</span></div></div></div>}<div className="checkout-form__buttons"><button className="text-link" onClick={() => step > 1 ? setStep(step - 1) : navigate('/cart')}>{step === 1 ? 'Return to bag' : 'Back'}</button><button className="button button--green" onClick={next}>{step === 3 ? 'Place design order' : 'Continue'} <ArrowUpRight /></button></div></div><OrderSummary subtotal={cart.subtotal} /></div></div></section>; }

function Confirmation() { return <section className="confirmation section"><div className="page-container"><div><span><Check /></span><p className="eyebrow">Design flow complete</p><h1>Thank you for<br />your <em>order.</em></h1><p className="confirmation__copy">This is a visual confirmation only. No order has been placed and no payment was taken.</p><div className="confirmation__number"><small>Reference</small><b>NRH — 20261024</b></div><Link className="button button--green" to="/shop">Continue exploring <ArrowUpRight /></Link></div></div></section>; }

function Account() { return <section className="account section"><div className="page-container account__grid"><div><p className="eyebrow">Your Natural Root</p><h1>Welcome <em>back.</em></h1><p>Sign in to view your orders and save your favourite rituals.</p></div><form className="login-form" onSubmit={(event) => event.preventDefault()}><h2>Sign in</h2><label>Email address<input type="email" placeholder="you@example.com" /></label><label>Password<input type="password" placeholder="••••••••" /></label><div><label className="check-line"><input type="checkbox" /> Remember me</label><button type="button" className="plain-button">Forgot password?</button></div><button className="button button--green" type="submit">Sign in <ArrowUpRight /></button><p>New here? <button type="button" className="plain-button">Create an account</button></p></form></div></section>; }

function Legal({ title }) { return <section className="legal section"><div className="page-container"><p className="eyebrow">Natural Root Healing</p><h1>{title}</h1><p className="legal__updated">Last updated: October 24, 2026</p><div className="legal__content"><h2>Our commitment to clarity</h2><p>This design preview contains placeholder policy copy. Before launch, this page should be updated with approved business, legal, fulfillment, and customer-service details.</p><h2>Information for customers</h2><p>We believe important information should be easy to find and easy to understand. Details about orders, privacy, terms, delivery, and returns will be presented here once the store’s operating policies are finalised.</p><h2>Need a hand?</h2><p>Please contact our team if you have a question about this website experience.</p></div></div></section>; }

function PageHero({ eyebrow, title, text, imageSrc }) { return <section className="page-hero"><img src={imageSrc} alt="" /><div className="page-hero__overlay"></div>{eyebrow && <div className="page-container page-hero__content"><p className="eyebrow eyebrow--light">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>}</section>; }

function Newsletter() { const [submitted, setSubmitted] = useState(false); return <section className="newsletter"><div className="page-container newsletter__inner"><div><p className="eyebrow eyebrow--light">A little note from us</p><h2>Stay close to<br /><em>the root.</em></h2></div><div><p>Thoughtful notes, new rituals, and occasional invitations delivered quietly to your inbox.</p><form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" type="email" placeholder="Your email address" required /><button aria-label="Subscribe" type="submit">{submitted ? <Check /> : <ArrowUpRight />}</button></form>{submitted && <small>Thank you - you’re on the list.</small>}</div></div></section>; }

function Footer() { return <footer className="footer"><div className="page-container"><div className="footer__top"><Brand light /><div className="footer__links"><div><b>Explore</b><Link to="/shop">Shop</Link><Link to="/about">Our story</Link><Link to="/ayurveda">Ayurveda</Link><Link to="/blog">Journal</Link></div><div><b>Help</b><Link to="/contact">Contact</Link><Link to="/shipping">Shipping</Link><Link to="/returns">Returns</Link><Link to="/account">Account</Link></div><div className="footer__social"><b>Follow along</b><div><a href="#instagram" aria-label="Photo updates"><Camera /></a><a href="#messages" aria-label="Messages"><MessageCircle /></a></div></div></div></div><div className="footer__bottom"><span>© 2026 Natural Root Healing</span><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div><span>Rooted in nature</span></div></div></footer>; }

function CartDrawer({ open, close, cart }) { return <div className={`drawer-layer ${open ? 'is-open' : ''}`} aria-hidden={!open}><button className="drawer-layer__scrim" onClick={close} aria-label="Close shopping bag"></button><aside className="cart-drawer" aria-label="Shopping bag"><header><h2>Your bag <small>({cart.count})</small></h2><button className="icon-button" onClick={close} aria-label="Close shopping bag"><X /></button></header>{cart.count ? <><CartItems cart={cart} /><div className="cart-drawer__bottom"><OrderSummary subtotal={cart.subtotal} /><Link className="button button--green button--wide" to="/checkout" onClick={close}>Checkout <ArrowUpRight /></Link><Link className="text-link center-link" to="/cart" onClick={close}>View bag</Link></div></> : <EmptyCart />}</aside></div>; }

function SearchDialog({ open, close }) { const navigate = useNavigate(); const [term, setTerm] = useState(''); const filtered = useMemo(() => products.filter((product) => product.name.toLowerCase().includes(term.toLowerCase())), [term]); useEffect(() => { if (!open) setTerm(''); }, [open]); if (!open) return null; return <div className="search-dialog" role="dialog" aria-modal="true" aria-label="Search products"><button className="search-dialog__scrim" onClick={close} aria-label="Close search"></button><div className="search-dialog__panel"><div><Search /><input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search the collection" /><button onClick={close} className="icon-button"><X /></button></div>{term && <ul>{filtered.length ? filtered.map((product) => <li key={product.id}><button onClick={() => { navigate(`/shop/${product.id}`); close(); }}><img src={product.image} alt="" /><span><b>{product.name}</b><small>{product.category} · {formatPrice(product.price)}</small></span><ArrowUpRight /></button></li>) : <li className="search-empty">No products found. Try another word.</li>}</ul>} {!term && <p>Try “Testo” or “Dr. Sebi”</p>}</div></div>; }

function NotFound() { return <section className="not-found section"><div className="page-container"><p className="eyebrow">404</p><h1>This path needs<br />a new <em>root.</em></h1><p>We couldn’t find the page you were looking for.</p><Link className="button button--green" to="/">Return home <ArrowUpRight /></Link></div></section>; }

export default App;
