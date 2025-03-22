const commonConfig = require("../.eslintrc.common.js");

module.exports = {
  ...commonConfig,
  extends: [
    ...commonConfig.extends,
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  rules: {
    ...commonConfig.rules,
    "react/no-unused-prop-types": "warn",
    "react/display-name": "off",
    "react/no-children-prop": "off",
    "react/prop-types": "off",
    "react/no-unused-prop-types": "off",
    "react-hooks/exhaustive-deps": [
      "warn",
      {
        additionalHooks:
          "(usePromise|useEffectAsync|useProstglesClient|useAsyncEffectQueue)",
      },
    ],
  },
};
