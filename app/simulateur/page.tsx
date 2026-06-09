import type { Metadata } from "next";
import Simulator from "../components/Simulator";

export const metadata: Metadata = {
  title: "Plateforme de transmission professionnelle — PatriPro",
  description:
    "Dossier dirigeant interactif pour comparer les scénarios de transmission, les analyses fiscales et juridiques, les sources et le rapport client.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Plateforme de transmission professionnelle — PatriPro",
    description:
      "Dossier dirigeant interactif pour comparer les scénarios de transmission, les analyses fiscales et juridiques, les sources et le rapport client.",
    locale: "fr_FR",
  },
};

export default function SimulateurPage() {
  return <Simulator />;
}
