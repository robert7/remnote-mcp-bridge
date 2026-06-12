await runBridge('search', {
  query: 'AI assisted coding',
  parentRemId: 'optionalParentRemId',
  limit: 5,
  contentMode: 'markdown',
  depth: 1,
  childLimit: 10,
  maxContentLength: 1000,
});
