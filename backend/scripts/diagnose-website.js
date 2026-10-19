const BASE_URL = 'http://localhost:5000';

async function diagnose() {
  const results = {
    pages: [],
    stylesheets: [],
    scripts: [],
    assets: [],
    apis: [],
    flow: {},
  };

  let allPassed = true;

  async function check(category, url, expectedStatus = 200) {
    try {
      const res = await fetch(url);
      const ok = res.status === expectedStatus;
      results[category].push({ url, status: res.status, ok });
      if (!ok) allPassed = false;
      return res;
    } catch (err) {
      results[category].push({ url, error: err.message, ok: false });
      allPassed = false;
      return null;
    }
  }

  console.log('\n🔍 [1/6] Checking HTML Pages...');
  const pages = [
    '/',
    '/pages/index.html',
    '/pages/products.html',
    '/pages/product.html?id=1',
    '/pages/cart.html',
    '/pages/checkout.html',
    '/pages/login.html',
    '/pages/register.html',
    '/pages/tracking.html',
  ];
  for (const page of pages) {
    await check('pages', `${BASE_URL}${page}`);
  }

  console.log('🎨 [2/6] Checking CSS Stylesheets...');
  const cssFiles = [
    '/css/style.css',
    '/css/navbar.css',
    '/css/home.css',
    '/css/product.css',
    '/css/products-page.css',
    '/css/cart.css',
    '/css/checkout.css',
    '/css/auth.css',
    '/css/saved-products.css',
  ];
  for (const css of cssFiles) {
    await check('stylesheets', `${BASE_URL}${css}`);
  }

  console.log('⚡ [3/6] Checking Client JavaScript Files...');
  const jsFiles = [
    '/js/api.js',
    '/js/navbar.js',
    '/js/engagement.js',
    '/js/products.js',
    '/js/productsPage.js',
    '/js/productDetail.js',
    '/js/cart.js',
    '/js/checkout.js',
    '/js/auth.js',
    '/js/tracking.js',
  ];
  for (const js of jsFiles) {
    await check('scripts', `${BASE_URL}${js}`);
  }

  console.log('🖼️ [4/6] Checking Image Assets...');
  const assetFiles = [
    '/assets/products/variants/PRD00001.jpg',
    '/assets/products/variants/PRD00002.jpg',
    '/assets/products/variants/PRD00003.jpg',
  ];
  for (const asset of assetFiles) {
    await check('assets', `${BASE_URL}${asset}`);
  }

  console.log('🔌 [5/6] Checking Core APIs...');
  const healthRes = await check('apis', `${BASE_URL}/api/health`);
  const catRes = await check('apis', `${BASE_URL}/api/products/categories`);
  const prodRes = await check('apis', `${BASE_URL}/api/products?page=1&limit=4`);
  const searchRes = await check('apis', `${BASE_URL}/api/products?q=bottle&page=1&limit=4`);
  const filterRes = await check('apis', `${BASE_URL}/api/products?category=Electronics&page=1&limit=4`);

  console.log('🛒 [6/6] Checking End-to-End User Transaction...');
  const uniqueEmail = `audit_live_${Date.now()}@novacart.test`;
  
  // Register
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Live Auditor', email: uniqueEmail, password: 'password123' }),
  });
  const regData = await regRes.json();
  results.flow.register = { status: regRes.status, success: regData.success };

  // Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail, password: 'password123' }),
  });
  const loginData = await loginRes.json();
  results.flow.login = { status: loginRes.status, success: loginData.success, hasToken: Boolean(loginData.token) };

  // Place Order
  const token = loginData.token;
  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: [{ product_id: 1, quantity: 1 }],
      shipping: {
        name: 'Live Auditor',
        address: '456 Verification Ave, Test City',
        phone: '+91 9876543210',
      },
    }),
  });
  const orderData = await orderRes.json();
  results.flow.placeOrder = { status: orderRes.status, success: orderData.success, orderId: orderData.data?.id };

  // Track Order
  const trackRes = await fetch(`${BASE_URL}/api/orders/${orderData.data?.id}/tracking`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const trackData = await trackRes.json();
  results.flow.tracking = { status: trackRes.status, success: trackData.success, statusName: trackData.data?.status };

  console.log('\n=============================================');
  console.log('           DIAGNOSTIC SUMMARY REPORT          ');
  console.log('=============================================');
  console.log(`HTML Pages Checked    : ${results.pages.length} / ${results.pages.filter(p => p.ok).length} OK`);
  console.log(`Stylesheets Checked   : ${results.stylesheets.length} / ${results.stylesheets.filter(p => p.ok).length} OK`);
  console.log(`Scripts Checked       : ${results.scripts.length} / ${results.scripts.filter(p => p.ok).length} OK`);
  console.log(`Image Assets Checked  : ${results.assets.length} / ${results.assets.filter(p => p.ok).length} OK`);
  console.log(`APIs Checked          : ${results.apis.length} / ${results.apis.filter(p => p.ok).length} OK`);
  console.log(`End-to-End User Flow  : Register -> Login -> Checkout -> Track : ${results.flow.placeOrder?.success ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log('=============================================\n');

  if (!allPassed) {
    console.error('Some checks failed:', JSON.stringify(results, null, 2));
    process.exit(1);
  }
}

diagnose().catch(err => {
  console.error('Diagnosis error:', err);
  process.exit(1);
});
