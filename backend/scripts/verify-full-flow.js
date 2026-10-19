const app = require('../server');
const db = require('../config/db');

async function testApi() {
  await db.ensureSchema();
  await db.testConnection();

  const server = app.listen(5099, async () => {
    try {
      console.log('--- TEST 1: Health check ---');
      const healthRes = await fetch('http://localhost:5099/api/health').then(r => r.json());
      console.log('Health:', healthRes);
      if (healthRes.status !== 'OK') throw new Error('Health check failed');

      console.log('--- TEST 2: Product categories ---');
      const catsRes = await fetch('http://localhost:5099/api/products/categories').then(r => r.json());
      console.log('Categories count:', catsRes.count, 'first 3:', catsRes.data.slice(0, 3));
      if (!Array.isArray(catsRes.data) || catsRes.count === 0) throw new Error('No categories returned');

      console.log('--- TEST 3: Product list ---');
      const prodRes = await fetch('http://localhost:5099/api/products?page=1&limit=2').then(r => r.json());
      console.log('Products total in catalog:', prodRes.count, 'returned:', prodRes.data.length);
      const testProd = prodRes.data[0];
      console.log('Sample product:', testProd.id, testProd.name, 'Price:', testProd.price, 'Stock:', testProd.stock);
      if (!testProd || !testProd.id) throw new Error('Product listing failed');

      console.log('--- TEST 4: Product detail ---');
      const detailRes = await fetch('http://localhost:5099/api/products/' + testProd.id).then(r => r.json());
      console.log('Detail product name:', detailRes.data.name);
      if (detailRes.data.id !== testProd.id) throw new Error('Product detail mismatch');

      console.log('--- TEST 5: Auth Register ---');
      const testEmail = 'qa_test_' + Date.now() + '@novacart.test';
      const regRes = await fetch('http://localhost:5099/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'QA Tester', email: testEmail, password: 'password123' }),
      }).then(r => r.json());
      console.log('Register response:', regRes.success, 'user:', regRes.user.email);
      if (!regRes.token) throw new Error('Registration failed, no token');
      const token = regRes.token;

      console.log('--- TEST 6: Auth Login ---');
      const loginRes = await fetch('http://localhost:5099/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'password123' }),
      }).then(r => r.json());
      console.log('Login response:', loginRes.success, 'user role:', loginRes.user.role);
      if (!loginRes.token) throw new Error('Login failed');

      console.log('--- TEST 7: Place Order ---');
      const orderPayload = {
        items: [{ product_id: testProd.id, quantity: 1 }],
        shipping: {
          name: 'QA Tester',
          address: '123 Quality Street, Test City, 560001',
          phone: '+91 9876543210',
        },
      };
      const orderRes = await fetch('http://localhost:5099/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify(orderPayload),
      }).then(r => r.json());
      console.log('Order response:', orderRes.success, 'Order ID:', orderRes.data?.id, 'Total:', orderRes.data?.total_amount);
      if (!orderRes.success || !orderRes.data?.id) throw new Error('Order placement failed: ' + JSON.stringify(orderRes));

      console.log('--- TEST 8: Track Order ---');
      const trackRes = await fetch('http://localhost:5099/api/orders/' + orderRes.data.id + '/tracking', {
        headers: { 'Authorization': 'Bearer ' + token },
      }).then(r => r.json());
      console.log('Tracking response:', trackRes.success, 'status:', trackRes.data?.status, 'timeline steps:', trackRes.data?.timeline?.length);
      if (!trackRes.success) throw new Error('Order tracking failed');

      console.log('\n======================================================');
      console.log('>>> ALL 8 FULL-STACK END-TO-END TESTS PASSED 100%! <<<');
      console.log('======================================================\n');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('\n❌ Test failed:', err.message);
      server.close();
      process.exit(1);
    }
  });
}

testApi();
