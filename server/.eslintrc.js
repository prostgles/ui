const commonConfig = require("../.eslintrc.common.js");
const pluginSecurity = require("eslint-plugin-security");

module.exports = {
  ...commonConfig,
  extends: [...commonConfig.extends, pluginSecurity.configs.recommended],
  rules: {
    ...commonConfig.rules,
  },
};
