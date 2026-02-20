await runAndLog('update_note', {
  remId: testRemId,
  title: 'DevTools test note (updated)',
  appendContent: 'Appended line from DevTools',
  addTags: ['updated-from-console'],
  removeTags: ['devtools'],
});
