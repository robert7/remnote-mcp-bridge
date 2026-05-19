await runBridge('search_by_tag', {
  tagRemId: 'YOUR_TAG_REM_ID',
  limit: 5,
  contentMode: 'markdown',
  depth: 1,
  childLimit: 10,
  maxContentLength: 1000,
});
