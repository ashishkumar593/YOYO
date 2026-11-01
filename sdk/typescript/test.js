const { Yoyo } = require('./dist/index.js');

console.log('=== Testing TypeScript SDK Build & Export ===');

// 1. Instantiation check
const client = new Yoyo({
  apiKey: 'sk_live_test_api_key_for_verification',
  baseUrl: 'https://api.yoyo.ai/v1',
});

console.log('[OK] Yoyo client initialized successfully.');

// 2. Methods existence check
if (typeof client.chat.create === 'function') {
  console.log('[OK] client.chat.create exists');
} else {
  throw new Error('client.chat.create is missing');
}

if (typeof client.chat.createStream === 'function') {
  console.log('[OK] client.chat.createStream exists');
} else {
  throw new Error('client.chat.createStream is missing');
}

if (typeof client.chat.completions.create === 'function') {
  console.log('[OK] client.chat.completions.create exists');
} else {
  throw new Error('client.chat.completions.create is missing');
}

if (typeof client.models.list === 'function') {
  console.log('[OK] client.models.list exists');
} else {
  throw new Error('client.models.list is missing');
}

if (typeof client.embeddings.create === 'function') {
  console.log('[OK] client.embeddings.create exists');
} else {
  throw new Error('client.embeddings.create is missing');
}

// 3. Missing API key rejection
try {
  new Yoyo({ apiKey: '' });
  throw new Error('Should have thrown on empty API key');
} catch (e) {
  if (e.message.includes('API Key is required')) {
    console.log('[OK] API key validation error properly thrown');
  } else {
    throw e;
  }
}

console.log('=== All TypeScript SDK In-Memory Checks Passed ===');

