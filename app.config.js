const IS_DEV = process.env.APP_VARIANT === "development";

module.exports = ({ config }) => {
  if (IS_DEV) {
    return {
      ...config,
      name: "Cleared Dev",
      android: {
        ...config.android,
        package: `${config.android.package}.dev`,
      },
    };
  }
  return config;
};