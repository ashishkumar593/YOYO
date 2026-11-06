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

if (typeof client.rerank === 'function' && typeof client.rerank.create === 'function') {
  console.log('[OK] client.rerank (callable & .create) exists');
} else {
  throw new Error('client.rerank methods missing');
}

// Batches & Files API check
if (typeof client.files.create === 'function' && typeof client.files.list === 'function' && typeof client.files.retrieve === 'function' && typeof client.files.content === 'function' && typeof client.files.delete === 'function') {
  console.log('[OK] client.files (create, list, retrieve, content, delete) exist');
} else {
  throw new Error('client.files methods missing');
}

if (typeof client.batches.create === 'function' && typeof client.batches.list === 'function' && typeof client.batches.retrieve === 'function' && typeof client.batches.cancel === 'function') {
  console.log('[OK] client.batches (create, list, retrieve, cancel) exist');
} else {
  throw new Error('client.batches methods missing');
}

// 3. Missing API key rejection
try {
  delete process.env.YOYO_API_KEY;
  new Yoyo({ apiKey: '' });
  throw new Error('Should have thrown on empty API key');
} catch (e) {
  if (e.message.includes('API Key is required')) {
    console.log('[OK] API key validation error properly thrown');
  } else {
    throw e;
  }
}

// 4. Env var auto-detection test
process.env.YOYO_API_KEY = 'sk_live_env_key';
const envClient = new Yoyo();
if (envClient) {
  console.log('[OK] Auto-detection from process.env.YOYO_API_KEY succeeded');
}
delete process.env.YOYO_API_KEY;

console.log('=== All TypeScript SDK In-Memory Checks Passed ===');

