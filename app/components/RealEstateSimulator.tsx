"use client";

/* eslint-disable react/no-unescaped-entities */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import css from "./RealEstateSimulator.module.css";

type ResultTab = "synthese" | "strategies" | "fiscalite" | "transmission" | "juridique" | "projection" | "sources";
type Objective = "revenus" | "reduction-ir" | "capitalisation" | "transmission" | "retraite" | "achat-revente" | "reinvestissement";
type SecondaryObjective = Objective | "aucun";
type RentalMode = "nue-longue" | "meublee-longue" | "meublee-courte" | "saisonniere";
type PurchaseSituation = "seul" | "marie" | "pacs" | "fratrie" | "parents-enfants" | "associes";
type StructureId = "nom-propre" | "sci-ir" | "sci-is" | "sarl-famille" | "sarl-is" | "sas" | "indivision";
type TaxProfile = "foncier" | "bic" | "is";
type ExistingRentalNature = "foncier" | "lmnp";
type ExistingRentalRegime = "micro" | "reel";
type DetentionHorizon = "moins-30" | "plus-30";

interface FormState {
  revenusFoyer: number;
  tmi: number;
  parts: number;
  revenusLocatifsExistants: number;
  revenusLocatifsExistantsNature: ExistingRentalNature;
  revenusLocatifsExistantsRegime: ExistingRentalRegime;
  situation: string;
  age: number;
  ageConjoint: number;
  objectif: Objective;
  objectifSecondaire: SecondaryObjective;
  enfants: number;
  donationsAnterieuresInvestisseur: number;
  donationsAnterieuresConjoint: number;
  valeurBien: number;
  typeBien: string;
  etatBien: "ancien" | "neuf";
  travaux: number;
  mobilier: number;
  loyersMensuels: number;
  vacance: number;
  dureeDetention: number;
  horizon: DetentionHorizon;
  rentalMode: RentalMode;
  meubleClasse: "oui" | "non";
  chargesAnnuelles: number;
  credit: "oui" | "non";
  apport: number;
  montantEmprunte: number;
  tauxEmprunt: number;
  dureeCredit: number;
  achat: PurchaseSituation;
}

interface TaxDetail {
  regime: string;
  taxableIncome: number;
  ir: number;
  is: number;
  social: number;
  cotisations: number;
  distributionTax: number;
  totalTax: number;
  amortization: number;
  amortizationDeferred: number;
  microEligible: boolean;
  microLabel: string;
  warnings: string[];
}

interface StrategyDefinition {
  id: StructureId;
  title: string;
  family: string;
  profile: TaxProfile;
  summary: string;
  creationFees: number;
  accountingFees: number;
  minDelay: string;
  baseStrengths: string[];
  baseWeaknesses: string[];
}

interface StrategyResult {
  id: StructureId;
  title: string;
  family: string;
  profile: TaxProfile;
  summary: string;
  score: number;
  recommended: boolean;
  secondary: boolean;
  tax: TaxDetail;
  grossYield: number;
  netYield: number;
  annualRent: number;
  annualCharges: number;
  annualDebtService: number;
  monthlyPayment: number;
  firstYearInterest: number;
  creditCost: number;
  notaryFees: number;
  creationFees: number;
  accountingFees: number;
  totalProjectCost: number;
  annualCashFlow: number;
  annualCashInVehicle: number;
  perceivedCash: number;
  strengths: string[];
  weaknesses: string[];
  explanation: string;
  delay: string;
}

interface ProjectionRow {
  year: number;
  rent: number;
  tax: number;
  annualCashFlow: number;
  cumulativeTreasury: number;
  loanBalance: number;
  estimatedEquity: number;
}

interface NeedSummaryItem {
  title: string;
  text: string;
  detail: string;
}

interface FiscalStep {
  label: string;
  detail: string;
  value: string;
  rule: string;
  total?: boolean;
}

interface TransmissionStep {
  label: string;
  base: string;
  amount: number;
  rule: string;
  total?: boolean;
}

interface AmortizationBreakdown {
  notaryFees: number;
  amortizableNotaryFees: number;
  landExcluded: number;
  buildingBase: number;
  buildingAmortization: number;
  worksAmortization: number;
  furnitureAmortization: number;
  total: number;
}

interface SourceItem {
  title: string;
  text: string;
  url: string;
}

interface LegalBlock {
  title: string;
  items: string[];
}

interface TransmissionDonor {
  label: string;
  share: number;
  previousPerChild: number;
  age: number;
  bareOwnershipRate: number;
}

interface TransmissionCalculation {
  childrenCount: number;
  assetValue: number;
  debtDeducted: number;
  fullOwnershipValue: number;
  bareOwnershipValue: number;
  fullOwnershipTaxablePerChild: number;
  bareOwnershipTaxablePerChild: number;
  fullOwnershipTaxableTotal: number;
  bareOwnershipTaxableTotal: number;
  fullOwnershipDuties: number;
  bareOwnershipDuties: number;
  recommendedDuties: number;
  appliedAbatementPerChild: number;
  previousPerChild: number;
  donorSummary: string;
  abatementSummary: string;
  steps: TransmissionStep[];
}

const objectiveLabels: Record<Objective, string> = {
  revenus: "Générer des revenus immédiats",
  "reduction-ir": "Réduire l'imposition IR",
  capitalisation: "Capitaliser à long terme",
  transmission: "Optimiser la transmission familiale",
  retraite: "Préparer la retraite",
  "achat-revente": "Faire de l'achat / revente rapide",
  reinvestissement: "Réinvestissement des bénéfices",
};

const secondaryObjectiveLabels: Record<SecondaryObjective, string> = {
  aucun: "Aucun objectif secondaire",
  ...objectiveLabels,
};

const rentalModeLabels: Record<RentalMode, string> = {
  "nue-longue": "Location nue longue durée",
  "meublee-longue": "Location meublée longue durée",
  "meublee-courte": "Location courte durée",
  saisonniere: "Location saisonnière",
};

const purchaseLabels: Record<PurchaseSituation, string> = {
  seul: "Achat seul",
  marie: "Couple marié",
  pacs: "Couple PACS",
  fratrie: "Frère / sœur",
  "parents-enfants": "Parents / enfants",
  associes: "Associés sans lien familial",
};

const existingRentalNatureLabels: Record<ExistingRentalNature, string> = {
  foncier: "Revenus fonciers",
  lmnp: "Location meublée / LMNP",
};

const existingRentalRegimeLabels: Record<ExistingRentalRegime, string> = {
  micro: "Micro",
  reel: "Réel",
};

const detentionHorizonLabels: Record<DetentionHorizon, string> = {
  "moins-30": "Moins de 30 ans",
  "plus-30": "+30 ans",
};

const eligibleChargeItems = [
  "Taxe foncière, hors taxe d'enlèvement des ordures ménagères récupérable sur le locataire.",
  "Assurance propriétaire non occupant et assurance de l'immeuble.",
  "Charges de copropriété non récupérables et appels de fonds restant à la charge du bailleur.",
  "Frais de gestion locative, état des lieux, annonces, honoraires administratifs et logiciels dédiés.",
  "Entretien, petites réparations, maintenance, diagnostics et contrats obligatoires.",
  "Frais bancaires liés au compte du projet, hors remboursement du capital du crédit.",
  "Comptabilité si elle n'est pas déjà intégrée dans les frais estimés de la structure.",
];

const sarlLegalBlocks: LegalBlock[] = [
  {
    title: "Étapes de création d'une SARL immobilière",
    items: [
      "Rédiger les statuts : associés, capital, gérance, siège et objet de location meublée (Service-Public création SARL).",
      "Déposer le capital, signer les statuts et nommer le gérant (Code de commerce SARL).",
      "Publier l'annonce légale et déclarer les bénéficiaires effectifs (Service-Public annonce légale et bénéficiaires effectifs).",
      "Immatriculer la société sur le guichet unique, puis ouvrir le compte bancaire définitif (Guichet unique des formalités).",
    ],
  },
  {
    title: "Conditions à respecter pour la SARL de famille à l'IR",
    items: [
      "Associés uniquement en ligne directe, frères et sœurs, conjoints ou partenaires de PACS (CGI art. 239 bis AA).",
      "Option IR acceptée par tous les associés (CGI art. 239 bis AA).",
      "Activité commerciale : la location meublée est éligible (CGI art. 34 ; BOI-IS-CHAMP-20-20-10).",
      "Entrée d'un associé extérieur : fin du régime de famille à l'IR (CGI art. 239 bis AA).",
    ],
  },
  {
    title: "Points de vigilance et requalification fiscale",
    items: [
      "Garder une comptabilité complète : factures, mobilier, amortissements, banque et charges (CGI art. 39 ; BOI-BIC-CHG).",
      "Ne pas faire payer à la société des dépenses personnelles ou des loyers artificiels (LPF art. L64 ; CGI art. 39).",
      "Suivre les seuils LMNP/LMP chaque année, associé par associé (BOI-BIC-CHAMP-40-10).",
      "Formaliser les décisions importantes : achat, emprunt, travaux, cession de parts (Code de commerce SARL).",
      "Vérifier avant toute entrée d'associé, transformation ou passage à l'IS (CGI art. 239 bis AA ; BOI-IS-CHAMP-20-20-10).",
    ],
  },
];

const sources: SourceItem[] = [
  {
    title: "Création d'une société",
    text: "Statuts, dirigeant, annonce légale, bénéficiaires effectifs et immatriculation via le guichet unique.",
    url: "https://entreprendre.service-public.fr/vosdroits/F35934",
  },
  {
    title: "SARL de famille - CGI art. 239 bis AA",
    text: "Option pour le régime fiscal des sociétés de personnes sous conditions familiales et d'activité.",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006309269",
  },
  {
    title: "BOFiP - SARL à caractère familial",
    text: "Doctrine administrative sur l'option IR, les associés admis et l'éligibilité de la location meublée.",
    url: "https://bofip.impots.gouv.fr/bofip/4222-PGP.html/identifiant%3DBOI-IS-CHAMP-20-20-10-20180704",
  },
  {
    title: "BOFiP - Frais d'acquisition immobilisés",
    text: "Traitement des frais accessoires d'acquisition, dont les honoraires de notaire, dans le coût d'acquisition de l'immobilisation.",
    url: "https://bofip.impots.gouv.fr/bofip/1846-PGP.html/identifiant%3DBOI-BIC-CHG-20-20-10-20190109",
  },
  {
    title: "Donation - Barème ligne directe CGI art. 777",
    text: "Tarif progressif applicable aux donations entre parents et enfants, après abattement.",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000030061736/2026-05-05",
  },
  {
    title: "Donation - Abattement parent/enfant CGI art. 779",
    text: "Abattement de 100 000 € sur la part de chacun des enfants ou ascendants.",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000026292566/2026-02-21",
  },
  {
    title: "Donation - Rappel fiscal CGI art. 784",
    text: "Prise en compte des donations antérieures de moins de 15 ans pour les abattements et tranches.",
    url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000033809289",
  },
  {
    title: "Démembrement - CGI art. 669",
    text: "Barème fiscal usufruit / nue-propriété selon l'âge de l'usufruitier.",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006310173/2026-05-10",
  },
  {
    title: "Régimes d'imposition des locations meublées",
    text: "Seuils micro-BIC 2025/2026, LMNP/LMP, régime réel et amortissements.",
    url: "https://www.impots.gouv.fr/particulier/les-regimes-dimposition",
  },
  {
    title: "Locations meublées",
    text: "Qualification BIC, démarches, seuils LMP et CFE.",
    url: "https://www.impots.gouv.fr/particulier/les-locations-meublees",
  },
  {
    title: "Revenus fonciers et micro-foncier",
    text: "Seuil de 15 000 €, abattement forfaitaire de 30 % et option au réel.",
    url: "https://www.impots.gouv.fr/international-particulier/questions/je-loue-un-bien-non-meuble-puis-je-beneficier-du-regime-micro",
  },
  {
    title: "Prélèvements sociaux sur les revenus locatifs",
    text: "Application sur le revenu net sous régime micro ou réel.",
    url: "https://www.impots.gouv.fr/particulier/questions/je-donne-un-bien-en-location-dois-je-payer-des-prelevements-sociaux",
  },
  {
    title: "Impôt sur les sociétés",
    text: "Taux normal 25 % et taux réduit PME de 15 % jusqu'à 42 500 €.",
    url: "https://www.impots.gouv.fr/international-professionnel/impot-sur-les-societes",
  },
  {
    title: "BOFiP location meublée",
    text: "Caractère BIC de la location meublée et vigilance SCI à l'IR.",
    url: "https://bofip.impots.gouv.fr/bofip/3610-PGP.html/identifiant=BOI-BIC-CHAMP-40-20-20180207",
  },
];

const strategyDefinitions: StrategyDefinition[] = [
  {
    id: "nom-propre",
    title: "Achat en nom propre",
    family: "Détention directe",
    profile: "foncier",
    summary: "Solution simple et peu coûteuse, adaptée aux projets directs, surtout si la fiscalité reste modérée.",
    creationFees: 0,
    accountingFees: 0,
    minDelay: "Immédiat",
    baseStrengths: ["Aucune structure à créer.", "Lecture simple des revenus et de la revente.", "Très adapté à un achat seul."],
    baseWeaknesses: ["Fiscalité IR parfois lourde si TMI élevée.", "Transmission moins structurée.", "Peu d'effet de capitalisation sociétaire."],
  },
  {
    id: "sci-ir",
    title: "SCI à l'IR",
    family: "Transmission familiale",
    profile: "foncier",
    summary: "Structure civile lisible pour organiser la détention et la transmission, surtout en location nue.",
    creationFees: 1200,
    accountingFees: 700,
    minDelay: "2 à 4 semaines",
    baseStrengths: ["Parts sociales facilement transmissibles.", "Gouvernance familiale cadrée par les statuts.", "Compatible avec revenus fonciers en location nue."],
    baseWeaknesses: ["Peu adaptée à la location meublée habituelle.", "Imposition directe chez les associés.", "Gestion statutaire à prévoir."],
  },
  {
    id: "sci-is",
    title: "SCI à l'IS",
    family: "Capitalisation",
    profile: "is",
    summary: "Pertinente pour amortir l'immeuble, capitaliser les bénéfices et réinvestir dans une logique long terme.",
    creationFees: 1200,
    accountingFees: 700,
    minDelay: "3 à 5 semaines",
    baseStrengths: ["Amortissement comptable du bien.", "IS souvent plus doux que l'IR à TMI élevée.", "Bénéfices conservables pour réinvestir."],
    baseWeaknesses: ["Fiscalité de sortie à anticiper.", "Distribution taxée si l'investisseur veut percevoir les revenus.", "Comptabilité obligatoire."],
  },
  {
    id: "sarl-famille",
    title: "SARL de famille à l'IR",
    family: "Famille / meublé",
    profile: "bic",
    summary: "Outil familial pour faire du meublé au réel, avec amortissements, lorsque les associés sont membres de la famille.",
    creationFees: 1400,
    accountingFees: 700,
    minDelay: "3 à 5 semaines",
    baseStrengths: ["Adaptée aux parents/enfants ou fratries.", "Compatible location meublée et amortissements.", "Option IR intéressante en famille."],
    baseWeaknesses: ["Réservée à un cercle familial éligible.", "Formalités sociales et comptables plus lourdes.", "Moins adaptée à des associés sans lien familial."],
  },
  {
    id: "sarl-is",
    title: "SARL à l'IS",
    family: "Société commerciale",
    profile: "is",
    summary: "Structure stable pour une activité immobilière organisée avec conservation des bénéfices en société.",
    creationFees: 1400,
    accountingFees: 700,
    minDelay: "3 à 5 semaines",
    baseStrengths: ["Cadre adapté à une exploitation structurée.", "IS et amortissements.", "Gestion possible entre associés."],
    baseWeaknesses: ["Distribution taxée.", "Formalisme plus marqué.", "Sortie patrimoniale à préparer."],
  },
  {
    id: "sas",
    title: "SAS / SASU",
    family: "Société à l'IS",
    profile: "is",
    summary: "Souple pour des associés sans lien familial et des projets de réinvestissement, mais coûteuse pour un simple rendement locatif.",
    creationFees: 1600,
    accountingFees: 700,
    minDelay: "3 à 6 semaines",
    baseStrengths: ["Grande souplesse statutaire.", "Adaptée aux associés extérieurs.", "Réinvestissement en société facilité."],
    baseWeaknesses: ["Coûts fixes élevés.", "Peu optimale pour retirer les loyers personnellement.", "Fiscalité de distribution à intégrer."],
  },
  {
    id: "indivision",
    title: "Indivision",
    family: "Détention simple",
    profile: "foncier",
    summary: "Solution rapide pour acheter à plusieurs, mais fragile si le projet doit durer ou organiser une transmission.",
    creationFees: 0,
    accountingFees: 700,
    minDelay: "Immédiat",
    baseStrengths: ["Aucune société à créer.", "Simple pour une acquisition ponctuelle.", "Adaptée à une revente rapide."],
    baseWeaknesses: ["Décisions parfois bloquantes.", "Sortie d'un indivisaire à anticiper.", "Micro-BIC indisponible en meublé indivis."],
  },
];

const defaultForm: FormState = {
  revenusFoyer: 90000,
  tmi: 30,
  parts: 2,
  revenusLocatifsExistants: 0,
  revenusLocatifsExistantsNature: "foncier",
  revenusLocatifsExistantsRegime: "micro",
  situation: "marie",
  age: 42,
  ageConjoint: 40,
  objectif: "capitalisation",
  objectifSecondaire: "aucun",
  enfants: 2,
  donationsAnterieuresInvestisseur: 0,
  donationsAnterieuresConjoint: 0,
  valeurBien: 300000,
  typeBien: "appartement",
  etatBien: "ancien",
  travaux: 25000,
  mobilier: 10000,
  loyersMensuels: 1600,
  vacance: 5,
  dureeDetention: 12,
  horizon: "moins-30",
  rentalMode: "meublee-longue",
  meubleClasse: "non",
  chargesAnnuelles: 5200,
  credit: "oui",
  apport: 60000,
  montantEmprunte: 290000,
  tauxEmprunt: 3.7,
  dureeCredit: 20,
  achat: "seul",
};

const FORM_STORAGE_KEY = "patripro-real-estate-form";

const euro = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} €`;
const pct = (value: number) => `${value.toFixed(2).replace(".", ",")} %`;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const isFurnishedMode = (mode: RentalMode) => mode !== "nue-longue";
const isShortTermMode = (mode: RentalMode) => mode === "meublee-courte" || mode === "saisonniere";
const tmiRate = (form: FormState) => form.tmi / 100;
const existingRentalIncomeAnnual = (form: FormState) => Math.max(0, form.revenusLocatifsExistants) * 12;
const existingFoncierIncomeAnnual = (form: FormState) => form.revenusLocatifsExistantsNature === "foncier" ? existingRentalIncomeAnnual(form) : 0;
const existingFurnishedIncomeAnnual = (form: FormState) => form.revenusLocatifsExistantsNature === "lmnp" ? existingRentalIncomeAnnual(form) : 0;
const hasExistingRentalIncome = (form: FormState) => existingRentalIncomeAnnual(form) > 0;
const hasExistingRealRegime = (form: FormState, nature: ExistingRentalNature) => (
  hasExistingRentalIncome(form) &&
  form.revenusLocatifsExistantsNature === nature &&
  form.revenusLocatifsExistantsRegime === "reel"
);
const isCouplePurchase = (form: FormState) => form.achat === "marie" || form.achat === "pacs";
const isObjective = (value: unknown): value is Objective => typeof value === "string" && value in objectiveLabels;
const isSecondaryObjective = (value: unknown): value is SecondaryObjective => value === "aucun" || isObjective(value);
const rateLabel = (rate: number) => `${(rate * 100).toFixed(Number.isInteger(rate * 100) ? 0 : 1).replace(".", ",")} %`;

function activeObjectives(form: FormState): Objective[] {
  return form.objectifSecondaire !== "aucun" && form.objectifSecondaire !== form.objectif
    ? [form.objectif, form.objectifSecondaire]
    : [form.objectif];
}

function hasTransmissionObjective(form: FormState): boolean {
  return activeObjectives(form).includes("transmission");
}

function normalizeSecondaryObjective(value: unknown, primary: Objective): SecondaryObjective {
  if (!isSecondaryObjective(value) || value === primary) return "aucun";
  return value;
}

function normalizeDetentionHorizon(value: unknown, duration: number): DetentionHorizon {
  if (value === "moins-30" || value === "plus-30") return value;
  return duration >= 30 ? "plus-30" : "moins-30";
}

function normalizeDuration(value: unknown, horizon: DetentionHorizon): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return defaultForm.dureeDetention;
  if (horizon === "plus-30") return 30;
  return Math.max(1, Math.min(29, Math.round(parsed)));
}

function restoreStoredForm(value: unknown): FormState {
  if (!value || typeof value !== "object") return defaultForm;
  const stored = value as Partial<FormState>;
  const rawDuration = Number(stored.dureeDetention);
  const objectif = isObjective(stored.objectif) ? stored.objectif : defaultForm.objectif;
  const horizon = normalizeDetentionHorizon(stored.horizon, Number.isFinite(rawDuration) ? rawDuration : defaultForm.dureeDetention);
  return {
    ...defaultForm,
    ...stored,
    objectif,
    objectifSecondaire: normalizeSecondaryObjective(stored.objectifSecondaire, objectif),
    enfants: Math.max(1, Math.round(Number(stored.enfants) || defaultForm.enfants)),
    donationsAnterieuresInvestisseur: Math.max(0, Number(stored.donationsAnterieuresInvestisseur) || 0),
    donationsAnterieuresConjoint: Math.max(0, Number(stored.donationsAnterieuresConjoint) || 0),
    horizon,
    dureeDetention: normalizeDuration(stored.dureeDetention, horizon),
  };
}

function initialForm(): FormState {
  if (typeof window === "undefined") return defaultForm;
  try {
    const stored = window.localStorage.getItem(FORM_STORAGE_KEY);
    return stored ? restoreStoredForm(JSON.parse(stored)) : defaultForm;
  } catch {
    window.localStorage.removeItem(FORM_STORAGE_KEY);
    return defaultForm;
  }
}

const MICRO_FONCIER_THRESHOLD = 15000;
const MICRO_FONCIER_ABATEMENT = .30;
const MICRO_BIC_UNCLASSIFIED_THRESHOLD = 15000;
const MICRO_BIC_UNCLASSIFIED_ABATEMENT = .30;
const MICRO_BIC_FURNISHED_THRESHOLD = 77700;
const MICRO_BIC_FURNISHED_ABATEMENT = .50;
const SOCIAL_FONCIER_RATE = .172;
const SOCIAL_BIC_RATE = .186;
const LMP_RENT_THRESHOLD = 23000;
const PROFESSIONAL_SOCIAL_RATE = .35;
const IS_REDUCED_THRESHOLD = 42500;
const IS_REDUCED_RATE = .15;
const IS_STANDARD_RATE = .25;
const DISTRIBUTION_IR_RATE = .128;
const DISTRIBUTION_SOCIAL_RATE = .186;
const DISTRIBUTION_TOTAL_RATE = DISTRIBUTION_IR_RATE + DISTRIBUTION_SOCIAL_RATE;
const DIRECT_DONATION_ABATEMENT = 100000;
const DIRECT_DONATION_BRACKETS: [number, number][] = [
  [8072, .05],
  [12109, .10],
  [15932, .15],
  [552324, .20],
  [902838, .30],
  [1805677, .40],
  [Infinity, .45],
];

function taxMainLabel(tax: TaxDetail): string {
  return tax.is > 0 || tax.regime === "Impôt sur les sociétés" ? "IS estimé" : "IR estimé";
}

function taxMainAmount(tax: TaxDetail): number {
  return tax.is > 0 || tax.regime === "Impôt sur les sociétés" ? tax.is : tax.ir;
}

function taxTotalDetail(tax: TaxDetail): string {
  if (tax.regime === "Impôt sur les sociétés") {
    return tax.distributionTax > 0
      ? "IS + PFU et prélèvements sociaux indicatifs sur distribution"
      : "IS dû par la société, bénéfices supposés conservés";
  }
  return tax.cotisations > 0
    ? "IR + cotisations sociales estimées"
    : "IR + prélèvements sociaux estimés";
}

function directDonationDuties(base: number): number {
  if (base <= 0) return 0;
  let duties = 0;
  let previous = 0;
  for (const [threshold, rate] of DIRECT_DONATION_BRACKETS) {
    if (base > threshold) {
      duties += (threshold - previous) * rate;
      previous = threshold;
    } else {
      duties += (base - previous) * rate;
      break;
    }
  }
  return duties;
}

function bareOwnershipRate(age: number): number {
  if (age < 21) return .10;
  if (age < 31) return .20;
  if (age < 41) return .30;
  if (age < 51) return .40;
  if (age < 61) return .50;
  if (age < 71) return .60;
  if (age < 81) return .70;
  if (age < 91) return .80;
  return .90;
}

function dismembermentRates(age: number): { usufruct: number; bareOwnership: number } {
  const bareOwnership = bareOwnershipRate(age);
  return { usufruct: 1 - bareOwnership, bareOwnership };
}

function monthlyPayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const months = years * 12;
  const rate = annualRate / 100 / 12;
  if (rate === 0) return principal / months;
  return principal * rate / (1 - Math.pow(1 + rate, -months));
}

function firstYearInterest(principal: number, annualRate: number, years: number): number {
  const payment = monthlyPayment(principal, annualRate, years);
  const monthlyRate = annualRate / 100 / 12;
  let balance = principal;
  let interest = 0;
  for (let month = 0; month < 12 && balance > 0; month += 1) {
    const monthInterest = balance * monthlyRate;
    interest += monthInterest;
    balance = Math.max(0, balance - (payment - monthInterest));
  }
  return interest;
}

function remainingLoan(principal: number, annualRate: number, years: number, afterYears: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const payment = monthlyPayment(principal, annualRate, years);
  const monthlyRate = annualRate / 100 / 12;
  let balance = principal;
  const elapsed = Math.min(years * 12, Math.max(0, afterYears * 12));
  for (let month = 0; month < elapsed && balance > 0; month += 1) {
    const interest = balance * monthlyRate;
    balance = Math.max(0, balance - (payment - interest));
  }
  return balance;
}

function isTaxedAsLmp(form: FormState, annualRent: number): boolean {
  const totalFurnishedRent = annualRent + existingFurnishedIncomeAnnual(form);
  return isFurnishedMode(form.rentalMode) && totalFurnishedRent > LMP_RENT_THRESHOLD && totalFurnishedRent > form.revenusFoyer;
}

function microBicSettings(form: FormState): { threshold: number; abatement: number; label: string } {
  if (isShortTermMode(form.rentalMode) && form.meubleClasse === "non") {
    return { threshold: MICRO_BIC_UNCLASSIFIED_THRESHOLD, abatement: MICRO_BIC_UNCLASSIFIED_ABATEMENT, label: "Micro-BIC tourisme non classé" };
  }
  return { threshold: MICRO_BIC_FURNISHED_THRESHOLD, abatement: MICRO_BIC_FURNISHED_ABATEMENT, label: "Micro-BIC meublé" };
}

function calcIS(taxable: number): number {
  const base = Math.max(0, taxable);
  const reduced = Math.min(base, IS_REDUCED_THRESHOLD);
  return reduced * IS_REDUCED_RATE + Math.max(0, base - IS_REDUCED_THRESHOLD) * IS_STANDARD_RATE;
}

function amortizationBreakdown(form: FormState, notaryFees: number): AmortizationBreakdown {
  const landExcluded = form.valeurBien * .15;
  const amortizableNotaryFees = notaryFees * .85;
  const buildingBase = Math.max(0, form.valeurBien - landExcluded + amortizableNotaryFees);
  const buildingAmortization = buildingBase / 30;
  const worksAmortization = Math.max(0, form.travaux) / 15;
  const furnitureAmortization = isFurnishedMode(form.rentalMode) ? Math.max(0, form.mobilier) / 7 : 0;
  return {
    notaryFees,
    amortizableNotaryFees,
    landExcluded,
    buildingBase,
    buildingAmortization,
    worksAmortization,
    furnitureAmortization,
    total: buildingAmortization + worksAmortization + furnitureAmortization,
  };
}

function amortizationPotential(form: FormState, notaryFees: number): number {
  return amortizationBreakdown(form, notaryFees).total;
}

function commonNumbers(form: FormState) {
  const annualRent = form.loyersMensuels * 12 * (1 - clamp(form.vacance, 0, 100) / 100);
  const notaryFees = form.etatBien === "neuf" ? form.valeurBien * .025 : form.valeurBien * .075;
  const furnitureCost = isFurnishedMode(form.rentalMode) ? form.mobilier : 0;
  const borrowed = form.credit === "oui" ? Math.max(0, form.montantEmprunte) : 0;
  const payment = form.credit === "oui" ? monthlyPayment(borrowed, form.tauxEmprunt, form.dureeCredit) : 0;
  const annualDebtService = payment * 12;
  const firstInterest = form.credit === "oui" ? firstYearInterest(borrowed, form.tauxEmprunt, form.dureeCredit) : 0;
  const creditCost = form.credit === "oui" ? Math.max(0, payment * form.dureeCredit * 12 - borrowed) : 0;
  const totalProjectCost = form.valeurBien + form.travaux + furnitureCost + notaryFees;
  return { annualRent, notaryFees, borrowed, payment, annualDebtService, firstInterest, creditCost, totalProjectCost };
}

function bestFoncierTax(form: FormState, annualRent: number, firstInterest: number, accountingFees: number, forceReal = false): TaxDetail {
  const realTaxable = Math.max(0, annualRent - form.chargesAnnuelles - firstInterest - accountingFees);
  const totalFoncierIncome = annualRent + existingFoncierIncomeAnnual(form);
  const real: TaxDetail = {
    regime: "Revenus fonciers au réel",
    taxableIncome: realTaxable,
    ir: realTaxable * tmiRate(form),
    is: 0,
    social: realTaxable * SOCIAL_FONCIER_RATE,
    cotisations: 0,
    distributionTax: 0,
    totalTax: realTaxable * (tmiRate(form) + SOCIAL_FONCIER_RATE),
    amortization: 0,
    amortizationDeferred: 0,
    microEligible: totalFoncierIncome <= MICRO_FONCIER_THRESHOLD,
    microLabel: "Micro-foncier",
    warnings: [],
  };

  if (forceReal || totalFoncierIncome > MICRO_FONCIER_THRESHOLD) {
    if (!real.microEligible) real.warnings.push(`Micro-foncier indisponible au-delà de ${euro(MICRO_FONCIER_THRESHOLD)} de revenus fonciers bruts du foyer.`);
    return real;
  }

  const microTaxable = annualRent * (1 - MICRO_FONCIER_ABATEMENT);
  const micro: TaxDetail = {
    regime: "Micro-foncier",
    taxableIncome: microTaxable,
    ir: microTaxable * tmiRate(form),
    is: 0,
    social: microTaxable * SOCIAL_FONCIER_RATE,
    cotisations: 0,
    distributionTax: 0,
    totalTax: microTaxable * (tmiRate(form) + SOCIAL_FONCIER_RATE),
    amortization: 0,
    amortizationDeferred: 0,
    microEligible: true,
    microLabel: "Micro-foncier",
    warnings: [],
  };
  return micro.totalTax <= real.totalTax ? micro : real;
}

function bestBicTax(form: FormState, annualRent: number, firstInterest: number, accountingFees: number, notaryFees: number, forceReal = false): TaxDetail {
  const lmp = isTaxedAsLmp(form, annualRent);
  const amortizationPool = amortizationPotential(form, notaryFees);
  const beforeAmortization = Math.max(0, annualRent - form.chargesAnnuelles - firstInterest - accountingFees);
  const amortization = Math.min(beforeAmortization, amortizationPool);
  const taxable = Math.max(0, beforeAmortization - amortization);
  const professionalSocial = lmp || (isShortTermMode(form.rentalMode) && annualRent > LMP_RENT_THRESHOLD);
  const real: TaxDetail = {
    regime: lmp ? "LMP au réel" : "LMNP au réel",
    taxableIncome: taxable,
    ir: taxable * tmiRate(form),
    is: 0,
    social: professionalSocial ? 0 : taxable * SOCIAL_BIC_RATE,
    cotisations: professionalSocial ? taxable * PROFESSIONAL_SOCIAL_RATE : 0,
    distributionTax: 0,
    totalTax: taxable * tmiRate(form) + (professionalSocial ? taxable * PROFESSIONAL_SOCIAL_RATE : taxable * SOCIAL_BIC_RATE),
    amortization,
    amortizationDeferred: Math.max(0, amortizationPool - amortization),
    microEligible: false,
    microLabel: "Micro-BIC",
    warnings: professionalSocial ? ["Cotisations sociales estimées car le projet peut relever d'une activité meublée professionnelle ou courte durée significative."] : [],
  };

  const microSetting = microBicSettings(form);
  const totalFurnishedIncome = annualRent + existingFurnishedIncomeAnnual(form);
  const microEligible = totalFurnishedIncome <= microSetting.threshold;
  if (forceReal || !microEligible) {
    if (!microEligible) real.warnings.push(`${microSetting.label} indisponible au-delà de ${euro(microSetting.threshold)} de recettes.`);
    return real;
  }

  const microTaxable = annualRent * (1 - microSetting.abatement);
  const microProfessionalSocial = lmp || (isShortTermMode(form.rentalMode) && annualRent > LMP_RENT_THRESHOLD);
  const micro: TaxDetail = {
    regime: microSetting.label,
    taxableIncome: microTaxable,
    ir: microTaxable * tmiRate(form),
    is: 0,
    social: microProfessionalSocial ? 0 : microTaxable * SOCIAL_BIC_RATE,
    cotisations: microProfessionalSocial ? microTaxable * PROFESSIONAL_SOCIAL_RATE : 0,
    distributionTax: 0,
    totalTax: microTaxable * tmiRate(form) + (microProfessionalSocial ? microTaxable * PROFESSIONAL_SOCIAL_RATE : microTaxable * SOCIAL_BIC_RATE),
    amortization: 0,
    amortizationDeferred: 0,
    microEligible,
    microLabel: microSetting.label,
    warnings: microProfessionalSocial ? ["Cotisations sociales estimées sur le résultat micro imposable."] : [],
  };

  return micro.totalTax <= real.totalTax ? micro : real;
}

function isTax(form: FormState, annualRent: number, firstInterest: number, accountingFees: number, notaryFees: number, distribute: boolean): TaxDetail {
  const amortizationPool = amortizationPotential(form, notaryFees);
  const beforeAmortization = Math.max(0, annualRent - form.chargesAnnuelles - firstInterest - accountingFees);
  const amortization = Math.min(beforeAmortization, amortizationPool);
  const taxable = Math.max(0, beforeAmortization - amortization);
  const isAmount = calcIS(taxable);
  const distributableProfit = Math.max(0, taxable - isAmount);
  const distributionTax = distribute ? distributableProfit * DISTRIBUTION_TOTAL_RATE : 0;
  return {
    regime: "Impôt sur les sociétés",
    taxableIncome: taxable,
    ir: 0,
    is: isAmount,
    social: 0,
    cotisations: 0,
    distributionTax,
    totalTax: isAmount + distributionTax,
    amortization,
    amortizationDeferred: Math.max(0, amortizationPool - amortization),
    microEligible: false,
    microLabel: "Non applicable",
    warnings: distribute
      ? [`Fiscalité de distribution indicative de ${rateLabel(DISTRIBUTION_TOTAL_RATE)} appliquée sur le bénéfice distribuable après IS.`]
      : ["Les bénéfices sont supposés conservés dans la société pour capitaliser ou réinvestir."],
  };
}

function explainObjective(form: FormState, result: StrategyResult): string {
  if (form.objectif === "revenus") {
    return result.id === "sci-is" || result.id === "sarl-is" || result.id === "sas"
      ? "La société à l'IS protège la capitalisation, mais elle est moins naturelle si l'objectif prioritaire est de percevoir immédiatement les loyers."
      : "La structure laisse les flux plus proches du foyer fiscal, ce qui répond mieux à un besoin de revenus immédiats.";
  }
  if (form.objectif === "capitalisation" || form.objectif === "reinvestissement") {
    return result.profile === "is"
      ? "L'IS, les amortissements et la conservation des bénéfices créent une logique de capitalisation cohérente."
      : "La détention directe reste possible, mais elle capitalise moins bien si le résultat est fortement taxé à l'IR.";
  }
  return result.summary;
}

function objectiveScoreAdjustment(
  def: StrategyDefinition,
  form: FormState,
  tax: TaxDetail,
  objective: Objective,
  familyPurchase: boolean,
  furnished: boolean,
): number {
  let score = 0;

  if (objective === "revenus") {
    if (def.id === "nom-propre" || def.id === "indivision") score += 10;
    if (def.profile === "is") score -= 8;
  }
  if (objective === "reduction-ir") {
    if (tax.regime.includes("réel") && tax.amortization > 0) score += 12;
    if (!furnished && form.travaux > form.valeurBien * .08 && (def.id === "nom-propre" || def.id === "sci-ir")) score += 8;
  }
  if (objective === "capitalisation") {
    if (def.profile === "is") score += 14;
    if (def.id === "sci-is") score += 5;
  }
  if (objective === "transmission") {
    if (def.id === "sci-ir" || def.id === "sci-is") score += 17;
    if (def.id === "sarl-famille" && familyPurchase) score += 9;
    if (def.id === "indivision") score -= 10;
  }
  if (objective === "retraite") {
    if (def.id === "nom-propre" || def.id === "sci-ir" || def.id === "sci-is") score += 8;
    if (furnished && def.id === "sarl-famille") score += 6;
  }
  if (objective === "achat-revente") {
    if (def.id === "nom-propre" || def.id === "indivision") score += 15;
    if (def.profile === "is") score -= 12;
  }
  if (objective === "reinvestissement") {
    if (def.profile === "is") score += 16;
    if (def.id === "sas") score += 5;
  }

  return score;
}

function scoreStrategy(def: StrategyDefinition, form: FormState, tax: TaxDetail, annualCashFlow: number): number {
  let score = 55;
  const furnished = isFurnishedMode(form.rentalMode);
  const familyPurchase = form.achat === "fratrie" || form.achat === "parents-enfants" || form.achat === "marie" || form.achat === "pacs";
  const objectives = activeObjectives(form);

  if (annualCashFlow > 0) score += 6;
  if (tax.totalTax < form.loyersMensuels * 12 * .18) score += 5;
  if (tax.amortization > 0) score += 5;
  if (form.tmi >= 30 && (def.id === "nom-propre" || def.id === "sci-ir") && tax.taxableIncome > 0) score -= 8;
  if (form.tmi >= 41 && def.profile === "is") score += 7;

  score += objectiveScoreAdjustment(def, form, tax, form.objectif, familyPurchase, furnished);
  if (form.objectifSecondaire !== "aucun" && form.objectifSecondaire !== form.objectif) {
    score += objectiveScoreAdjustment(def, form, tax, form.objectifSecondaire, familyPurchase, furnished) * .45;
  }

  if (furnished && def.id === "sci-ir") score -= 24;
  if (!furnished && def.id === "sarl-famille") score -= 12;
  if (def.id === "sarl-famille" && !familyPurchase) score -= 22;
  if (def.id === "sas" && form.achat !== "associes" && !objectives.includes("reinvestissement")) score -= 8;
  if (def.id === "indivision" && form.horizon === "plus-30") score -= 10;

  return Math.round(clamp(score, 0, 100));
}

function evaluateStrategy(def: StrategyDefinition, form: FormState): StrategyResult {
  const common = commonNumbers(form);
  const annualRent = common.annualRent;
  const furnished = isFurnishedMode(form.rentalMode);
  const distributeIS = form.objectif === "revenus";
  const forceFoncierReal = hasExistingRealRegime(form, "foncier");
  const forceBicReal = hasExistingRealRegime(form, "lmnp");
  let tax: TaxDetail;

  if (def.profile === "is") {
    tax = isTax(form, annualRent, common.firstInterest, def.accountingFees, common.notaryFees, distributeIS);
  } else if (def.id === "sarl-famille" || (furnished && (def.id === "nom-propre" || def.id === "indivision"))) {
    tax = bestBicTax(form, annualRent, common.firstInterest, def.accountingFees, common.notaryFees, def.id === "indivision" || forceBicReal);
    if (def.id === "indivision" && furnished) {
      tax.warnings.push("En meublé détenu en indivision, le régime micro n'est pas retenu : simulation au réel.");
    }
    if (forceBicReal) {
      tax.warnings.push("Revenus LMNP existants au réel : le nouveau projet meublé est simulé au réel pour intégrer la logique fiscale déjà en place.");
    }
  } else {
    tax = bestFoncierTax(form, annualRent, common.firstInterest, def.accountingFees, forceFoncierReal);
    if (forceFoncierReal) {
      tax.warnings.push("Revenus fonciers existants au réel : le nouveau projet nu est simulé au réel, l'option pouvant concerner l'ensemble des revenus fonciers.");
    }
  }

  if (def.id === "sci-ir" && furnished) {
    tax.warnings.push("SCI à l'IR déconseillée en location meublée habituelle : risque d'assujettissement à l'IS.");
  }

  const annualCharges = form.chargesAnnuelles + def.accountingFees;
  const annualCashFlow = annualRent - annualCharges - common.annualDebtService - tax.totalTax;
  const operatingNet = annualRent - annualCharges - tax.totalTax;
  const totalProjectCost = common.totalProjectCost + def.creationFees;
  const grossYield = totalProjectCost > 0 ? annualRent / totalProjectCost * 100 : 0;
  const netYield = totalProjectCost > 0 ? operatingNet / totalProjectCost * 100 : 0;
  const score = scoreStrategy(def, form, tax, annualCashFlow);
  const annualCashInVehicle = def.profile === "is" ? Math.max(0, annualCashFlow) : 0;
  const perceivedCash = def.profile === "is" && form.objectif !== "revenus" ? 0 : annualCashFlow;

  const strengths = [...def.baseStrengths];
  const weaknesses = [...def.baseWeaknesses, ...tax.warnings];
  if (tax.amortization > 0) strengths.push(`Amortissements estimés : ${euro(tax.amortization)} la première année.`);
  if (tax.regime.includes("Micro")) strengths.push(`${tax.regime} retenu car il donne le meilleur résultat indicatif.`);
  if (isCouplePurchase(form) && (def.id === "sci-ir" || def.id === "sci-is" || def.id === "sarl-famille")) {
    const rates = dismembermentRates(form.ageConjoint);
    strengths.push(`Âge du conjoint/partenaire intégré pour un démembrement éventuel : usufruit ${Math.round(rates.usufruct * 100)} %, nue-propriété ${Math.round(rates.bareOwnership * 100)} %.`);
  }
  if (annualCashFlow < 0) weaknesses.push(`Effort d'épargne estimé : ${euro(Math.abs(annualCashFlow))} par an après crédit et fiscalité.`);

  const result: StrategyResult = {
    id: def.id,
    title: def.title,
    family: def.family,
    profile: def.profile,
    summary: def.summary,
    score,
    recommended: false,
    secondary: false,
    tax,
    grossYield,
    netYield,
    annualRent,
    annualCharges,
    annualDebtService: common.annualDebtService,
    monthlyPayment: common.payment,
    firstYearInterest: common.firstInterest,
    creditCost: common.creditCost,
    notaryFees: common.notaryFees,
    creationFees: def.creationFees,
    accountingFees: def.accountingFees,
    totalProjectCost,
    annualCashFlow,
    annualCashInVehicle,
    perceivedCash,
    strengths,
    weaknesses,
    explanation: def.summary,
    delay: def.minDelay,
  };

  result.explanation = explainObjective(form, result);
  return result;
}

function computeResults(form: FormState): StrategyResult[] {
  const sorted = strategyDefinitions
    .map(def => evaluateStrategy(def, form))
    .sort((a, b) => b.score - a.score);
  return sorted.map((strategy, index) => ({
    ...strategy,
    recommended: index === 0,
    secondary: index === 1,
  }));
}

function isRelevantForObjective(strategy: StrategyResult, form: FormState, objective: Objective): boolean {
  const familyPurchase = form.achat === "fratrie" || form.achat === "parents-enfants" || form.achat === "marie" || form.achat === "pacs";
  switch (objective) {
    case "revenus":
      return strategy.id === "nom-propre" || strategy.id === "indivision" || strategy.id === "sarl-famille";
    case "reduction-ir":
      return strategy.tax.regime.includes("réel") || strategy.id === "sci-ir" || strategy.id === "nom-propre";
    case "capitalisation":
      return strategy.id === "sci-is" || strategy.id === "sarl-is" || strategy.id === "sas";
    case "transmission":
      return strategy.id === "sci-ir" || strategy.id === "sci-is" || (familyPurchase && strategy.id === "sarl-famille");
    case "retraite":
      return strategy.id === "nom-propre" || strategy.id === "sci-ir" || strategy.id === "sci-is" || strategy.id === "sarl-famille";
    case "achat-revente":
      return strategy.id === "nom-propre" || strategy.id === "indivision" || strategy.id === "sci-ir";
    case "reinvestissement":
      return strategy.id === "sci-is" || strategy.id === "sarl-is" || strategy.id === "sas";
  }
}

function strategiesForObjective(results: StrategyResult[], form: FormState): StrategyResult[] {
  const objectives = activeObjectives(form);
  const filtered = results.filter(strategy => objectives.some(objective => isRelevantForObjective(strategy, form, objective)));
  const shortlist = (filtered.length > 0 ? filtered : results).slice(0, 3);
  return shortlist.map((strategy, index) => ({
    ...strategy,
    recommended: index === 0,
    secondary: index === 1,
  }));
}

function projectionTaxRetainedInProject(strategy: StrategyResult): number {
  return Math.max(0, strategy.tax.totalTax - strategy.tax.distributionTax);
}

function projectionFor(form: FormState, strategy: StrategyResult): ProjectionRow[] {
  const years = form.horizon === "plus-30" ? 30 : Math.max(1, Math.min(29, form.dureeDetention));
  const rows: ProjectionRow[] = [];
  let cumulativeCash = 0;
  const rent = strategy.annualRent;
  const projectedTax = projectionTaxRetainedInProject(strategy);
  for (let year = 1; year <= years; year += 1) {
    const valueFactor = Math.pow(1.01, year);
    const debt = year <= form.dureeCredit ? strategy.annualDebtService : 0;
    const annualCashFlow = rent - strategy.annualCharges - debt - projectedTax;
    cumulativeCash += annualCashFlow;
    const loanBalance = remainingLoan(form.credit === "oui" ? form.montantEmprunte : 0, form.tauxEmprunt, form.dureeCredit, year);
    const estimatedEquity = form.valeurBien * valueFactor - loanBalance + cumulativeCash;
    rows.push({ year, rent, tax: projectedTax, annualCashFlow, cumulativeTreasury: cumulativeCash, loanBalance, estimatedEquity });
  }
  return rows;
}

function microAbatementRate(tax: TaxDetail): number | null {
  if (tax.regime === "Micro-foncier") return MICRO_FONCIER_ABATEMENT;
  if (tax.regime === "Micro-BIC tourisme non classé") return MICRO_BIC_UNCLASSIFIED_ABATEMENT;
  if (tax.regime === "Micro-BIC meublé") return MICRO_BIC_FURNISHED_ABATEMENT;
  return null;
}

function fiscalSteps(form: FormState, strategy: StrategyResult): FiscalStep[] {
  const theoreticalRent = form.loyersMensuels * 12;
  const vacancyAmount = theoreticalRent - strategy.annualRent;
  const baseBeforeAmortization = Math.max(0, strategy.annualRent - strategy.annualCharges - strategy.firstYearInterest);
  const amortizationDetail = amortizationBreakdown(form, strategy.notaryFees);
  const socialAmount = strategy.tax.social + strategy.tax.cotisations;
  const microAbatement = microAbatementRate(strategy.tax);
  const resultStepDetail = microAbatement === null
    ? `${euro(strategy.annualRent)} - ${euro(strategy.annualCharges)} - ${euro(strategy.firstYearInterest)} - ${euro(strategy.tax.amortization)} = ${euro(strategy.tax.taxableIncome)}. Régime : ${strategy.tax.regime}.`
    : `${euro(strategy.annualRent)} - abattement forfaitaire ${rateLabel(microAbatement)} (${euro(strategy.annualRent * microAbatement)}) = ${euro(strategy.tax.taxableIncome)}. Les charges réelles ne sont pas déduites en régime micro.`;
  const relevantExistingIncome = isFurnishedMode(form.rentalMode) ? existingFurnishedIncomeAnnual(form) : existingFoncierIncomeAnnual(form);
  const thresholdFamily = isFurnishedMode(form.rentalMode) ? "meublée/BIC" : "foncière";
  const steps: FiscalStep[] = [
    {
      label: "1. Loyers bruts encaissés",
      detail: `${euro(form.loyersMensuels)} x 12 = ${euro(theoreticalRent)} ; vacance ${form.vacance} % = -${euro(vacancyAmount)}.`,
      value: euro(strategy.annualRent),
      rule: "Les loyers retenus correspondent aux loyers réellement attendus après la vacance locative saisie.",
    },
    {
      label: "2. Charges décaissées",
      detail: `${euro(form.chargesAnnuelles)} de charges saisies + ${euro(strategy.accountingFees)} de frais comptables estimés.`,
      value: euro(strategy.annualCharges),
      rule: "Les charges courantes et frais de gestion/comptabilité réduisent la trésorerie et, selon le régime, le résultat fiscal.",
    },
    {
      label: "3. Intérêts d'emprunt déductibles",
      detail: form.credit === "oui"
        ? `${euro(form.montantEmprunte)} empruntés à ${form.tauxEmprunt} % sur ${form.dureeCredit} ans : intérêts année 1 estimés. Le capital remboursé n'est pas déductible fiscalement.`
        : "Aucun crédit saisi : pas d'intérêts déductibles.",
      value: euro(strategy.firstYearInterest),
      rule: "Les intérêts d'emprunt sont déductibles lorsque le régime le permet ; le remboursement du capital reste une sortie de trésorerie non déductible.",
    },
  ];

  if (hasExistingRentalIncome(form)) {
    steps.push({
      label: "1 bis. Revenus existants pour seuils",
      detail: strategy.tax.regime === "Impôt sur les sociétés"
        ? `${existingRentalNatureLabels[form.revenusLocatifsExistantsNature]} existants : ${euro(existingRentalIncomeAnnual(form))}/an au régime ${existingRentalRegimeLabels[form.revenusLocatifsExistantsRegime].toLowerCase()}. La fiscalité affichée porte ici sur la société à l'IS ; ces revenus servent surtout à lire la situation globale du foyer.`
        : `${euro(strategy.annualRent)} de nouveau projet + ${euro(relevantExistingIncome)} de revenus existants de même catégorie ${thresholdFamily} = ${euro(strategy.annualRent + relevantExistingIncome)} testés pour les seuils.`,
      value: strategy.tax.regime === "Impôt sur les sociétés" ? euro(existingRentalIncomeAnnual(form)) : euro(relevantExistingIncome),
      rule: "Les seuils micro et LMP s'apprécient par catégorie fiscale : foncier avec foncier, meublé/BIC avec meublé/BIC.",
    });
  }

  if (strategy.tax.amortization > 0) {
    const amortizationFormula = `Base avant amortissements : ${euro(baseBeforeAmortization)}. Frais de notaire estimés : ${euro(amortizationDetail.notaryFees)}, dont ${euro(amortizationDetail.amortizableNotaryFees)} intégrés à la base amortissable après exclusion indicative de la part terrain. Amortissement théorique : immeuble ${euro(amortizationDetail.buildingAmortization)} + travaux ${euro(amortizationDetail.worksAmortization)} + mobilier ${euro(amortizationDetail.furnitureAmortization)} = ${euro(amortizationDetail.total)}.`;
    steps.push({
      label: "4. Amortissements fiscaux ou comptables",
      detail: strategy.tax.amortizationDeferred > 0
        ? `${amortizationFormula} Amortissements utilisés : ${euro(strategy.tax.amortization)}. Reliquat théorique non utilisé : ${euro(strategy.tax.amortizationDeferred)}.`
        : `${amortizationFormula} Amortissements utilisés : ${euro(strategy.tax.amortization)}.`,
      value: euro(strategy.tax.amortization),
      rule: "L'amortissement est une charge comptable non décaissée : les frais d'acquisition immobilisés suivent la base amortissable du bien, hors quote-part terrain.",
    });
  } else {
    steps.push({
      label: "4. Amortissements",
      detail: "Aucun amortissement n'est retenu pour ce régime dans la simulation.",
      value: euro(0),
      rule: "Les régimes fonciers ou forfaitaires ne permettent pas de déduire un amortissement du bien dans cette simulation.",
    });
  }

  steps.push({
    label: "5. Résultat imposable",
    detail: resultStepDetail,
    value: euro(strategy.tax.taxableIncome),
    rule: "Cette base sert au calcul de l'IR, de l'IS ou du régime forfaitaire selon la stratégie sélectionnée.",
  });

  if (strategy.tax.regime === "Impôt sur les sociétés") {
    steps.push({
      label: "6. IS estimé",
      detail: `${euro(strategy.tax.taxableIncome)} x ${rateLabel(IS_REDUCED_RATE)} jusqu'à ${euro(IS_REDUCED_THRESHOLD)}, puis ${rateLabel(IS_STANDARD_RATE)} au-delà. Si la base est nulle grâce aux amortissements, l'IS ressort à 0 €.`,
      value: euro(strategy.tax.is),
      rule: "L'impôt est calculé au niveau de la société ; l'associé n'est imposé personnellement qu'en cas de distribution.",
    });
  } else {
    steps.push({
      label: "6. IR estimé",
      detail: `${euro(strategy.tax.taxableIncome)} x TMI ${form.tmi} % = ${euro(strategy.tax.ir)}.`,
      value: euro(strategy.tax.ir),
      rule: "Le résultat est imposé directement au foyer fiscal lorsque la structure relève de l'IR.",
    });
  }

  steps.push({
    label: "7. Prélèvements ou cotisations sociales",
    detail: strategy.tax.regime === "Impôt sur les sociétés"
      ? "Aucun prélèvement social personnel n'est retenu tant que le résultat reste dans la société et n'est pas distribué."
      : strategy.tax.cotisations > 0
        ? `${euro(strategy.tax.taxableIncome)} x ${rateLabel(PROFESSIONAL_SOCIAL_RATE)} de cotisations sociales estimées = ${euro(strategy.tax.cotisations)}.`
        : `${euro(strategy.tax.taxableIncome)} x ${rateLabel(strategy.tax.regime.includes("foncier") || strategy.tax.regime.includes("fonciers") ? SOCIAL_FONCIER_RATE : SOCIAL_BIC_RATE)} de prélèvements sociaux estimés = ${euro(strategy.tax.social)}.`,
    value: euro(socialAmount),
    rule: strategy.tax.cotisations > 0
      ? "Une activité relevant du LMP ou d'une logique professionnelle peut entraîner des cotisations sociales."
      : "Les revenus immobiliers imposés au foyer supportent en principe les prélèvements sociaux lorsque la base est positive.",
  });

  if (strategy.tax.distributionTax > 0) {
    const distributionBase = Math.max(0, strategy.tax.taxableIncome - strategy.tax.is);
    steps.push({
      label: "8. Fiscalité sur distribution",
      detail: `${euro(distributionBase)} de bénéfice distribuable après IS x ${rateLabel(DISTRIBUTION_TOTAL_RATE)} = ${euro(strategy.tax.distributionTax)}. Hypothèse uniquement si distribution au foyer.`,
      value: euro(strategy.tax.distributionTax),
      rule: "En société à l'IS, la fiscalité personnelle s'ajoute seulement si les bénéfices sont distribués.",
    });
  }

  steps.push({
    label: `${strategy.tax.distributionTax > 0 ? "9" : "8"}. Charge fiscale totale estimée`,
    detail: `${euro(strategy.tax.ir)} d'IR + ${euro(strategy.tax.is)} d'IS + ${euro(socialAmount)} de prélèvements/cotisations + ${euro(strategy.tax.distributionTax)} de fiscalité sur distribution = ${euro(strategy.tax.totalTax)}. ${taxTotalDetail(strategy.tax)}.`,
    value: euro(strategy.tax.totalTax),
    rule: "Total de l'impôt et des contributions sociales estimés pour la première année.",
    total: true,
  });

  steps.push({
    label: `${strategy.tax.distributionTax > 0 ? "10" : "9"}. Trésorerie réelle`,
    detail: `${euro(strategy.annualRent)} - ${euro(strategy.annualCharges)} - ${euro(strategy.annualDebtService)} de crédit - ${euro(strategy.tax.totalTax)} de fiscalité = ${euro(strategy.annualCashFlow)}. Les amortissements sont exclus car ils ne sont pas une sortie de trésorerie.`,
    value: euro(strategy.annualCashFlow),
    rule: "La trésorerie réelle mesure le flux disponible après dépenses, crédit et fiscalité ; elle ne doit pas être confondue avec le résultat imposable.",
    total: true,
  });

  return steps;
}

function isEntityStrategy(id: StructureId): boolean {
  return id === "sci-ir" || id === "sci-is" || id === "sarl-famille" || id === "sarl-is" || id === "sas";
}

function transmissionDonors(form: FormState): TransmissionDonor[] {
  if (isCouplePurchase(form)) {
    return [
      {
        label: "Investisseur",
        share: .5,
        previousPerChild: form.donationsAnterieuresInvestisseur,
        age: form.age,
        bareOwnershipRate: bareOwnershipRate(form.age),
      },
      {
        label: "Conjoint / partenaire",
        share: .5,
        previousPerChild: form.donationsAnterieuresConjoint,
        age: form.ageConjoint,
        bareOwnershipRate: bareOwnershipRate(form.ageConjoint),
      },
    ];
  }

  return [{
    label: "Investisseur",
    share: 1,
    previousPerChild: form.donationsAnterieuresInvestisseur,
    age: form.age,
    bareOwnershipRate: bareOwnershipRate(form.age),
  }];
}

function donationDutyCalculation(
  childrenCount: number,
  donors: TransmissionDonor[],
  currentValue: (donor: TransmissionDonor) => number,
) {
  let appliedAbatementPerChild = 0;
  let taxablePerChild = 0;
  let dutiesPerChild = 0;
  let previousPerChild = 0;
  const previousParts: string[] = [];
  const abatementParts: string[] = [];

  donors.filter(donor => donor.share > 0).forEach(donor => {
    const prior = Math.max(0, donor.previousPerChild);
    const receivedNow = currentValue(donor) / childrenCount;
    const remainingAbatement = Math.max(0, DIRECT_DONATION_ABATEMENT - prior);
    const appliedAbatement = Math.min(receivedNow, remainingAbatement);
    const currentTaxable = Math.max(0, receivedNow - remainingAbatement);
    const priorTaxable = Math.max(0, prior - DIRECT_DONATION_ABATEMENT);

    appliedAbatementPerChild += appliedAbatement;
    taxablePerChild += currentTaxable;
    dutiesPerChild += directDonationDuties(priorTaxable + currentTaxable) - directDonationDuties(priorTaxable);
    previousPerChild += prior;
    previousParts.push(`${donor.label} : ${euro(prior)}`);
    abatementParts.push(`${donor.label} : ${euro(appliedAbatement)} appliqués sur ${euro(remainingAbatement)} disponibles`);
  });

  return {
    appliedAbatementPerChild,
    taxablePerChild,
    taxableTotal: taxablePerChild * childrenCount,
    dutiesTotal: dutiesPerChild * childrenCount,
    previousPerChild,
    previousSummary: previousParts.join(" ; "),
    abatementSummary: abatementParts.join(" ; "),
  };
}

function transmissionCalculation(form: FormState, strategy: StrategyResult): TransmissionCalculation {
  const childrenCount = Math.max(1, Math.round(form.enfants));
  const furnitureValue = isFurnishedMode(form.rentalMode) ? Math.max(0, form.mobilier) : 0;
  const assetValue = Math.max(0, form.valeurBien + form.travaux + furnitureValue);
  const debtDeducted = isEntityStrategy(strategy.id) && form.credit === "oui"
    ? Math.min(assetValue, Math.max(0, form.montantEmprunte))
    : 0;
  const fullOwnershipValue = Math.max(0, assetValue - debtDeducted);
  const donors = transmissionDonors(form);
  const donorSummary = donors
    .map(donor => `${donor.label} : ${Math.round(donor.share * 100)} % x nue-propriété ${Math.round(donor.bareOwnershipRate * 100)} % à ${donor.age} ans`)
    .join(" ; ");

  const fullOwnership = donationDutyCalculation(childrenCount, donors, donor => fullOwnershipValue * donor.share);
  const bareOwnership = donationDutyCalculation(childrenCount, donors, donor => fullOwnershipValue * donor.share * donor.bareOwnershipRate);
  const bareOwnershipValue = donors.reduce((total, donor) => total + fullOwnershipValue * donor.share * donor.bareOwnershipRate, 0);

  const steps: TransmissionStep[] = [
    {
      label: "1. Valeur du projet transmis",
      base: `${euro(form.valeurBien)} de bien + ${euro(form.travaux)} de travaux + ${euro(furnitureValue)} de mobilier retenu`,
      amount: assetValue,
      rule: "Valeur patrimoniale indicative avant éventuelle dette portée par une société.",
    },
    {
      label: "2. Base économique retenue",
      base: debtDeducted > 0
        ? `${euro(assetValue)} - ${euro(debtDeducted)} de dette retenue car la stratégie active porte sur une société`
        : "Aucune dette déduite dans cette hypothèse ; en détention directe, la valeur immobilière reste la base de lecture.",
      amount: fullOwnershipValue,
      rule: "Pour des parts de société immobilière, la dette peut réduire l'actif net transmis ; à confirmer avec l'acte et la valorisation.",
    },
    {
      label: "3. Valorisation de la nue-propriété",
      base: donorSummary,
      amount: bareOwnershipValue,
      rule: "La nue-propriété est déterminée selon l'âge de l'usufruitier qui conserve l'usufruit (CGI art. 669).",
    },
    {
      label: "4. Part transmise par enfant",
      base: `${euro(bareOwnershipValue)} / ${childrenCount} enfant(s)`,
      amount: bareOwnershipValue / childrenCount,
      rule: "Répartition de la nue-propriété avant abattements.",
    },
    {
      label: "5. Donations antérieures",
      base: `${bareOwnership.previousSummary} par enfant`,
      amount: bareOwnership.previousPerChild,
      rule: "Les donations de moins de 15 ans consomment les abattements et les tranches déjà utilisées (CGI art. 784).",
    },
    {
      label: "6. Abattements disponibles",
      base: bareOwnership.abatementSummary,
      amount: bareOwnership.appliedAbatementPerChild,
      rule: "Abattement de 100 000 € par parent et par enfant, diminué des donations antérieures (CGI art. 779).",
    },
    {
      label: "7. Base taxable par enfant",
      base: "Valeur reçue par enfant - abattements disponibles",
      amount: bareOwnership.taxablePerChild,
      rule: "Base soumise au barème progressif des donations.",
    },
    {
      label: "8. Base taxable totale",
      base: `${euro(bareOwnership.taxablePerChild)} x ${childrenCount} enfant(s)`,
      amount: bareOwnership.taxableTotal,
      rule: "Base taxable totale de la transmission démembrée simulée.",
    },
    {
      label: "9. Droits de transmission estimés",
      base: "Application du barème ligne directe par donateur et par enfant",
      amount: bareOwnership.dutiesTotal,
      rule: "Droits dus sur la nouvelle donation selon le barème de l'article 777 du CGI.",
      total: true,
    },
  ];

  return {
    childrenCount,
    assetValue,
    debtDeducted,
    fullOwnershipValue,
    bareOwnershipValue,
    fullOwnershipTaxablePerChild: fullOwnership.taxablePerChild,
    bareOwnershipTaxablePerChild: bareOwnership.taxablePerChild,
    fullOwnershipTaxableTotal: fullOwnership.taxableTotal,
    bareOwnershipTaxableTotal: bareOwnership.taxableTotal,
    fullOwnershipDuties: fullOwnership.dutiesTotal,
    bareOwnershipDuties: bareOwnership.dutiesTotal,
    recommendedDuties: bareOwnership.dutiesTotal,
    appliedAbatementPerChild: bareOwnership.appliedAbatementPerChild,
    previousPerChild: bareOwnership.previousPerChild,
    donorSummary,
    abatementSummary: bareOwnership.abatementSummary,
    steps,
  };
}

function objectiveNeedText(form: FormState): string {
  switch (form.objectif) {
    case "revenus":
      return "Le besoin prioritaire est de dégager des revenus disponibles rapidement, avec une fiscalité lisible et un effort d'épargne maîtrisé.";
    case "reduction-ir":
      return "Le dossier doit rechercher les leviers qui diminuent le résultat imposable : charges, intérêts, travaux ou amortissements selon le mode de location.";
    case "capitalisation":
      return "Le besoin principal est de laisser le projet s'autofinancer et de construire du patrimoine sur une durée longue.";
    case "transmission":
      return "Le projet doit faciliter la détention dans le temps, l'entrée progressive des proches et, si nécessaire, une transmission démembrée.";
    case "retraite":
      return "Le besoin est de préparer un revenu futur stable, avec une charge de crédit compatible avec l'horizon de retraite.";
    case "achat-revente":
      return "Le besoin principal est la souplesse de sortie : limiter les coûts fixes, conserver une revente simple et éviter une structure trop lourde.";
    case "reinvestissement":
      return "Le besoin est de conserver les bénéfices dans un véhicule capable de financer d'autres opérations immobilières.";
  }
}

function buildNeedsSummary(form: FormState): NeedSummaryItem[] {
  const common = commonNumbers(form);
  const furnished = isFurnishedMode(form.rentalMode);
  const lmpAttention = isTaxedAsLmp(form, common.annualRent);
  const relevantExistingIncome = furnished ? existingFurnishedIncomeAnnual(form) : existingFoncierIncomeAnnual(form);
  const totalIncomeForThreshold = common.annualRent + relevantExistingIncome;
  const existingRentalText = hasExistingRentalIncome(form)
    ? `${existingRentalNatureLabels[form.revenusLocatifsExistantsNature]} au régime ${existingRentalRegimeLabels[form.revenusLocatifsExistantsRegime].toLowerCase()} : ${euro(existingRentalIncomeAnnual(form))}/an.`
    : "Aucun revenu locatif existant renseigné.";
  const items: NeedSummaryItem[] = [
    {
      title: "Besoin patrimonial principal",
      text: objectiveNeedText(form),
      detail: `Objectif principal : ${objectiveLabels[form.objectif]}. Objectif secondaire : ${secondaryObjectiveLabels[form.objectifSecondaire]}.`,
    },
    {
      title: "Mode d'exploitation locative",
      text: furnished
        ? "Le projet est orienté vers une location meublée : il faut comparer micro-BIC, réel, LMNP/LMP et l'effet des amortissements."
        : "Le projet est orienté vers une location nue : il faut comparer micro-foncier et régime réel selon les charges et les travaux.",
      detail: rentalModeLabels[form.rentalMode],
    },
    {
      title: "Fiscalité à surveiller",
      text: furnished
        ? lmpAttention
          ? "Les recettes meublées peuvent faire basculer le dossier vers une logique LMP ou sociale : ce point doit être qualifié avant décision."
          : "Le seuil micro-BIC et le niveau d'amortissements sont les deux points fiscaux structurants du dossier."
        : "Le niveau de TMI et le seuil micro-foncier déterminent l'intérêt d'une imposition simplifiée ou au réel.",
      detail: furnished
        ? `Recettes meublées testées : ${euro(common.annualRent)} de nouveau projet + ${euro(relevantExistingIncome)} existants = ${euro(totalIncomeForThreshold)}. ${existingRentalText}`
        : `Revenus fonciers testés : ${euro(common.annualRent)} de nouveau projet + ${euro(relevantExistingIncome)} existants = ${euro(totalIncomeForThreshold)}. ${existingRentalText}`,
    },
    {
      title: "Financement et effort d'épargne",
      text: form.credit === "oui"
        ? "Le crédit crée un effet de levier, mais le besoin réel dépend de la capacité à absorber le cash-flow avant fiscalité."
        : "Le projet est financé sans crédit : la priorité est de mesurer le rendement net et l'immobilisation de capital.",
      detail: form.credit === "oui"
        ? "Les mensualités, le coût du crédit et le cash-flow sont repris dans la lecture chiffrée."
        : "L'absence de dette recentre l'analyse sur le rendement et l'immobilisation du capital.",
    },
    {
      title: "Détention et gouvernance",
      text: form.achat === "seul"
        ? "L'achat seul privilégie la simplicité, mais l'organisation future de la transmission doit être anticipée si l'horizon est long."
        : "L'achat à plusieurs impose de clarifier les pouvoirs, les sorties, le financement et la répartition des flux avant l'acquisition.",
      detail: `Situation d'achat : ${purchaseLabels[form.achat]}.`,
    },
    {
      title: "Horizon de détention",
      text: form.horizon === "plus-30"
        ? "Un horizon supérieur à 30 ans permet de privilégier la capitalisation, la transmission et la gouvernance long terme."
        : "Un horizon inférieur à 30 ans nécessite un équilibre entre fiscalité annuelle, coûts de structure, financement et simplicité de sortie.",
      detail: form.horizon === "plus-30"
        ? "Durée renseignée : +30 ans. La projection reste limitée à 30 ans pour garder un tableau lisible."
        : `Durée renseignée : ${form.dureeDetention} an(s).`,
    },
  ];

  if (isCouplePurchase(form)) {
    const rates = dismembermentRates(form.ageConjoint);
    items.push({
      title: "Démembrement à anticiper",
      text: "Le conjoint ou partenaire est identifié : son âge doit être conservé pour valoriser usufruit et nue-propriété si une transmission démembrée est envisagée.",
      detail: `Âge conjoint/partenaire : ${form.ageConjoint} ans ; usufruit ${Math.round(rates.usufruct * 100)} %, nue-propriété ${Math.round(rates.bareOwnership * 100)} %.`,
    });
  }

  return items;
}

function Seg({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className={css.seg}>
      {options.map(option => (
        <button
          type="button"
          key={option.value}
          className={`${css.segBtn} ${value === option.value ? css.segBtnOn : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function TaxLine({ label, detail, value }: { label: string; detail: string; value: string }) {
  return (
    <div className={css.taxLine}>
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      <b>{value}</b>
    </div>
  );
}

function LegalItemText({ text }: { text: string }) {
  const match = text.match(/^(.*?)(\s*\((?:CGI|BOI|LPF|Code de commerce|Service-Public|Guichet unique)[^)]+\)\.?)$/);
  if (!match) return text;

  return (
    <>
      {match[1]}
      <strong className={css.legalRef}>{match[2].trim()}</strong>
    </>
  );
}

export default function RealEstateSimulator() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [hasRun, setHasRun] = useState(false);
  const [activeTab, setActiveTab] = useState<ResultTab>("synthese");
  const [chargesHelpOpen, setChargesHelpOpen] = useState(false);
  const results = useMemo(() => computeResults(form), [form]);
  const objectiveStrategies = useMemo(() => strategiesForObjective(results, form), [results, form]);
  const [selectedId, setSelectedId] = useState<StructureId>("sci-is");
  const recommended = objectiveStrategies[0];
  const selected = objectiveStrategies.find(result => result.id === selectedId) ?? recommended;
  const projection = projectionFor(form, selected);
  const partnerInProject = isCouplePurchase(form);
  const transmissionObjective = hasTransmissionObjective(form);
  const transmission = transmissionCalculation(form, selected);
  const partnerDismembermentRates = dismembermentRates(form.ageConjoint);
  const projectNumbers = commonNumbers(form);
  const totalAcquisition = projectNumbers.totalProjectCost;
  const projectGrossYield = totalAcquisition > 0 ? projectNumbers.annualRent / totalAcquisition * 100 : 0;
  const preTaxCashFlow = projectNumbers.annualRent - form.chargesAnnuelles - projectNumbers.annualDebtService;
  const projectIsFurnished = isFurnishedMode(form.rentalMode);
  const existingIncomeAnnual = existingRentalIncomeAnnual(form);
  const relevantExistingIncomeAnnual = projectIsFurnished ? existingFurnishedIncomeAnnual(form) : existingFoncierIncomeAnnual(form);
  const needsSummary = buildNeedsSummary(form);
  const selectedFiscalSteps = fiscalSteps(form, selected);
  const visibleActiveTab: ResultTab = activeTab === "transmission" && !transmissionObjective ? "synthese" : activeTab;
  const tabItems: { id: ResultTab; label: string }[] = [
    { id: "synthese", label: "1 Synthèse" },
    { id: "strategies", label: "2 Stratégies" },
    { id: "fiscalite", label: "3 Fiscalité" },
    ...(transmissionObjective ? [{ id: "transmission" as ResultTab, label: "4 Transmission" }] : []),
    { id: "juridique", label: `${transmissionObjective ? 5 : 4} Juridique` },
    { id: "projection", label: `${transmissionObjective ? 6 : 5} Projection` },
    { id: "sources", label: `${transmissionObjective ? 7 : 6} Sources` },
  ];

  useEffect(() => {
    window.localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  function setField<K extends keyof FormState>(key: K) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const current = form[key];
      const raw = event.target.value;
      setForm(prev => ({
        ...prev,
        [key]: typeof current === "number" ? Number(raw) : raw,
      }));
    };
  }

  function setValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function setPrimaryObjective(event: React.ChangeEvent<HTMLSelectElement>) {
    const objectif = event.target.value as Objective;
    setForm(prev => ({
      ...prev,
      objectif,
      objectifSecondaire: prev.objectifSecondaire === objectif ? "aucun" : prev.objectifSecondaire,
    }));
  }

  function setSecondaryObjective(event: React.ChangeEvent<HTMLSelectElement>) {
    const objectifSecondaire = normalizeSecondaryObjective(event.target.value, form.objectif);
    setForm(prev => ({ ...prev, objectifSecondaire }));
  }

  function setDetentionHorizon(value: DetentionHorizon) {
    setForm(prev => ({
      ...prev,
      horizon: value,
      dureeDetention: value === "plus-30" ? 30 : normalizeDuration(prev.dureeDetention, "moins-30"),
    }));
  }

  function setDetentionDuration(event: React.ChangeEvent<HTMLInputElement>) {
    const duration = normalizeDuration(event.target.value, "moins-30");
    setForm(prev => ({ ...prev, dureeDetention: duration }));
  }

  function resetForm() {
    window.localStorage.removeItem(FORM_STORAGE_KEY);
    setForm(defaultForm);
  }

  function run() {
    setHasRun(true);
    setSelectedId(recommended.id);
    setActiveTab("synthese");
  }

  return (
    <main className={css.page}>
      <header className={css.header}>
        <div className={css.headerTop}>
          <div>
            <p className={css.kicker}>PatriPro Immobilier</p>
            <h1 className={css.h1}>Simulateur Investissement Immobilier</h1>
            <p className={css.headerP}>
              Comparaison pédagogique des structures juridiques et fiscales : nom propre, SCI, SARL, SAS et indivision.
            </p>
          </div>
          <Link href="/" className={css.btnReturn}>Retour à l'accueil</Link>
        </div>
      </header>

      <div className={css.wrap}>
        <section className={css.card}>
          <h2 className={css.cardH2}><span className={css.secNum}>1</span>Situation personnelle</h2>
          <p className={css.sub}>Ces données orientent le niveau d'imposition, le risque social et la recommandation de structure.</p>
          <div className={css.grid}>
            <div>
              <label className={css.fieldLabel}>Revenus annuels du foyer €</label>
              <input className={css.textInput} type="number" min={0} step={1000} value={form.revenusFoyer} onChange={setField("revenusFoyer")} />
              <label className={css.fieldLabel}>Tranche marginale d'imposition</label>
              <select className={css.selectInput} value={form.tmi} onChange={setField("tmi")}>
                <option value={0}>0 %</option>
                <option value={11}>11 %</option>
                <option value={30}>30 %</option>
                <option value={41}>41 %</option>
                <option value={45}>45 %</option>
              </select>
              <label className={css.fieldLabel}>Nombre de parts fiscales</label>
              <input className={css.textInput} type="number" min={1} step={0.5} value={form.parts} onChange={setField("parts")} />
              <label className={css.fieldLabel}>Revenus locatifs déjà existants mensuels €</label>
              <input className={css.textInput} type="number" min={0} step={100} value={form.revenusLocatifsExistants} onChange={setField("revenusLocatifsExistants")} />
              <p className={css.hint}>Le simulateur annualise automatiquement ce montant pour les seuils micro et LMP.</p>
              {hasExistingRentalIncome(form) && (
                <>
                  <label className={css.fieldLabel}>Nature des revenus locatifs existants</label>
                  <Seg
                    value={form.revenusLocatifsExistantsNature}
                    onChange={value => setValue("revenusLocatifsExistantsNature", value as ExistingRentalNature)}
                    options={[
                      { value: "foncier", label: "Foncier" },
                      { value: "lmnp", label: "LMNP" },
                    ]}
                  />
                  <label className={css.fieldLabel}>Régime fiscal actuel</label>
                  <Seg
                    value={form.revenusLocatifsExistantsRegime}
                    onChange={value => setValue("revenusLocatifsExistantsRegime", value as ExistingRentalRegime)}
                    options={[
                      { value: "micro", label: "Micro" },
                      { value: "reel", label: "Réel" },
                    ]}
                  />
                  <p className={css.hint}>Cette information sert à tester le micro-foncier, le micro-BIC, et le basculement éventuel en LMP.</p>
                </>
              )}
            </div>
            <div>
              <label className={css.fieldLabel}>Situation matrimoniale</label>
              <select className={css.selectInput} value={form.situation} onChange={setField("situation")}>
                <option value="celibataire">Célibataire</option>
                <option value="marie">Marié</option>
                <option value="pacs">Pacsé</option>
                <option value="divorce">Divorcé</option>
                <option value="veuf">Veuf</option>
              </select>
              <label className={css.fieldLabel}>Âge</label>
              <input className={css.textInput} type="number" min={18} max={95} value={form.age} onChange={setField("age")} />
              {partnerInProject && (
                <>
                  <label className={css.fieldLabel}>Âge du conjoint / partenaire <span className={css.hint}>(démembrement)</span></label>
                  <input className={css.textInput} type="number" min={18} max={110} value={form.ageConjoint} onChange={setField("ageConjoint")} />
                  <p className={css.hint}>Utilisé pour anticiper le barème fiscal usufruit / nue-propriété si une transmission démembrée est étudiée.</p>
                </>
              )}
              <label className={css.fieldLabel}>Objectif patrimonial principal</label>
              <select className={css.selectInput} value={form.objectif} onChange={setPrimaryObjective}>
                {Object.entries(objectiveLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <label className={css.fieldLabel}>Objectif patrimonial secondaire</label>
              <select className={css.selectInput} value={form.objectifSecondaire} onChange={setSecondaryObjective}>
                <option value="aucun">Aucun</option>
                {Object.entries(objectiveLabels)
                  .filter(([value]) => value !== form.objectif)
                  .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <label className={css.fieldLabel}>Situation d'achat</label>
              <select className={css.selectInput} value={form.achat} onChange={setField("achat")}>
                {Object.entries(purchaseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {transmissionObjective && (
                <>
                  <label className={css.fieldLabel}>Nombre d'enfants concernés par la transmission</label>
                  <input className={css.textInput} type="number" min={1} max={12} step={1} value={form.enfants} onChange={setField("enfants")} />
                  <label className={css.fieldLabel}>Donations antérieures de moins de 15 ans par investisseur, par enfant €</label>
                  <input className={css.textInput} type="number" min={0} step={1000} value={form.donationsAnterieuresInvestisseur} onChange={setField("donationsAnterieuresInvestisseur")} />
                  {partnerInProject && (
                    <>
                      <label className={css.fieldLabel}>Donations antérieures de moins de 15 ans par conjoint/partenaire, par enfant €</label>
                      <input className={css.textInput} type="number" min={0} step={1000} value={form.donationsAnterieuresConjoint} onChange={setField("donationsAnterieuresConjoint")} />
                    </>
                  )}
                  <p className={css.hint}>Ces montants consomment les abattements disponibles et les tranches du barème pour les donations de moins de 15 ans.</p>
                </>
              )}
            </div>
          </div>
        </section>

        <section className={css.card}>
          <h2 className={css.cardH2}><span className={css.secNum}>2</span>Projet immobilier</h2>
          <p className={css.sub}>Le moteur estime la rentabilité, la fiscalité et le poids des amortissements selon le mode de location.</p>
          <div className={css.grid}>
            <div>
              <label className={css.fieldLabel}>Valeur du bien €</label>
              <input className={css.textInput} type="number" min={0} step={5000} value={form.valeurBien} onChange={setField("valeurBien")} />
              <label className={css.fieldLabel}>Type de bien</label>
              <select className={css.selectInput} value={form.typeBien} onChange={setField("typeBien")}>
                <option value="appartement">Appartement</option>
                <option value="maison">Maison</option>
                <option value="immeuble">Immeuble de rapport</option>
                <option value="local">Local commercial / professionnel</option>
                <option value="mixte">Bien mixte</option>
              </select>
              <label className={css.fieldLabel}>Bien neuf ou ancien</label>
              <Seg value={form.etatBien} onChange={value => setValue("etatBien", value as FormState["etatBien"])} options={[{ value: "ancien", label: "Ancien" }, { value: "neuf", label: "Neuf" }]} />
              <label className={css.fieldLabel}>Montant des travaux €</label>
              <input className={css.textInput} type="number" min={0} step={1000} value={form.travaux} onChange={setField("travaux")} />
              {isFurnishedMode(form.rentalMode) && (
                <>
                  <label className={css.fieldLabel}>Mobilier estimé €</label>
                  <input className={css.textInput} type="number" min={0} step={1000} value={form.mobilier} onChange={setField("mobilier")} />
                </>
              )}
            </div>
            <div>
              <label className={css.fieldLabel}>Mode de location envisagé</label>
              <select className={css.selectInput} value={form.rentalMode} onChange={setField("rentalMode")}>
                {Object.entries(rentalModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {isShortTermMode(form.rentalMode) && (
                <>
                  <label className={css.fieldLabel}>Meublé de tourisme classé ?</label>
                  <Seg value={form.meubleClasse} onChange={value => setValue("meubleClasse", value as FormState["meubleClasse"])} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
                </>
              )}
              <label className={css.fieldLabel}>Loyers mensuels bruts estimés €</label>
              <input className={css.textInput} type="number" min={0} step={100} value={form.loyersMensuels} onChange={setField("loyersMensuels")} />
              <label className={css.fieldLabel}>Vacance locative estimée (%)</label>
              <input className={css.textInput} type="number" min={0} max={100} step={1} value={form.vacance} onChange={setField("vacance")} />
              <div className={css.labelRow}>
                <label className={css.fieldLabel}>Charges annuelles hors crédit €</label>
                <button
                  type="button"
                  className={css.infoButton}
                  aria-expanded={chargesHelpOpen}
                  aria-label="Afficher les charges éligibles"
                  onClick={() => setChargesHelpOpen(open => !open)}
                >
                  i
                </button>
              </div>
              <input className={css.textInput} type="number" min={0} step={500} value={form.chargesAnnuelles} onChange={setField("chargesAnnuelles")} />
              {chargesHelpOpen && (
                <div className={css.infoPanel}>
                  <strong>Charges à renseigner</strong>
                  <ul>
                    {eligibleChargeItems.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
              <label className={css.fieldLabel}>Durée de détention envisagée</label>
              <select className={css.selectInput} value={form.horizon} onChange={event => setDetentionHorizon(event.target.value as DetentionHorizon)}>
                {Object.entries(detentionHorizonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {form.horizon === "moins-30" ? (
                <>
                  <label className={css.fieldLabel}>Durée précise retenue pour la projection</label>
                  <input className={css.textInput} type="number" min={1} max={29} step={1} value={form.dureeDetention} onChange={setDetentionDuration} />
                </>
              ) : (
                <p className={css.hint}>La projection reste limitée à 30 ans, même si l'horizon patrimonial est supérieur.</p>
              )}
            </div>
          </div>
        </section>

        <section className={css.card}>
          <h2 className={css.cardH2}><span className={css.secNum}>3</span>Financement</h2>
          <p className={css.sub}>Le calcul de cash-flow tient compte des intérêts d'emprunt, du coût du crédit et de l'effort d'épargne.</p>
          <div className={css.grid}>
            <div>
              <label className={css.fieldLabel}>Crédit bancaire</label>
              <Seg value={form.credit} onChange={value => setValue("credit", value as FormState["credit"])} options={[{ value: "oui", label: "Avec crédit" }, { value: "non", label: "Sans crédit" }]} />
              <label className={css.fieldLabel}>Montant de l'apport €</label>
              <input className={css.textInput} type="number" min={0} step={5000} value={form.apport} onChange={setField("apport")} />
            </div>
            <div>
              {form.credit === "oui" && (
                <>
                  <label className={css.fieldLabel}>Montant emprunté €</label>
                  <input className={css.textInput} type="number" min={0} step={5000} value={form.montantEmprunte} onChange={setField("montantEmprunte")} />
                  <label className={css.fieldLabel}>Taux d'emprunt (%)</label>
                  <input className={css.textInput} type="number" min={0} step={0.05} value={form.tauxEmprunt} onChange={setField("tauxEmprunt")} />
                  <label className={css.fieldLabel}>Durée du crédit (années)</label>
                  <input className={css.textInput} type="number" min={1} max={30} step={1} value={form.dureeCredit} onChange={setField("dureeCredit")} />
                </>
              )}
            </div>
          </div>

          <div className={css.cta}>
            <button type="button" className={css.btnPrimary} onClick={run}>Analyser le projet immobilier</button>
            <button type="button" className={css.btnSecondary} onClick={resetForm}>Réinitialiser</button>
          </div>
        </section>

        {hasRun && (
          <>
            <div className={css.tabs}>
              {tabItems.map(tab => (
                <button key={tab.id} type="button" className={`${css.tab} ${visibleActiveTab === tab.id ? css.tabOn : ""}`} onClick={() => setActiveTab(tab.id)}>
                  {tab.label}
                </button>
              ))}
            </div>

            <section className={`${css.tabpane} ${visibleActiveTab === "synthese" ? css.tabpaneOn : ""}`}>
              <div className={css.card}>
                <h2 className={css.cardH2}><span className={css.secNum}>A</span>Synthèse des besoins</h2>
                <p className={css.sub}>Lecture du projet à partir des informations saisies. Les structures juridiques sont comparées dans l'onglet 2.</p>
                <div className={css.sourceGrid}>
                  {needsSummary.map(item => (
                    <article key={item.title} className={css.sourceCard}>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                      <p className={css.hint}>{item.detail}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className={css.card}>
                <h2 className={css.cardH2}><span className={css.secNum}>B</span>Lecture chiffrée du projet</h2>
                <div className={css.tripleGrid}>
                  <TaxLine label="Loyers annuels projetés" detail="Loyers mensuels x 12, après vacance locative" value={euro(projectNumbers.annualRent)} />
                  <TaxLine label="Rendement brut du projet" detail="Loyers annuels / coût d'acquisition estimé" value={pct(projectGrossYield)} />
                  <TaxLine label="Trésorerie avant fiscalité" detail="Loyers - charges - crédit, hors impôt et hors amortissements" value={euro(preTaxCashFlow)} />
                  <TaxLine label="Frais de notaire estimés" detail={form.etatBien === "neuf" ? "Hypothèse 2,5 % du prix du bien neuf" : "Hypothèse 7,5 % du prix du bien ancien"} value={euro(projectNumbers.notaryFees)} />
                  <TaxLine label="Coût d'acquisition estimé" detail="Prix, travaux, mobilier et frais notariés indicatifs" value={euro(totalAcquisition)} />
                  {form.credit === "oui" && (
                    <TaxLine label="Crédit bancaire" detail={`Coût total du crédit : ${euro(projectNumbers.creditCost)}`} value={euro(projectNumbers.payment)} />
                  )}
                  {form.revenusLocatifsExistants > 0 && (
                    <TaxLine
                      label="Revenus locatifs existants"
                      detail={`${existingRentalNatureLabels[form.revenusLocatifsExistantsNature]} au régime ${existingRentalRegimeLabels[form.revenusLocatifsExistantsRegime].toLowerCase()} : ${euro(form.revenusLocatifsExistants)} par mois. Montant retenu dans le seuil du nouveau projet : ${euro(relevantExistingIncomeAnnual)}.`}
                      value={euro(existingIncomeAnnual)}
                    />
                  )}
                  {partnerInProject && (
                    <TaxLine
                      label="Démembrement potentiel"
                      detail={`Âge conjoint/partenaire : ${form.ageConjoint} ans, barème fiscal indicatif CGI art. 669`}
                      value={`US ${Math.round(partnerDismembermentRates.usufruct * 100)} % / NP ${Math.round(partnerDismembermentRates.bareOwnership * 100)} %`}
                    />
                  )}
                </div>
              </div>
            </section>

            <section className={`${css.tabpane} ${visibleActiveTab === "strategies" ? css.tabpaneOn : ""}`}>
              <p className={css.sub}>
                Stratégies filtrées selon l'objectif principal : <b>{objectiveLabels[form.objectif]}</b>
                {form.objectifSecondaire !== "aucun" && <> ; objectif secondaire : <b>{secondaryObjectiveLabels[form.objectifSecondaire]}</b></>}.
                Trois options maximum sont affichées.
              </p>
              <div className={css.strategyPicker}>
                {objectiveStrategies.map(strategy => (
                  <button
                    type="button"
                    key={strategy.id}
                    className={`${css.choiceCard} ${selected.id === strategy.id ? css.choiceCardOn : ""} ${strategy.recommended ? css.choiceCardRecommended : ""}`}
                    onClick={() => setSelectedId(strategy.id)}
                  >
                    <span className={css.choiceFamily}>{strategy.family}</span>
                    {strategy.recommended && <span className={css.choiceBadge}>Recommandée</span>}
                    {strategy.secondary && <span className={css.choiceBadge}>Alternative</span>}
                    <h3>{strategy.title}</h3>
                    <p>{strategy.summary}</p>
                    <div className={css.choiceMeta}><span>Régime</span><b>{strategy.tax.regime}</b></div>
                    <div className={css.choiceMeta}><span>{taxMainLabel(strategy.tax)}</span><b>{euro(taxMainAmount(strategy.tax))}</b></div>
                    <div className={css.choiceMeta}><span>Trésorerie réelle</span><b>{euro(strategy.annualCashFlow)}</b></div>
                  </button>
                ))}
              </div>

              <div className={css.detailBox}>
                <div className={css.detailHeader}>
                  <div>
                    <span className={css.choiceFamily}>{selected.family}</span>
                    <h3>{selected.title}</h3>
                    <p>{selected.explanation}</p>
                  </div>
                  <div className={css.detailTax}>
                    <span>Délai indicatif</span>
                    <b>{selected.delay}</b>
                  </div>
                </div>
                <div className={css.detailGrid}>
                  <section>
                    <h4>Points forts</h4>
                    <ul className={css.list}>{selected.strengths.map(item => <li key={item}>{item}</li>)}</ul>
                  </section>
                  <section>
                    <h4>Points de vigilance</h4>
                    <ul className={css.list}>{selected.weaknesses.map(item => <li key={item}>{item}</li>)}</ul>
                  </section>
                </div>
              </div>
            </section>

            <section className={`${css.tabpane} ${visibleActiveTab === "fiscalite" ? css.tabpaneOn : ""}`}>
              <div className={css.card}>
                <h2 className={css.cardH2}><span className={css.secNum}>B</span>Calcul fiscal pas à pas</h2>
                <p className={css.sub}>Stratégie active : <b>{selected.title}</b>. Les montants sont des estimations annuelles de première année.</p>
                <div className={css.tableWrap}>
                  <table className={css.calcTable}>
                    <thead>
                      <tr>
                        <th>Étape</th>
                        <th>Calcul / assiette</th>
                        <th>Montant retenu</th>
                        <th>Règle mobilisée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFiscalSteps.map(step => (
                        <tr key={step.label} className={step.total ? css.trTotal : undefined}>
                          <td>{step.label}</td>
                          <td>{step.detail}</td>
                          <td className={css.tdNum}>{step.value}</td>
                          <td>{step.rule}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {transmissionObjective && (
              <section className={`${css.tabpane} ${visibleActiveTab === "transmission" ? css.tabpaneOn : ""}`}>
                <div className={css.card}>
                  <h2 className={css.cardH2}><span className={css.secNum}>C</span>Transmission familiale</h2>
                  <p className={css.sub}>
                    Stratégie active : <b>{selected.title}</b>. Hypothèse pédagogique : donation de la nue-propriété aux enfants avec conservation de l'usufruit par le ou les parents.
                  </p>
                  <div className={css.tripleGrid}>
                    <TaxLine label="Valeur économique retenue" detail={transmission.debtDeducted > 0 ? "Actif immobilier diminué de la dette retenue pour la structure" : "Valeur du bien, travaux et mobilier retenu"} value={euro(transmission.fullOwnershipValue)} />
                    <TaxLine label="Valeur taxable en nue-propriété" detail={transmission.donorSummary} value={euro(transmission.bareOwnershipValue)} />
                    <TaxLine label="Droits de transmission estimés" detail={`Pour ${transmission.childrenCount} enfant(s), après abattements et rappel fiscal`} value={euro(transmission.recommendedDuties)} />
                    <TaxLine label="Comparaison pleine propriété" detail="Droits estimés si la pleine propriété était donnée immédiatement" value={euro(transmission.fullOwnershipDuties)} />
                    <TaxLine label="Base taxable nue-propriété" detail="Total après donations antérieures et abattements disponibles" value={euro(transmission.bareOwnershipTaxableTotal)} />
                    <TaxLine label="Abattement appliqué par enfant" detail={transmission.abatementSummary} value={euro(transmission.appliedAbatementPerChild)} />
                  </div>
                </div>

                <div className={css.card}>
                  <h2 className={css.cardH2}><span className={css.secNum}>D</span>Calcul des droits pas à pas</h2>
                  <p className={css.sub}>Les donations antérieures sont saisies par enfant et par donateur. Si l'historique varie selon les enfants, le chiffrage doit être individualisé.</p>
                  <div className={css.tableWrap}>
                    <table className={css.calcTable}>
                      <thead>
                        <tr>
                          <th>Étape</th>
                          <th>Calcul / assiette</th>
                          <th>Montant retenu</th>
                          <th>Règle mobilisée</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transmission.steps.map(step => (
                          <tr key={step.label} className={step.total ? css.trTotal : undefined}>
                            <td>{step.label}</td>
                            <td>{step.base}</td>
                            <td className={css.tdNum}>{euro(step.amount)}</td>
                            <td>{step.rule}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            <section className={`${css.tabpane} ${visibleActiveTab === "juridique" ? css.tabpaneOn : ""}`}>
              <div className={css.card}>
                <h2 className={css.cardH2}><span className={css.secNum}>{transmissionObjective ? "E" : "C"}</span>Création et sécurisation juridique</h2>
                <p className={css.sub}>
                  Stratégie active : <b>{selected.title}</b>. Cet onglet détaille surtout les points à sécuriser lorsqu'une SARL, notamment une SARL de famille à l'IR, est retenue pour porter le projet.
                </p>
                <div className={css.legalGrid}>
                  {sarlLegalBlocks.map(block => (
                    <section key={block.title} className={css.legalBox}>
                      <h3>{block.title}</h3>
                      <ul className={css.list}>{block.items.map(item => <li key={item}><LegalItemText text={item} /></li>)}</ul>
                    </section>
                  ))}
                </div>
              </div>

              <div className={css.card}>
                <h2 className={css.cardH2}><span className={css.secNum}>{transmissionObjective ? "F" : "D"}</span>Textes de référence</h2>
                <div className={css.sourceGrid}>
                  {sources.slice(0, 3).map(source => (
                    <article key={source.url} className={css.sourceCard}>
                      <h3>{source.title}</h3>
                      <p>{source.text}</p>
                      <a href={source.url} target="_blank" rel="noreferrer">Ouvrir la source officielle</a>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className={`${css.tabpane} ${visibleActiveTab === "projection" ? css.tabpaneOn : ""}`}>
              <div className={css.card}>
                <h2 className={css.cardH2}><span className={css.secNum}>{transmissionObjective ? "G" : "E"}</span>Projection annuelle</h2>
                <p className={css.sub}>Hypothèse pédagogique : les loyers restent constants ; seule la valeur du bien reste projetée à +1 %/an pour le patrimoine net. La trésorerie est cumulée comme si elle restait dans le projet, sans transfert vers les comptes personnels ; en IR, l'impôt est retranché virtuellement, et en IS la fiscalité de distribution est exclue.</p>
                <div className={css.tableWrap}>
                  <table className={css.table}>
                    <thead>
                      <tr>
                        <th>Année</th>
                        <th>Loyers</th>
                        <th>Fiscalité projetée</th>
                        <th>Trésorerie cumulée conservée</th>
                        <th>Capital restant dû</th>
                        <th>Patrimoine net projeté</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projection.map(row => (
                        <tr key={row.year}>
                          <td>Année {row.year}</td>
                          <td>{euro(row.rent)}</td>
                          <td>{euro(row.tax)}</td>
                          <td className={row.cumulativeTreasury >= 0 ? css.good : css.bad}>{euro(row.cumulativeTreasury)}</td>
                          <td>{euro(row.loanBalance)}</td>
                          <td>{euro(row.estimatedEquity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className={`${css.tabpane} ${visibleActiveTab === "sources" ? css.tabpaneOn : ""}`}>
              <div className={css.card}>
                <h2 className={css.cardH2}><span className={css.secNum}>{transmissionObjective ? "H" : "F"}</span>Sources fiscales utilisées</h2>
                <p className={css.sub}>Liens officiels utilisés pour les principaux paramètres du moteur. Les frais et projections restent des hypothèses indicatives à adapter au dossier.</p>
                <div className={css.sourceGrid}>
                  {sources.map(source => (
                    <article key={source.url} className={css.sourceCard}>
                      <h3>{source.title}</h3>
                      <p>{source.text}</p>
                      <a href={source.url} target="_blank" rel="noreferrer">Ouvrir la source officielle</a>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        <p className={css.footerNote}>
          Chiffrage indicatif à vocation pédagogique. Les résultats doivent être sécurisés avec un notaire, un expert-comptable et les textes applicables au jour de l'opération.
        </p>
      </div>
    </main>
  );
}
