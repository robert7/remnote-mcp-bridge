await runBridge('search', {
  query: 'AI assisted coding',
  limit: 5,
  includeContent: 'markdown',
  depth: 1,
  childLimit: 10,
  maxContentLength: 1000,
});
