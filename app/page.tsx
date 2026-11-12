import PortfolioDemo from "./components/portfolio-demo";
export default async function Home() {
  if (process.env.DEBATIFY_INTEGRATIONS_ENABLED === "true") {
    const { default: OriginalLanding } = await import("./components/original-landing");
    return <OriginalLanding />;
  }
  return <PortfolioDemo />;
}
