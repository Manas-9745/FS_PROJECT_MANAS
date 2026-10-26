const path = require("path");
const newman = require("C:/Users/Manas S Parekar/AppData/Roaming/npm/node_modules/newman");

console.log("Running EXP 5 Postman Collection via Newman...\n");

newman.run(
  {
    collection: require("./EXP_5_Secure_REST_API.postman_collection.json"),
    reporters: ["cli", "htmlextra"],
    reporter: {
      htmlextra: {
        export: path.join(__dirname, "exp5_newman_dashboard.html"),
        title: "EXP 5 - Secure REST API Newman Report",
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
    console.log(` Newman Run Finished!`);
    console.log(` Assertions: ${summary.run.stats.assertions.total} total, ${summary.run.stats.assertions.failed} failed`);
    console.log(` Report Generated: backend/exp5_newman_dashboard.html`);
    console.log(`===================================================\n`);
    process.exit(failures > 0 ? 1 : 0);
  }
);
