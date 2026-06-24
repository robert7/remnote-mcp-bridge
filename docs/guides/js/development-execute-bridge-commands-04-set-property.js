await runAndLog('set_property', {
  remId: 'REPLACE_WITH_TARGET_REM_ID',
  tagRemId: 'REPLACE_WITH_TAG_OR_TABLE_REM_ID',
  propertyRemId: 'REPLACE_WITH_PROPERTY_REM_ID',
  value: { kind: 'text', text: 'People' },
});

await runAndLog('set_property', {
  remId: 'REPLACE_WITH_TARGET_REM_ID',
  tagRemId: 'REPLACE_WITH_TAG_OR_TABLE_REM_ID',
  propertyRemId: 'REPLACE_WITH_PROPERTY_REM_ID',
  value: { kind: 'rem_reference', remId: 'REPLACE_WITH_OPTION_OR_REFERENCE_REM_ID' },
});
