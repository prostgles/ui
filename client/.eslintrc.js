const commonConfig = require("../.eslintrc.common.js");

module.exports = {
  ...commonConfig,
  extends: [...commonConfig.extends, "plugin:react-hooks/recommended"],
  rules: {
    ...commonConfig.rules,
    "react-hooks/exhaustive-deps": [
      "warn",
      {
        additionalHooks:
          "(usePromise|useEffectAsync|useProstglesClient|useAsyncEffectQueue)",
      },
    ],
  },
};
