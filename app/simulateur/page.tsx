import type { Metadata } from "next";
import Simulator from "../components/Simulator";

export const metadata: Metadata = {
  title: "Simulateur — Transmission & cession — PatriPro",
  description:
    "Outil interactif d'aide à la décision pour la transmission et la cession d'entreprise — comparez trois scénarios (transmission, cession, mixte).",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Simulateur — Transmission & cession — PatriPro",
    description:
      "Outil interactif d'aide à la décision pour la transmission et la cession d'entreprise — comparez trois scénarios (transmission, cession, mixte).",
    locale: "fr_FR",
  },
};

export default function SimulateurPage() {
  return <Simulator />;
}
