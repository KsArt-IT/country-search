export default {
  // Sequential within one glob: tsc runs after eslint/prettier have finished writing files.
  // tsc gets no file list (a function returning a string), otherwise it ignores tsconfig.json.
  '*.ts': ['eslint --fix --max-warnings=0', 'prettier --write', () => 'tsc --noEmit'],
  '*.{js,mjs,cjs}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{html,css,json,md,yml,yaml}': 'prettier --write',
};
