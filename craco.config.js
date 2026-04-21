const path = require("path");

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // 🔥 FULL SOURCE MAPS (bitno za stack trace na telefonu)
      webpackConfig.devtool = "source-map";

      // 📍 Bolje imena fajlova u error stacku
      webpackConfig.output = {
        ...webpackConfig.output,
        devtoolModuleFilenameTemplate: (info) =>
          "file:///" + path.resolve(info.absoluteResourcePath).replace(/\\/g, "/"),
      };

      return webpackConfig;
    },
  },

  // 🧠 Enable runtime error tracking hooks
  devServer: (devServerConfig) => {
    devServerConfig.client = {
      overlay: {
        errors: true,
        warnings: false,
      },
    };

    return devServerConfig;
  },
};
