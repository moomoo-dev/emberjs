const isolation = require('./isolation.cjs');

function defaults(config = {}) {
  return {
    files: config.files || ['tests/**/*-test.{js,ts}'],
    extends: ['plugin:qunit/recommended'],
    rules: Object.assign(
      isolation.rules({
        allowedImports: ['@ember/debug', '@ember/test-helpers', 'qunit'],
      }),
      config?.rules,
      {}
    ),
  };
}

module.exports = {
  defaults,
};
