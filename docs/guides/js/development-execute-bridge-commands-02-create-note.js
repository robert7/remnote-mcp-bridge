const created = await runAndLog('create_note', {
  title: 'DevTools test note',
  content: 'Line 1\nLine 2',
  tagRemIds: ['YOUR_TAG_REM_ID'],
  // parentId: 'YOUR_PARENT_REM_ID',
});

// Save for follow-up commands
const testRemId = created.remIds[0];
