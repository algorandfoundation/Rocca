const path = require('path');

module.exports = function (api) {
  api.cache(true);

  return {
    // use the expo preset
    presets: ['babel-preset-expo'],
    // Ignore sibling workspace projects under /packages for this app build.
    ignore: [
      (filename) => {
        if (!filename) return false;
        return filename.includes(`${path.sep}packages${path.sep}`);
      },
    ],
    // other config
    plugins: [
      [
        'react-native-unistyles/plugin',
        {
          // pass root folder of your application
          root: 'app',
        },
      ],
    ],
  };
};
