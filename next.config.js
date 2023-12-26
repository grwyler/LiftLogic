// next.config.js
module.exports = {
  server: {
    host: "0.0.0.0",
    port: process.env.PORT || 3000,
  },
  basePath: process.env.NODE_ENV === "production" ? "/grwyler/LiftLogic" : "",
};
