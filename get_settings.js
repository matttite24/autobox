const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient("https://kindred-whale-566.convex.cloud");

async function check() {
  const orgs = await client.query("organizations:get");
  console.log("Orgs:", orgs);
  if (orgs.length > 0) {
    const settings = await client.query("organizations:settings", { orgId: orgs[0]._id });
    console.log("Profit Plans:", settings?.profitPlans);
  }
}
check();
