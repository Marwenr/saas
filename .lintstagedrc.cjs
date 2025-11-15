// lint-staged configuration
// Runs linters and formatters on staged files before commit
module.exports = {
  '*.{js,jsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md}': ['prettier --write'],
};

