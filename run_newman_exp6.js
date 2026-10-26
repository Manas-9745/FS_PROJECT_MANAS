const path = require("path");
const newman = require("C:/Users/Manas S Parekar/AppData/Roaming/npm/node_modules/newman");

console.log("Running EXP 6 Postman Collection via Newman...\n");

newman.run(
  {
    collection: require("./EXP_6_JWT_Authentication.postman_collection.json"),
    reporters: ["cli", "htmlextra"],
    reporter: {
      htmlextra: {
        export: path.join(__dirname, "exp6_newman_dashboard.html"),
        title: "EXP 6 - JWT Authentication & User Roles Newman Report",
      },
    },
  },
  function (err, summary) {
    if (err) {
      console.error("Newman error:", err);
      process.exit(1);
    }
    const failures = summary.run.failures.length;
    console.log(`\n===================================================`);
    console.log(` EXP 6 Newman Run Finished!`);
    console.log(` Assertions: ${summary.run.stats.assertions.total} total, ${summary.run.stats.assertions.failed} failed`);
    console.log(` Report Generated: backend/exp6_newman_dashboard.html`);
    console.log(`===================================================\n`);
    process.exit(failures > 0 ? 1 : 0);
  }
);
