const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient("https://kindred-whale-566.convex.cloud");

async function update() {
  const orgs = await client.query("organizations:get");
  if (orgs.length > 0) {
    const orgId = orgs[0]._id;
    const settings = await client.query("organizations:settings", { orgId });
    if (settings) {
      let plans = settings.profitPlans || [];
      if (plans.length < 3) {
        plans.push({ id: "pro-1", name: "Pro", percentage: 50, rounding: "nearest" });
        await client.mutation("organizations:upsertSettings", {
          ...settings,
          fiscalName: settings.fiscalName || undefined,
          ruc: settings.ruc || undefined,
          address: settings.address || undefined,
          contact: settings.contact || undefined,
          website: settings.website || undefined,
          legalRepresentative: settings.legalRepresentative || undefined,
          defaultProfitPlanId: settings.defaultProfitPlanId || undefined,
          orderTemplate: settings.orderTemplate || undefined,
          saleTemplate: settings.saleTemplate || undefined,
          templates: settings.templates || undefined,
          blockTemplates: settings.blockTemplates || undefined,
          profitPlans: plans
        });
        console.log("Added 3rd plan to DB");
      }
    }
  }
}
update();
