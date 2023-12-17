
  "babel": {
    "presets": [
      [
        "@babel/env",
        {
          "targets": {
            "esmodules": true
          }
        }
      ],
      "@babel/preset-typescript"
    ],
    "plugins": [
      "@babel/proposal-class-properties",
      "@babel/proposal-object-rest-spread"
    ]
  }