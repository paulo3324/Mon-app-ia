import type { Metadata } from "next";
import RealEstateSimulator from "../components/RealEstateSimulator";

export const metadata: Metadata = {
  title: "Simulateur Investissement Immobilier — PatriPro",
  description: "Page du simulateur dédié aux projets d'investissement immobilier patrimonial.",
};

export default function SimulateurInvestissementImmobilierPage() {
  return <RealEstateSimulator />;
}
