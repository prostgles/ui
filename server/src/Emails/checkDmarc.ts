import { promises } from "node:dns";

export const checkDmarc = async (websiteUrl: string) => {
  const { host, hostname } = new URL(websiteUrl);
  const ignoredHosts = ["localhost", "127.0.0.1"];
  if (!hostname || ignoredHosts.includes(hostname)) {
    return;
  }
  const dmarc = await promises.resolveTxt(`_dmarc.${host}`);
  const dmarcTxt = dmarc[0]?.[0];
  if (
    !dmarcTxt?.includes("v=DMARC1") ||
    (!dmarcTxt.includes("p=reject") && !dmarcTxt.includes("p=quarantine"))
  ) {
    throw new Error("DMARC not set to reject/quarantine");
  } else {
    console.log("DMARC set to reject");
  }
};
