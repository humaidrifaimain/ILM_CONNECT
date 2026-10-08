const realFetch = global.fetch;
global.fetch = (url, options) => String(url).startsWith('https://api.frankfurter.dev/')
  ? Promise.resolve(new Response(JSON.stringify([
    { quote: 'LKR', rate: 300 }, { quote: 'GBP', rate: .75 },
    { quote: 'EUR', rate: .9 }, { quote: 'AUD', rate: 1.5 },
  ].map(row => ({ ...row, base: 'USD', date: new Date().toISOString().slice(0, 10) }))), { headers: { 'Content-Type': 'application/json' } }))
  : realFetch(url, options);
