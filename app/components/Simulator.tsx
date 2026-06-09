"use client";

/* eslint-disable react/no-unescaped-entities */
import { useState } from "react";
import Link from "next/link";
import css from "./Simulator.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PieSeg { label: string; value: number; color: string; }

interface Strategy {
  name: string; cost: number; gain: number; gainPct: number;
  delai: string; complex: number; risque: number; points: string[]; best: boolean;
}

interface ClientStrategy {
  id: string;
  title: string;
  family: string;
  summary: string;
  tax: number;
  delay: string;
  recommended: boolean;
  recommendationReason: string;
  fit: string[];
  conditions: string[];
  process: string[];
}

interface TransResult {
  recoTitle: string; recoSub: string;
  kpiSans: number; kpiAvec: number; kpiEco: number; kpiEcoPct: number;
  pieBefore: PieSeg[]; pieAfter: PieSeg[]; pieTotal: number;
  strategies: Strategy[];
  hypothesis: string; plan: string[];
}

interface CedDetail {
  PV: number;
  ir: number;
  ps: number;
  ce: number;
  cd: number;
  rfr: number;
  cdhrTarget: number;
  cdhrReferenceTax: number;
  cdhrMajoration: number;
  total: number;
}

interface CedResult {
  recoTitle: string; recoSub: string;
  kpiSans: number; kpiAvec: number; kpiEco: number; kpiEcoPct: number;
  pieBefore: PieSeg[]; pieAfter: PieSeg[]; pieTotal: number;
  strategies: Strategy[];
  hypothesis: string; plan: string[];
  detail: CedDetail; isRetraite: boolean;
}

interface MixteResult {
  droitsDonNP: number; pvPurgee: number; dutreilOK: boolean;
}

interface CtxItem { label: string; content: string; }

interface AllResults {
  ctx: CtxItem[];
  transmettre: TransResult;
  ceder: CedResult;
  mixte: MixteResult;
  dossier: DossierResult;
  strategiesByObjective: Record<string, ClientStrategy[]>;
  suggestedTab: ResultTab;
  objective: string;
  control: string;
}

type ResultTab =
  | "situation"
  | "scenarios"
  | "juridique"
  | "fiscale"
  | "sources"
  | "rapport";

type Tone = "good" | "warning" | "neutral";

interface FormState {
  age: number;
  ageMadame: number;
  enfants: number;
  donationsAnterieuresMonsieur: number;
  donationsAnterieuresMadame: number;
  donationsAnterieuresConjoint: number;
  situation: string;
  regime: string;
  residence: string;
  formejur: string;
  secteur: string;
  holding: string;
  statut: string;
  valeur: number;
  quotepart: number;
  prixrevient: number;
  plusvalues: number;
  revenusDirigeant: number;
  dividendes: number;
  autresrev: number;
  personnesCharge: number;
  actifsExclusDutreil: number;
  besoinLiquidite: number;
  partProtectionConjoint: number;
  besoinConjoint: string;
  objectif: string;
  controle: string;
}

interface SegState {
  dutreil: string;
  retraite: string;
  reinvest: string;
  repreneurs: string;
  conserver: string;
  demembrement: string;
  coupleDetention: string;
  jeuneAgriculteur: string;
}

interface Metric {
  label: string;
  value: string;
  detail: string;
}

interface Insight {
  title: string;
  text: string;
  tone: Tone;
}

interface TaxLine {
  label: string;
  base: string;
  amount: number;
  rule: string;
  total?: boolean;
}

interface LegalPanel {
  title: string;
  plain: string;
  technical: string;
  example: string;
  caution: string;
  references: string[];
}

interface SourceItem {
  label: string;
  mechanism: string;
  publisher: string;
  url: string;
  checked: string;
  application: string;
}

interface ProcessStep {
  title: string;
  objective: string;
  actions: string;
  owners: string;
  documents: string;
  timing: string;
  watch: string;
}

interface Recommendation {
  title: string;
  plain: string;
  rationale: string[];
  limits: string[];
  alternatives: string[];
}

interface DossierResult {
  recommendation: Recommendation;
  metrics: Metric[];
  insights: Insight[];
  fiscalLines: TaxLine[];
  fiscalLinesByStrategy: Record<string, TaxLine[]>;
  fiscalWatchByStrategy: Record<string, string[]>;
  contextByStrategy: Record<string, CtxItem[]>;
  legalPanels: LegalPanel[];
  sources: SourceItem[];
  timeline: ProcessStep[];
}

// ─── Calculation helpers ──────────────────────────────────────────────────────

function droitsLigneDirecte(base: number): number {
  if (base <= 0) return 0;
  const T: [number, number][] = [
    [8072, .05], [12109, .10], [15932, .15], [552324, .20],
    [902838, .30], [1805677, .40], [Infinity, .45],
  ];
  let d = 0, prev = 0;
  for (const [p, t] of T) {
    if (base > p) { d += (p - prev) * t; prev = p; }
    else { d += (base - prev) * t; break; }
  }
  return d;
}

function droitsEntreEpoux(base: number): number {
  if (base <= 0) return 0;
  const thresholds: [number, number][] = [
    [8072, .05], [15932, .10], [31865, .15], [552324, .20],
    [902838, .30], [1805677, .40], [Infinity, .45],
  ];
  let duties = 0, previous = 0;
  for (const [threshold, rate] of thresholds) {
    if (base > threshold) { duties += (threshold - previous) * rate; previous = threshold; }
    else { duties += (base - previous) * rate; break; }
  }
  return duties;
}

interface DonorDonationData {
  label: string;
  share: number;
  previousPerChild: number;
  usufructuaryAge: number;
  bareOwnershipRate: number;
}

interface DonationCalculation {
  appliedAbatementPerChild: number;
  taxablePerChild: number;
  taxableTotal: number;
  dutiesTotal: number;
  previousPerChild: number;
  previousSummary: string;
  abatementSummary: string;
}

interface SpouseDonationCalculation {
  valueTransferred: number;
  previousGift: number;
  remainingAbatement: number;
  appliedAbatement: number;
  taxableValue: number;
  duties: number;
}

function donationCalculation(
  childrenCount: number,
  donors: DonorDonationData[],
  currentValue: (donor: DonorDonationData) => number,
): DonationCalculation {
  let appliedAbatementPerChild = 0;
  let taxablePerChild = 0;
  let dutiesPerChild = 0;
  let previousPerChild = 0;
  const previousParts: string[] = [];
  const abatementParts: string[] = [];

  donors.filter(donor => donor.share > 0).forEach(donor => {
    const prior = Math.max(0, donor.previousPerChild);
    const receivedNow = currentValue(donor) / childrenCount;
    const remainingAbatement = Math.max(0, 100000 - prior);
    const appliedAbatement = Math.min(receivedNow, remainingAbatement);
    const currentTaxable = Math.max(0, receivedNow - remainingAbatement);
    const priorTaxable = Math.max(0, prior - 100000);

    appliedAbatementPerChild += appliedAbatement;
    taxablePerChild += currentTaxable;
    dutiesPerChild += droitsLigneDirecte(priorTaxable + currentTaxable) - droitsLigneDirecte(priorTaxable);
    previousPerChild += prior;
    previousParts.push(`${donor.label}: ${euro(prior)}`);
    abatementParts.push(`${donor.label}: ${euro(appliedAbatement)} appliqués sur ${euro(remainingAbatement)} disponibles`);
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

function spouseDonationCalculation(currentValue: number, previousGiftValue: number): SpouseDonationCalculation {
  const previousGift = Math.max(0, previousGiftValue);
  const remainingAbatement = Math.max(0, 80724 - previousGift);
  const appliedAbatement = Math.min(Math.max(0, currentValue), remainingAbatement);
  const taxableValue = Math.max(0, currentValue - remainingAbatement);
  const previouslyTaxable = Math.max(0, previousGift - 80724);
  return {
    valueTransferred: currentValue,
    previousGift,
    remainingAbatement,
    appliedAbatement,
    taxableValue,
    duties: droitsEntreEpoux(previouslyTaxable + taxableValue) - droitsEntreEpoux(previouslyTaxable),
  };
}

function quotiteNP(age: number): number {
  if (age < 21) return .10; if (age < 31) return .20; if (age < 41) return .30;
  if (age < 51) return .40; if (age < 61) return .50; if (age < 71) return .60;
  if (age < 81) return .70; if (age < 91) return .80; return .90;
}

function cehrCalc(rfr: number, couple: boolean): number {
  const s1 = couple ? 500000 : 250000, s2 = couple ? 1000000 : 500000;
  let c = 0;
  if (rfr > s1) c += (Math.min(rfr, s2) - s1) * 0.03;
  if (rfr > s2) c += (rfr - s2) * 0.04;
  return c;
}

function cdhrTargetTax(rfr: number, couple: boolean): number {
  const lowerThreshold = couple ? 500000 : 250000;
  const upperThreshold = couple ? 660000 : 330000;
  if (rfr <= lowerThreshold) return 0;
  const fullTarget = rfr * 0.20;
  if (rfr <= upperThreshold) {
    return Math.min(fullTarget, (rfr - lowerThreshold) * 0.825);
  }
  return fullTarget;
}

function cdhrReferenceMajoration(couple: boolean, dependents: number): number {
  return (couple ? 12500 : 0) + Math.max(0, dependents) * 1500;
}

function cdhrCalc(rfr: number, couple: boolean, incomeTaxReference: number, dependents: number): number {
  return Math.max(0, cdhrTargetTax(rfr, couple) - Math.max(0, incomeTaxReference) - cdhrReferenceMajoration(couple, dependents));
}

const euro = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";
const pct = (a: number, b: number) => b > 0 ? Math.round(a / b * 100) : 0;

const officialSources: SourceItem[] = [
  {
    label: "CGI, article 787 B",
    mechanism: "Pacte Dutreil sur titres de société",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053542700/2026-04-29",
    checked: "Vérifié le 23/05/2026",
    application: "Loi de finances 2026: exonération de 75% recentrée sur l'actif professionnel éligible et engagement individuel porté à 6 ans.",
  },
  {
    label: "BOI-ENR-DMTG-10-20-40-10",
    mechanism: "Doctrine Dutreil pour parts ou actions",
    publisher: "BOFiP-Impôts",
    url: "https://bofip.impots.gouv.fr/bofip/6509-PGP.html/identifiant=BOI-ENR-DMTG-10-20-40-10-20240530",
    checked: "Vérifié le 23/05/2026",
    application: "Contrôle du caractère opérationnel, de la holding animatrice, des actifs exclus et des obligations déclaratives.",
  },
  {
    label: "Loi de finances 2026, article 8",
    mechanism: "Réforme Dutreil",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000053508196",
    checked: "Vérifié le 25/05/2026",
    application: "Recentrage Dutreil: exclusion des actifs non exclusivement professionnels et engagement individuel porté à 6 ans.",
  },
  {
    label: "Loi de finances 2026, article 11",
    mechanism: "Apport-cession et dirigeant partant à la retraite",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000053508205",
    checked: "Vérifié le 25/05/2026",
    application: "Modification des articles 150-0 B ter et 150-0 D ter du CGI pour les stratégies de cession concernées.",
  },
  {
    label: "CGI, article 669",
    mechanism: "Barème usufruit / nue-propriété",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006310173/2026-05-10",
    checked: "Vérifié le 25/05/2026",
    application: "Valorisation fiscale du démembrement selon l'âge de l'usufruitier.",
  },
  {
    label: "CGI, article 777",
    mechanism: "Barème des droits de donation",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000030061736/2026-05-05",
    checked: "Vérifié le 23/05/2026",
    application: "Barème progressif utilisé pour estimer les droits de donation après abattements.",
  },
  {
    label: "CGI, article 779",
    mechanism: "Abattement parent/enfant",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000026292566/2026-02-21",
    checked: "Vérifié le 23/05/2026",
    application: "Abattement de 100 000 € par parent et par enfant utilisé dans le moteur indicatif.",
  },
  {
    label: "CGI, article 784",
    mechanism: "Rappel fiscal des donations antérieures",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033809289",
    checked: "Vérifié le 25/05/2026",
    application: "Les donations de moins de 15 ans entre le même donateur et le même donataire consomment les abattements et les tranches déjà utilisées.",
  },
  {
    label: "CGI, article 790 E",
    mechanism: "Abattement donation entre époux",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000026292592/2026-02-22",
    checked: "Vérifié le 25/05/2026",
    application: "Abattement de 80 724 € sur les donations entre vifs consenties au conjoint du donateur.",
  },
  {
    label: "CGI, article 790 F",
    mechanism: "Abattement donation entre partenaires de PACS",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000026292590/2026-02-21",
    checked: "Vérifié le 25/05/2026",
    application: "Abattement de 80 724 € sur les donations entre vifs consenties au partenaire lié par un PACS.",
  },
  {
    label: "CGI, article 796-0 bis",
    mechanism: "Exonération du conjoint ou partenaire au décès",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006305480/2026-02-22",
    checked: "Vérifié le 25/05/2026",
    application: "Le conjoint survivant ou partenaire de PACS bénéficiaire est exonéré de droits de mutation par décès.",
  },
  {
    label: "Code civil, article 1094-1",
    mechanism: "Donation entre époux au dernier vivant",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006435800",
    checked: "Vérifié le 25/05/2026",
    application: "Pour un époux en présence d'enfants, organisation des options de propriété et d'usufruit au profit du survivant.",
  },
  {
    label: "Code civil, article 515-6",
    mechanism: "Protection successorale du partenaire de PACS",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006428547",
    checked: "Vérifié le 25/05/2026",
    application: "Pour un partenaire de PACS, la protection successorale sur les droits professionnels doit être organisée par testament.",
  },
  {
    label: "CGI, article 150-0 D",
    mechanism: "Calcul de la plus-value sur titres",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053543011/2026-05-16",
    checked: "Vérifié le 25/05/2026",
    application: "Détermine la plus-value par différence entre prix effectif de cession et prix d'acquisition fiscal.",
  },
  {
    label: "CGI, article 200 A",
    mechanism: "Imposition forfaitaire des plus-values mobilières",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042909847",
    checked: "Vérifié le 25/05/2026",
    application: "Base de l'imposition forfaitaire à 12,8 % sur les plus-values mobilières, hors prélèvements sociaux.",
  },
  {
    label: "CGI, article 223 sexies",
    mechanism: "Contribution exceptionnelle sur les hauts revenus (CEHR)",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036427364",
    checked: "Vérifié le 28/05/2026",
    application: "Seuils CEHR 2026: 3% puis 4% selon le revenu fiscal de référence du foyer, avec seuils doublés pour l'imposition commune.",
  },
  {
    label: "CGI, article 224",
    mechanism: "Contribution différentielle sur les hauts revenus (CDHR)",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053561826/2026-05-13",
    checked: "Vérifié le 28/05/2026",
    application: "Calcul CDHR 2026: cible minimale de 20% du RFR retraité, décote d'entrée jusqu'à 330 000 € ou 660 000 €, puis imputation de l'impôt de référence majoré.",
  },
  {
    label: "CGI, article 150-0 B ter",
    mechanism: "Apport-cession et report d'imposition",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053542872",
    checked: "Vérifié le 23/05/2026",
    application: "En cas de cession des titres apportés dans les 3 ans de l'apport, un remploi éligible d'au moins 70% du produit dans les 3 ans suivant la cession maintient le report ; il ne vaut pas exonération définitive.",
  },
  {
    label: "CGI, article 199 terdecies-0 A",
    mechanism: "Activités opérationnelles éligibles au remploi",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053543691/2026-05-06",
    checked: "Vérifié le 25/05/2026",
    application: "Le renvoi de l'article 150-0 B ter cible les activités industrielles, commerciales, artisanales, agricoles ou libérales, en excluant notamment les activités financières et immobilières et la gestion de patrimoine mobilier.",
  },
  {
    label: "CGI, article 150-0 D ter",
    mechanism: "Abattement fixe dirigeant partant à la retraite",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053542877",
    checked: "Vérifié le 23/05/2026",
    application: "Abattement fixe dirigeant retraite de 500 000 €, avec cas majoré agricole à 600 000 € si les conditions sont réunies.",
  },
  {
    label: "Code civil, article 1424",
    mechanism: "Pouvoirs sur les biens communs",
    publisher: "Légifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019288940/2024-08-20",
    checked: "Vérifié le 23/05/2026",
    application: "Accord du conjoint à vérifier lorsque les titres relèvent de la communauté.",
  },
];

// ─── Boldify: converts "<b>...</b>" in strings to <b> JSX elements ───────────

function boldify(text: string): React.ReactNode {
  const parts = text.split(/(<b>[\s\S]*?<\/b>)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^<b>([\s\S]*)<\/b>$/);
        if (m) return <b key={i}>{m[1]}</b>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Segment button group ─────────────────────────────────────────────────────

function Seg({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <div className={css.seg}>
      {options.map(o => (
        <button key={o.v}
          className={`${css.segBtn} ${value === o.v ? css.segBtnOn : ""}`}
          onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Tab pane renderers ────────────────────────────────────────────────────────

function buildClientStrategies(r: AllResults): ClientStrategy[] {
  return r.strategiesByObjective[r.objective] ?? [];
}

// ─── Main compute function ────────────────────────────────────────────────────

function TabSituation({ d }: { d: DossierResult }) {
  return (
    <>
      <div className={css.recoBanner}>
        <div className={css.recoTag}>Onglet 1 - Situation du dirigeant</div>
        <h3 className={css.recoH3}>Dossier patrimonial, professionnel et familial</h3>
        <p className={css.recoP}>La saisie alimente les scénarios, les alertes de gouvernance et le rapport client.</p>
      </div>
      <div className={css.metricGrid}>
        {d.metrics.map(metric => (
          <div key={metric.label} className={css.metric}>
            <div className={css.metricLabel}>{metric.label}</div>
            <div className={css.metricValue}>{metric.value}</div>
            <p>{metric.detail}</p>
          </div>
        ))}
      </div>
      <div className={css.card}>
        <h2 className={css.cardH2}><span className={css.secNum}>A</span>Enjeux détectés</h2>
        <p className={css.sub}>Ces points servent de checklist d'audit avant tout acte ou schéma fiscal.</p>
        <div className={css.insightGrid}>
          {d.insights.map(insight => (
            <article key={insight.title} className={`${css.insight} ${insight.tone === "good" ? css.toneGood : insight.tone === "warning" ? css.toneWarning : ""}`}>
              <h3>{insight.title}</h3>
              <p>{insight.text}</p>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}

function TabScenarios({
  strategies,
  selectedId,
  onSelect,
}: {
  strategies: ClientStrategy[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = strategies.find(strategy => strategy.id === selectedId) ?? strategies.find(strategy => strategy.recommended) ?? strategies[0];
  if (!selected) return null;

  return (
    <>
      <div className={css.recoBanner}>
        <div className={css.recoTag}>Onglet 2 - Stratégies optimisées</div>
        <h3 className={css.recoH3}>Identifier la stratégie patrimoniale la plus efficiente au regard des objectifs du client</h3>
        <p className={css.recoP}>Les stratégies ci-dessous sont limitées aux options pertinentes. La recommandation retient la solution fiscalement efficiente qui répond au besoin principal et à ses contraintes de mise en oeuvre.</p>
      </div>

      <div className={css.strategyPicker}>
        {strategies.map(strategy => (
          <button
            key={strategy.id}
            type="button"
            className={`${css.choiceCard} ${selected.id === strategy.id ? css.choiceCardOn : ""} ${strategy.recommended ? css.choiceCardRecommended : ""}`}
            onClick={() => onSelect(strategy.id)}
          >
            <span className={css.choiceFamily}>{strategy.family}</span>
            {strategy.recommended && <span className={css.choiceBadge}>Recommandée</span>}
            <h3>{strategy.title}</h3>
            <p>{strategy.summary}</p>
            <div className={css.choiceMeta}>
              <span>Impôt estimé</span>
              <b>{euro(strategy.tax)}</b>
            </div>
            <div className={css.choiceMeta}>
              <span>Délai</span>
              <b>{strategy.delay}</b>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className={css.strategyDetail}>
          <div className={css.detailHeader}>
            <div>
              <span className={css.choiceFamily}>{selected.family}</span>
              <h3>{selected.title}</h3>
              <p>{selected.recommendationReason}</p>
            </div>
            <div className={css.detailTax}>
              <span>Montant d'impôt estimé</span>
              <b>{euro(selected.tax)}</b>
            </div>
          </div>

          <div className={css.detailGrid}>
            <section>
              <h4>Pourquoi cette stratégie correspond au dossier</h4>
              <ul className={css.detailList}>
                {selected.fit.map(item => <li key={item}>{item}</li>)}
              </ul>
            </section>
            <section>
              <h4>Conditions à respecter</h4>
              <ul className={css.detailList}>
                {selected.conditions.map(item => <li key={item}>{boldify(item)}</li>)}
              </ul>
            </section>
          </div>

          <section>
            <h4>Processus de mise en place</h4>
            <ol className={css.compactPlan}>
              {selected.process.map(item => <li key={item}>{boldify(item)}</li>)}
            </ol>
          </section>
        </div>
      )}
    </>
  );
}

const STRATEGY_SOURCE_LABELS: Record<string, string[]> = {
  "family-main": [
    "CGI, article 787 B",
    "BOI-ENR-DMTG-10-20-40-10",
    "Loi de finances 2026, article 8",
    "CGI, article 669",
    "CGI, article 777",
    "CGI, article 779",
    "CGI, article 784",
    "Code civil, article 1424",
  ],
  "family-dismembered": [
    "CGI, article 669",
    "CGI, article 777",
    "CGI, article 779",
    "CGI, article 784",
    "Code civil, article 1424",
  ],
  "family-simple": [
    "CGI, article 777",
    "CGI, article 779",
    "CGI, article 784",
    "Code civil, article 1424",
  ],
  "sale-main": [
    "CGI, article 150-0 B ter",
    "CGI, article 199 terdecies-0 A",
    "Loi de finances 2026, article 11",
    "CGI, article 150-0 D",
    "CGI, article 200 A",
    "CGI, article 223 sexies",
    "CGI, article 224",
  ],
  "sale-retirement": [
    "CGI, article 150-0 D ter",
    "CGI, article 150-0 D",
    "CGI, article 200 A",
    "CGI, article 223 sexies",
    "CGI, article 224",
  ],
  "sale-direct": [
    "CGI, article 150-0 D",
    "CGI, article 200 A",
    "CGI, article 223 sexies",
    "CGI, article 224",
  ],
  "liquidity-partial": [
    "CGI, article 150-0 D",
    "CGI, article 200 A",
    "CGI, article 223 sexies",
    "CGI, article 224",
  ],
  "liquidity-direct": [
    "CGI, article 150-0 D",
    "CGI, article 200 A",
    "CGI, article 223 sexies",
    "CGI, article 224",
  ],
  "liquidity-retirement": [
    "CGI, article 150-0 D ter",
    "CGI, article 150-0 D",
    "CGI, article 200 A",
    "CGI, article 223 sexies",
    "CGI, article 224",
  ],
  "spouse-death": [
    "CGI, article 796-0 bis",
    "Code civil, article 1094-1",
    "Code civil, article 515-6",
  ],
  "spouse-usufruct": [
    "CGI, article 669",
    "CGI, article 777",
    "CGI, article 790 E",
    "CGI, article 790 F",
    "CGI, article 784",
    "Code civil, article 1424",
  ],
  "spouse-full": [
    "CGI, article 777",
    "CGI, article 790 E",
    "CGI, article 790 F",
    "CGI, article 784",
    "Code civil, article 1424",
  ],
  "spouse-required": [
    "Code civil, article 1094-1",
    "Code civil, article 515-6",
  ],
};

const STRATEGY_LEGAL_GUARDRAILS: Record<string, string[]> = {
  "family-main": [
    "Signer et dater l'engagement collectif de conservation avant la donation, puis suivre l'engagement individuel de 6 ans.",
    "Conserver une fonction de direction conforme et documentée pendant la période requise.",
    "Isoler les actifs non exclusivement professionnels pour éviter une exonération Dutreil indue.",
    "Recenser, pour chaque donateur et chaque enfant, les donations de moins de 15 ans afin d'appliquer le rappel fiscal (CGI, art. 784).",
    "Formaliser dans les actes et statuts les droits de vote, dividendes et décisions entre usufruitier et nu-propriétaire.",
    "Conserver les preuves (actes, registres, déclarations) pour répondre à un contrôle fiscal.",
  ],
  "family-dismembered": [
    "Valoriser la nue-propriété selon l'âge de chaque usufruitier et le barème fiscal en vigueur à la date de donation, puis l'indiquer dans l'acte.",
    "Rédiger les clauses de gouvernance usufruit/nue-propriété pour sécuriser le contrôle effectif post-opération.",
    "Vérifier les abattements disponibles et les donations de moins de 15 ans par donateur et par enfant avant signature (CGI, art. 784).",
    "Déposer la déclaration et payer les droits dans les délais légaux.",
  ],
  "family-simple": [
    "Justifier la valorisation des titres à la date de la donation pour limiter le risque de rectification.",
    "Vérifier les abattements et les tranches encore disponibles en tenant compte des donations de moins de 15 ans (CGI, art. 784).",
    "Sécuriser l'accord du conjoint lorsque les titres relèvent d'un régime communautaire.",
    "Conserver tous les justificatifs de valorisation et de déclaration.",
  ],
  "sale-main": [
    "L'apport des titres à la holding doit intervenir avant toute cession juridiquement engagée.",
    "Respecter le remploi minimal exigé et son calendrier, avec traçabilité complète des investissements.",
    "Qualifier chaque emploi du quota : activité opérationnelle éligible, participation/souscription admissible ou véhicule de capital-investissement autorisé ; exclure les activités financières et immobilières visées par le texte.",
    "Ne pas présenter la fraction de 30% hors obligation de remploi comme exonérée : elle demeure dans la holding et toute appréhension personnelle appelle sa propre analyse fiscale.",
    "Justifier la substance économique du montage pour éviter un risque d'abus de droit.",
    "Conserver les pièces de suivi post-cession (PV, contrats, flux et remploi).",
  ],
  "sale-retirement": [
    "Documenter strictement le calendrier de départ en retraite et de cession pour maintenir l'abattement.",
    "Tracer la cessation des fonctions et la liquidation des droits selon les délais applicables.",
    "Conserver les justificatifs de calcul de plus-value, de RFR et de déclaration.",
    "Vérifier en amont les conditions d'éligibilité avec l'avocat fiscaliste avant signature des actes.",
  ],
  "sale-direct": [
    "Justifier le prix de cession et le prix de revient fiscal pour limiter le risque de redressement sur la plus-value.",
    "Anticiper CEHR/CDHR et sécuriser la cohérence de la déclaration annuelle.",
    "Conserver les actes de cession, calculs fiscaux et preuves de paiement.",
    "Préparer un dossier de réponse en cas de demande de l'administration fiscale.",
  ],
  "liquidity-partial": [
    "Identifier précisément le besoin de liquidités et la fraction de titres à céder pour éviter une sortie excessive.",
    "Justifier le prix des titres cédés et la ventilation proportionnelle du prix de revient fiscal.",
    "Vérifier les effets sur le contrôle, les statuts et les éventuels droits de préemption.",
    "Déclarer la plus-value et conserver l'acte de cession et les preuves de paiement.",
  ],
  "liquidity-direct": [
    "Documenter la valorisation, le prix de revient et le calendrier de disponibilité effective du prix.",
    "Prévoir les garanties de cession et la sécurisation du paiement par l'acquéreur.",
    "Déclarer la plus-value et anticiper l'impact CEHR/CDHR.",
  ],
  "liquidity-retirement": [
    "Vérifier la cessation des fonctions et la liquidation des droits à retraite dans le calendrier légal.",
    "Vérifier l'étendue des titres cédés exigée pour l'abattement retraite.",
    "Documenter le prix, le paiement et le calcul des prélèvements restant dus.",
  ],
  "spouse-death": [
    "Rédiger l'acte avec le notaire : donation entre époux au dernier vivant pour les époux, ou testament pour les partenaires de PACS.",
    "Vérifier la présence d'enfants, la réserve héréditaire et les options réellement ouvertes au survivant.",
    "Identifier les titres professionnels concernés et anticiper leur gouvernance au décès.",
    "Conserver l'acte et organiser sa révision en cas d'évolution familiale ou capitalistique.",
  ],
  "spouse-usufruct": [
    "Constater la donation de l'usufruit des titres par acte et valoriser l'usufruit selon l'âge du bénéficiaire.",
    "Appliquer l'abattement entre conjoints ou partenaires et le rappel fiscal des donations antérieures.",
    "Organiser dans les statuts les droits aux dividendes et les droits de vote entre nu-propriétaire et usufruitier.",
    "Vérifier que la donation ne compromet pas la gouvernance de l'entreprise.",
  ],
  "spouse-full": [
    "Définir précisément la fraction des titres donnée au conjoint ou partenaire et justifier sa valeur.",
    "Appliquer l'abattement entre conjoints ou partenaires et le rappel fiscal des donations antérieures.",
    "Vérifier l'impact sur le contrôle de la société et les droits de vote.",
    "Réaliser l'acte et les formalités déclaratives dans les délais.",
  ],
  "spouse-required": [
    "L'objectif de protection suppose de renseigner un époux ou partenaire de PACS bénéficiaire.",
  ],
};

const DUTREIL_NON_PRO_ASSET_CONDITIONS: string[] = [
  "Identifier et extraire de l'assiette Dutreil les actifs non exclusivement affectés à l'activité opérationnelle.",
  "Exemples à traiter comme non exclusivement professionnels: logements/résidences, véhicules de tourisme, yachts et bateaux de plaisance, aéronefs, bijoux, objets d'art, vins/alcools, chevaux de course/concours, biens de chasse et de pêche.",
  "Traiter avec prudence les actifs à usage mixte (professionnel + personnel): la fraction non professionnelle ne doit pas bénéficier de l'exonération de 75%.",
  "Respecter la période de suivi: au moins 3 ans avant la transmission (ou depuis l'acquisition si plus récent) et jusqu'au terme des engagements Dutreil.",
  "Appliquer la même revue aux actifs détenus via les sociétés contrôlées (contrôle direct ou indirect).",
];

const DUTREIL_LEGAL_CONDITIONS: string[] = [
  "Vérifier que la société exerce une activité éligible ou constitue une holding animatrice démontrable (CGI, art. 787 B).",
  "Formaliser l'engagement collectif de conservation de 2 ans ou documenter le dispositif réputé acquis, avant la transmission (CGI, art. 787 B).",
  "Faire souscrire aux bénéficiaires l'engagement individuel de conservation de 6 ans applicable depuis la loi de finances 2026 (CGI, art. 787 B ; loi de finances 2026, art. 8).",
  "Justifier la fonction de direction exercée pendant la durée requise et conserver les preuves associées (CGI, art. 787 B).",
  "Identifier les actifs non exclusivement professionnels qui ne bénéficient pas de l'exonération partielle (loi de finances 2026, art. 8).",
];

const DEMEMBREMENT_SOLO_LEGAL_CONDITIONS: string[] = [
  "La donation démembrée doit être constatée par acte notarié, avec une rédaction précise sur les droits de l'usufruitier et du nu-propriétaire (Code civil, art. 931).",
  "La valeur taxable de la nue-propriété doit être calculée à la date de l'acte selon l'âge de chaque usufruitier qui conserve des droits, puis reprise de façon cohérente dans la déclaration (CGI, art. 669).",
  "Les statuts et, si nécessaire, un pacte doivent organiser les décisions collectives (vote, dividendes, réserves) pour éviter un conflit de gouvernance après transmission (Code civil, art. 578 et s.).",
  "Les abattements et tranches disponibles doivent être vérifiés avant signature par donateur et par enfant, en tenant compte des donations de moins de 15 ans (CGI, art. 779, 784 ; barème CGI, art. 777).",
  "Les formalités déclaratives et le paiement des droits doivent être effectués dans les délais, avec conservation de tous les justificatifs (valorisation, acte, calculs) (CGI, art. 635).",
];

const DONATION_SIMPLE_LEGAL_CONDITIONS: string[] = [
  "Justifier la valeur vénale des titres donnés à la date de l'acte et conserver les éléments de valorisation.",
  "Vérifier les donations de moins de 15 ans par donateur et par enfant afin d'appliquer les abattements et tranches déjà consommés (CGI, art. 779 et 784).",
  "Constater la donation par l'acte approprié et effectuer les formalités déclaratives avec paiement des droits dans les délais.",
  "Obtenir l'accord du conjoint lorsque la nature des titres ou le régime matrimonial l'impose (Code civil, art. 1424).",
];

const APPORT_CESSION_REMPLOI_CONDITIONS: string[] = [
  "Avantage pratique : seule une fraction minimale de 70% du produit doit être remployée. Jusqu'à 30% du produit peut rester disponible dans la holding sans remettre en cause le report du seul fait du quota.",
  "Attention : ces 30% ne sont pas exonérés et ne sont pas disponibles personnellement au dirigeant en franchise d'impôt. La plus-value d'apport demeure en report et une distribution ou une sortie ultérieure doit être analysée fiscalement.",
  "La clause de remploi ne crée pas un nouveau report : elle permet de maintenir le report d'imposition initial de la plus-value d'apport si ses conditions sont remplies (CGI, art. 150-0 B ter).",
  "Elle devient déterminante lorsque la holding bénéficiaire de l'apport cède les titres apportés dans les 3 ans suivant l'apport.",
  "La holding doit alors prendre l'engagement de remployer au moins 70% du produit de cession dans les 3 ans suivant la cession, conformément à la loi de finances 2026.",
  "Remploi direct dans l'activité de la holding : financement de moyens permanents d'exploitation affectés à une activité industrielle, commerciale, artisanale, agricole ou libérale éligible.",
  "Remploi en entreprises : acquisition d'une participation ou souscription en numéraire au capital initial ou à une augmentation de capital d'une société exerçant une activité éligible, dans les conditions de contrôle et de qualification prévues par le texte.",
  "Remploi via capital-investissement : souscription de parts ou actions de véhicules éligibles tels que FCPR, FPCI, SLP ou SCR, sous réserve de leurs quotas et obligations propres.",
  "Sont notamment exclus : activités financières, gestion du propre patrimoine mobilier, activités immobilières, construction d'immeubles en vue de la vente ou de la location, et gestion du propre patrimoine immobilier de la holding.",
  "À défaut de remploi conforme, ou en cas de sortie ultérieure entraînant la fin du report, la plus-value reportée redevient imposable selon les règles applicables.",
  "Conserver une piste d'audit complète : acte d'apport, engagement de remploi, actes de cession, preuves de décaissement, nature des investissements et échéancier de suivi.",
];

function isSaleStrategy(strategy: ClientStrategy): boolean {
  return strategy.id.startsWith("sale-") || strategy.id.startsWith("liquidity-");
}

function scopedSources(dossier: DossierResult, strategy: ClientStrategy): SourceItem[] {
  const labels = STRATEGY_SOURCE_LABELS[strategy.id] ?? [];
  let filtered = dossier.sources.filter(source => labels.includes(source.label));
  if (strategy.id === "spouse-death") {
    filtered = filtered.filter(source => strategy.title.includes("Testament")
      ? source.label !== "Code civil, article 1094-1"
      : source.label !== "Code civil, article 515-6");
  }
  if (strategy.id === "spouse-usufruct" || strategy.id === "spouse-full") {
    filtered = filtered.filter(source => strategy.family.includes("PACS")
      ? source.label !== "CGI, article 790 E" && source.label !== "Code civil, article 1424"
      : source.label !== "CGI, article 790 F");
  }
  return filtered.length > 0 ? filtered : dossier.sources;
}

function TabJuridique({ d, strategy }: { d: DossierResult; strategy: ClientStrategy }) {
  const sources = scopedSources(d, strategy);
  const guardrails = STRATEGY_LEGAL_GUARDRAILS[strategy.id] ?? [];
  const showDutreilFocus = strategy.id === "family-main";
  const showRemploiFocus = strategy.id === "sale-main";
  const showLegalFocus = showDutreilFocus || showRemploiFocus;
  const pointBConditions = strategy.id === "family-dismembered"
    ? DEMEMBREMENT_SOLO_LEGAL_CONDITIONS
    : strategy.id === "family-simple"
      ? DONATION_SIMPLE_LEGAL_CONDITIONS
      : strategy.id === "family-main"
        ? DUTREIL_LEGAL_CONDITIONS
        : strategy.conditions;

  return (
    <>
      <div className={css.recoBanner}>
        <div className={css.recoTag}>Onglet 3 - Analyse juridique</div>
        <h3 className={css.recoH3}>Articles applicables et conditions de validité fiscale</h3>
        <p className={css.recoP}>Stratégie active: <b>{strategy.title}</b>. Les points ci-dessous ciblent la sécurisation fiscale du montage.</p>
      </div>

      <div className={`${css.grid} ${css.juridiqueGrid}`}>
        <div className={`${css.card} ${showLegalFocus ? css.juridiqueCardA : css.juridiqueCardACompact} ${css.cardBottomSpace}`}>
          <h2 className={css.cardH2}><span className={css.secNum}>A</span>Articles en rapport avec la stratégie</h2>
          <ul className={css.detailList}>
            {sources.map(source => (
              <li key={source.label}>
                <b>{source.label}</b> — {source.mechanism}
                <br />
                {source.application}
                <br />
                <a href={source.url} target="_blank" rel="noreferrer" className={css.sourceLink}>Ouvrir l'article officiel</a>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${css.card} ${css.juridiqueCardB}`}>
          <h2 className={css.cardH2}><span className={css.secNum}>B</span>Conditions à respecter</h2>
          <ul className={css.detailList}>
            {pointBConditions.map(item => <li key={item}>{boldify(item)}</li>)}
          </ul>
        </div>

        {showDutreilFocus && (
          <div className={`${css.card} ${css.focusCardOnGrid} ${css.cardBottomSpace}`}>
            <h2 className={css.cardH2}><span className={css.secNum}>C</span>Focus sur les actifs non exclusivement professionnels</h2>
            <ul className={css.detailList}>
              {DUTREIL_NON_PRO_ASSET_CONDITIONS.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}

        {showRemploiFocus && (
          <div className={`${css.card} ${css.focusCardOnGrid} ${css.cardBottomSpace}`}>
            <h2 className={css.cardH2}><span className={css.secNum}>C</span>Clause de remploi, trésorerie disponible et maintien du report</h2>
            <ul className={css.detailList}>
              {APPORT_CESSION_REMPLOI_CONDITIONS.map(item => <li key={item}>{boldify(item)}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className={`${css.card} ${css.cardBottomSpace} ${css.juridiqueCardD}`}>
        <h2 className={css.cardH2}><span className={css.secNum}>D</span>Points de vigilance anti-remise en cause</h2>
        <ul className={css.detailList}>
          {guardrails.map(item => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </>
  );
}

function TabFiscal({ d, strategy }: { d: DossierResult; strategy: ClientStrategy }) {
  const fiscalLines = d.fiscalLinesByStrategy[strategy.id] ?? d.fiscalLines;
  const fiscalWatch = d.fiscalWatchByStrategy[strategy.id] ?? [];
  const calculationTitle = isSaleStrategy(strategy)
    ? "Calcul pas à pas de la cession"
    : strategy.id.startsWith("spouse-")
      ? "Calcul pas à pas de la protection du conjoint"
      : "Calcul pas à pas de la donation";

  return (
    <>
      <div className={css.recoBanner}>
        <div className={css.recoTag}>Onglet 4 - Analyse fiscale</div>
        <h3 className={css.recoH3}>Chiffrage ciblé sur la stratégie sélectionnée</h3>
        <p className={css.recoP}>Stratégie active: <b>{strategy.title}</b>.</p>
      </div>

      <div className={css.card}>
        <h2 className={css.cardH2}><span className={css.secNum}>A</span>{calculationTitle}</h2>
        <div className={css.tableScroll}>
          <table className={css.dataTable}>
            <thead>
              <tr>
                <th>Étape</th>
                <th>Calcul / assiette</th>
                <th style={{ textAlign: "right" }}>Montant retenu</th>
                <th>Règle mobilisée</th>
              </tr>
            </thead>
            <tbody>
              {fiscalLines.map(line => (
                <tr key={line.label} className={line.total ? css.trTotal : undefined}>
                  <td>{line.label}</td>
                  <td>{line.base}</td>
                  <td className={css.tdNum}>{euro(line.amount)}</td>
                  <td>{line.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={css.card}>
        <h2 className={css.cardH2}><span className={css.secNum}>B</span>Points de vigilance</h2>
        <ul className={css.detailList}>
          {fiscalWatch.map(item => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </>
  );
}

function TabSources({ d, strategy }: { d: DossierResult; strategy: ClientStrategy }) {
  const sources = scopedSources(d, strategy);
  const watchByStrategy: Record<string, string[]> = {
    "family-main": [
      "Contrôler l'éligibilité au régime Dutreil, les engagements de conservation et les actifs exclus de l'exonération.",
      "Journaliser les actes de donation, la valorisation de la nue-propriété et les abattements utilisés.",
      "Conserver les preuves de direction et les clauses de gouvernance applicables après transmission.",
    ],
    "family-dismembered": [
      "Journaliser l'acte de donation démembrée, l'âge de chaque usufruitier et la valorisation de la nue-propriété.",
      "Contrôler les donations antérieures, les abattements utilisés et le paiement des droits.",
      "Conserver les clauses organisant usufruit, nue-propriété, droits de vote et distributions.",
    ],
    "family-simple": [
      "Archiver l'acte de donation en pleine propriété et les justificatifs de valorisation des titres.",
      "Contrôler les donations antérieures, les abattements utilisés et le paiement des droits.",
      "Vérifier l'accord du conjoint lorsque la détention ou le régime matrimonial l'exige.",
    ],
    "sale-main": [
      "Tracer le calendrier apport/cession et la clause de remploi : cession dans les 3 ans de l'apport, engagement d'investir au moins 70% du prix dans les 3 ans suivant la cession.",
      "Qualifier les remploi éligibles : outils ou moyens d'exploitation, participation ou souscription au capital d'une société opérationnelle admise, ou FCPR/FPCI/SLP/SCR respectant leurs conditions.",
      "Écarter les activités financières, les placements de patrimoine mobilier, les activités immobilières et la gestion immobilière propre ; le remploi maintient le report mais ne crée pas à lui seul une exonération définitive.",
      "Documenter la fraction de produit non soumise au quota de remploi : elle peut rester dans la holding, mais sa distribution au dirigeant relève d'une fiscalité distincte.",
      "Contrôler les impacts RFR, CEHR et CDHR avec la déclaration réelle.",
      "Archiver les justificatifs de prix de revient, d'apport, de cession et de remploi.",
    ],
    "sale-retirement": [
      "Documenter la cessation des fonctions et la liquidation des droits à retraite dans le calendrier requis.",
      "Contrôler le calcul de plus-value, le RFR, la CEHR et la CDHR.",
      "Archiver les justificatifs permettant de maintenir l'abattement retraite.",
    ],
    "sale-direct": [
      "Justifier le prix de cession et le prix de revient fiscal retenus.",
      "Contrôler le calcul de plus-value, le RFR, la CEHR et la CDHR.",
      "Archiver l'acte de cession et les preuves de paiement des impositions.",
    ],
    "liquidity-partial": [
      "Tracer le besoin net demandé, la fraction de titres cédée et le solde conservé par le dirigeant.",
      "Justifier la valorisation et la quote-part de prix de revient fiscal rattachée aux seuls titres cédés.",
      "Archiver l'acte, les flux effectivement encaissés et la déclaration de plus-value.",
    ],
    "liquidity-direct": [
      "Justifier le prix de cession, le prix de revient fiscal et la date de disponibilité du prix.",
      "Contrôler la plus-value, la CEHR et la CDHR avec les revenus déclarés.",
      "Archiver les garanties de paiement et les justificatifs fiscaux.",
    ],
    "liquidity-retirement": [
      "Vérifier le calendrier légal entre cession, cessation des fonctions et liquidation de retraite.",
      "Conserver les justificatifs de l'abattement ainsi que le calcul des prélèvements restant applicables.",
      "Contrôler la disponibilité nette réellement obtenue après impôts.",
    ],
    "spouse-death": [
      "Conserver l'acte notarié ou le testament et le rapprocher de la situation matrimoniale actuelle.",
      "Réviser la protection en cas de changement familial, de statuts ou de capital de l'entreprise.",
      "Tracer les choix de gouvernance nécessaires si le conjoint reçoit les titres au décès.",
    ],
    "spouse-usufruct": [
      "Archiver l'acte de donation, l'âge du bénéficiaire et la valeur de l'usufruit retenue.",
      "Vérifier l'abattement conjoint ou PACS, ainsi que les donations reçues depuis moins de 15 ans.",
      "Conserver les clauses de répartition des dividendes et des droits de vote.",
    ],
    "spouse-full": [
      "Justifier la fraction de titres donnée et la valorisation à la date de l'acte.",
      "Vérifier l'abattement conjoint ou PACS et les donations antérieures rapportables.",
      "Documenter les nouveaux droits de vote et l'équilibre de contrôle.",
    ],
    "spouse-required": [
      "Identifier un bénéficiaire éligible avant toute recommandation de protection du conjoint.",
    ],
  };
  const watchItems = watchByStrategy[strategy.id] ?? [];
  return (
    <>
      <div className={css.recoBanner}>
        <div className={css.recoTag}>Onglet 5 - Documentation et sources</div>
        <h3 className={css.recoH3}>Sources ciblées sur la stratégie sélectionnée</h3>
        <p className={css.recoP}>Stratégie active: <b>{strategy.title}</b>.</p>
      </div>
      <div className={css.sourceGrid}>
        {sources.map(source => (
          <article key={source.label} className={css.sourceCard}>
            <div className={css.sourceMeta}>
              <span>{source.publisher}</span>
              <span>{source.checked}</span>
            </div>
            <h2>{source.label}</h2>
            <p className={css.sourceMechanism}>{source.mechanism}</p>
            <p>{source.application}</p>
            <a href={source.url} target="_blank" rel="noreferrer" className={css.sourceLink}>Ouvrir la source officielle</a>
          </article>
        ))}
      </div>
      <div className={css.card}>
        <h2 className={css.cardH2}><span className={css.secNum}>V</span>Veille de cette stratégie</h2>
        <div className={css.watchGrid}>
          {watchItems.map(item => <p key={item}>{item}</p>)}
        </div>
      </div>
    </>
  );
}

function TabReport({ d, strategy, context }: { d: DossierResult; strategy: ClientStrategy; context: CtxItem[] }) {
  const sources = scopedSources(d, strategy);
  return (
    <div className={css.reportSheet} id="client-report">
      <div className={css.reportActions}>
        <button className={css.btnPrimary} onClick={() => window.print()}>Imprimer / enregistrer en PDF</button>
      </div>
      <header className={css.reportHeader}>
        <p>Rapport client - Patrimoine professionnel du dirigeant</p>
        <h2>{strategy.title}</h2>
        <span>Montant fiscal estimé pour la stratégie retenue : {euro(strategy.tax)}. Le rapport reprend uniquement les éléments utiles à cette option.</span>
      </header>
      <section>
        <h3>1. Synthèse ciblée de la situation</h3>
        <div className={css.metricGrid}>
          {context.map(item => (
            <div key={item.label} className={css.metric}>
              <div className={css.metricLabel}>{item.label}</div>
              <p>{boldify(item.content)}</p>
            </div>
          ))}
        </div>
      </section>
      <section className={css.reportGrid}>
        <div>
          <h3>2. Pourquoi ce choix</h3>
          <ul className={css.detailList}>{strategy.fit.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h3>3. Conditions à respecter</h3>
          <ul className={css.detailList}>
            {strategy.conditions.map(item => <li key={item}>{boldify(item)}</li>)}
          </ul>
        </div>
      </section>
      <section>
        <h3>4. Processus de mise en place</h3>
        <ol className={css.compactPlan}>
          {strategy.process.map(item => <li key={item}>{boldify(item)}</li>)}
        </ol>
      </section>
      <section>
        <h3>5. Références à annexer</h3>
        <div className={css.referenceLine}>{sources.map(source => source.label).join(" | ")}</div>
      </section>
    </div>
  );
}

function compute(form: FormState, segs: SegState): AllResults {
  const {
    age, ageMadame, enfants, donationsAnterieuresMonsieur, donationsAnterieuresMadame,
    donationsAnterieuresConjoint,
    regime, residence, secteur, valeur, quotepart, prixrevient,
    plusvalues, revenusDirigeant, dividendes, autresrev,
    personnesCharge, actifsExclusDutreil, holding, statut, situation,
    besoinLiquidite, partProtectionConjoint, besoinConjoint, objectif, controle,
  } = form;
  const couple = situation === "marié" || situation === "pacsé";
  const Vtot = Math.max(0, valeur);
  const rawQuotePart = Math.min(100, Math.max(0, quotepart));
  const PR = Math.max(0, prixrevient);
  const autres = Math.max(0, autresrev);
  const dependentsForCdhr = Math.max(0, Math.round(personnesCharge));
  const { dutreil, retraite, reinvest, repreneurs, conserver, demembrement, coupleDetention, jeuneAgriculteur } = segs;
  const coupleHeldCompany = objectif === "transmission" && couple && rawQuotePart < 100 && coupleDetention === "oui";
  const analyzedQuotePart = coupleHeldCompany ? 100 : rawQuotePart;
  const V = Vtot * analyzedQuotePart / 100;
  const actifsExclusDutreilPart = Math.min(V, Math.max(0, actifsExclusDutreil) * analyzedQuotePart / 100);
  const dutreilEligibleValue = Math.max(0, V - actifsExclusDutreilPart);
  const enfantsN = Math.max(1, enfants);
  const secteurNonElig = secteur === "holding_passive" || secteur === "immobilier" || holding === "passive";
  const dutreilOK = dutreil === "oui" && !secteurNonElig;
  const q = quotiteNP(age);
  const qMadame = quotiteNP(ageMadame);
  const donorCount = coupleHeldCompany ? 2 : 1;
  const donorLabel = coupleHeldCompany ? "dirigeant + Madame" : "dirigeant";
  const donationDonors: DonorDonationData[] = coupleHeldCompany
    ? [
      { label: "Monsieur", share: rawQuotePart / 100, previousPerChild: donationsAnterieuresMonsieur, usufructuaryAge: age, bareOwnershipRate: q },
      { label: "Madame", share: (100 - rawQuotePart) / 100, previousPerChild: donationsAnterieuresMadame, usufructuaryAge: ageMadame, bareOwnershipRate: qMadame },
    ]
    : [{ label: "Monsieur", share: 1, previousPerChild: donationsAnterieuresMonsieur, usufructuaryAge: age, bareOwnershipRate: q }];
  const dismemberedValue = (base: number) => donationDonors.reduce(
    (total, donor) => total + base * donor.share * donor.bareOwnershipRate,
    0,
  );
  const dismembermentBase = (base: number) => coupleHeldCompany
    ? donationDonors.map(donor => `${donor.label}: ${euro(base * donor.share)} x nue-propriété ${Math.round(donor.bareOwnershipRate * 100)}% à ${donor.usufructuaryAge} ans`).join(" + ")
    : `${euro(base)} x nue-propriété ${Math.round(q * 100)}% à ${age} ans`;
  const dismembermentRuleDetail = coupleHeldCompany
    ? `Monsieur: nue-propriété ${Math.round(q * 100)}% à ${age} ans ; Madame: nue-propriété ${Math.round(qMadame * 100)}% à ${ageMadame} ans`
    : `nue-propriété ${Math.round(q * 100)}% à ${age} ans`;
  const dismembermentRule = coupleHeldCompany
    ? "Quotité de nue-propriété selon l'âge de chaque usufruitier."
    : "Quotité de nue-propriété selon l'âge de l'usufruitier.";
  const dismemberedStrategyName = coupleHeldCompany
    ? `Donation démembrée (NP M. ${Math.round(q * 100)}% / Mme ${Math.round(qMadame * 100)}%)`
    : `Donation démembrée (NP ${Math.round(q * 100)}%)`;

  // Context items
  const regimeLabels: Record<string, string> = {
    communaute_legale: "Communauté légale",
    communaute_universelle: "Communauté universelle",
    separation: "Séparation de biens",
    participation: "Participation aux acquêts",
    separation_societe: "Séparation avec société d'acquêts",
    pacs: "PACS",
    etranger: "Régime étranger",
    celibataire: "Célibataire / Veuf / Divorcé",
  };
  const effectiveRegime = situation === "pacsé" ? "pacs" : regime;
  const titresCommuns = effectiveRegime === "communaute_legale" || effectiveRegime === "communaute_universelle";
  const regimeNote = titresCommuns
    ? "Titres potentiellement <b>communs</b> : l'accord du conjoint est requis pour donner ou céder (art. 1424 C. civ.)."
    : (effectiveRegime === "separation" || effectiveRegime === "separation_societe" || effectiveRegime === "participation")
      ? "Titres en principe <b>propres</b> au dirigeant : il en dispose seul."
      : effectiveRegime === "etranger"
        ? "Régime <b>étranger</b> : vérifier la loi applicable (Règlement UE 2016/1103)."
        : effectiveRegime === "pacs"
          ? "Partenaires pacsés : identifier la propriété des titres et coordonner toute protection successorale avec un testament."
          : "Pas de conjoint à protéger dans l'analyse patrimoniale.";
  const controleLabels: Record<string, string> = {
    conserver: "conserver le contrôle",
    partage: "partager le contrôle",
    sortie: "transférer ou sortir du contrôle",
  };
  const wantsControl = controle === "conserver";
  const acceptsSharedControl = controle === "partage";
  const transfersControl = controle === "sortie";
  const familyMainUsesDismemberment = !transfersControl;
  const partAnalysis = coupleHeldCompany
    ? "Quote-part du dirigeant : <b>" + rawQuotePart + "%</b>. Entreprise déclarée détenue par le couple : assiette simulée sur <b>100%</b> des titres = <b>" + euro(V) + "</b>."
    : "Quote-part du dirigeant : <b>" + rawQuotePart + "%</b> de " + euro(Vtot) + " = <b>" + euro(V) + "</b>";
  const matrimonialContext: CtxItem = { label: "Régime matrimonial ou partenariat", content: (regimeLabels[effectiveRegime] ?? effectiveRegime) + " — " + regimeNote };
  const sharesContext: CtxItem = { label: "Part analysée", content: partAnalysis };
  const dismemberedControlContext: CtxItem = {
    label: "Contrôle visé",
    content: (controleLabels[controle] ?? controle) + (wantsControl
      ? " — le démembrement est prioritaire pour conserver l'usufruit, les revenus et une gouvernance encadrée."
      : acceptsSharedControl
        ? " — le démembrement reste pertinent, mais les statuts doivent organiser le partage progressif des décisions."
        : " — la pleine propriété devient plus cohérente qu'une réserve d'usufruit si le dirigeant veut réellement sortir du pouvoir."),
  };
  const fullOwnershipControlContext: CtxItem = {
    label: "Contrôle visé",
    content: (controleLabels[controle] ?? controle) + (transfersControl
      ? " — la pleine propriété est cohérente avec un transfert immédiat des droits politiques et financiers."
      : " — vigilance : la pleine propriété transfère les droits attachés aux titres donnés et peut contredire l'objectif de contrôle."),
  };
  const successorsContext: CtxItem = {
    label: "Repreneurs",
    content: repreneurs === "oui" ? "Enfant(s) repreneur(s) identifié(s) : transmission familiale facilitée." : "Pas de repreneur familial identifié : prévoir la gouvernance et l'équilibre entre bénéficiaires.",
  };
  const priorGiftsContext: CtxItem = {
    label: "Rappel fiscal",
    content: `Donations de moins de 15 ans saisies, par enfant : ${donationDonors.map(donor => `<b>${donor.label} ${euro(Math.max(0, donor.previousPerChild))}</b>`).join(" ; ")}. Les reliquats d'abattement sont intégrés au chiffrage.`,
  };
  const dismembermentContext: CtxItem = {
    label: "Démembrement",
    content: `${dismembermentRuleDetail}. ${demembrement === "oui" ? "Un démembrement existant est déclaré : rapprocher les actes antérieurs." : "Aucun démembrement antérieur déclaré."}`,
  };
  const fullOwnershipContext: CtxItem = {
    label: "Donation en pleine propriété",
    content: demembrement === "oui"
      ? "Un démembrement existant est déclaré : vérifier que les titres à donner sont disponibles en pleine propriété."
      : "Transmission simulée en pleine propriété, sans réserve d'usufruit.",
  };
  const dutreilContext: CtxItem = {
    label: "Pacte Dutreil",
    content: dutreilOK
      ? actifsExclusDutreilPart > 0
        ? `Éligibilité déclarée retenue pour le calcul. Actifs non exclusivement professionnels exclus de l'exonération : <b>${euro(actifsExclusDutreilPart)}</b>.`
        : "Éligibilité déclarée retenue pour le calcul. Aucun actif non exclusivement professionnel n'est saisi comme exclu de l'exonération."
      : "Le régime Dutreil n'est pas retenu au regard de l'activité ou de la holding renseignée.",
  };
  const familySharedContext = [matrimonialContext, sharesContext, successorsContext, priorGiftsContext];
  const ctx: CtxItem[] = [...familySharedContext, dismemberedControlContext, dismembermentContext];
  const contextByStrategy: Record<string, CtxItem[]> = {
    "family-main": [...familySharedContext, familyMainUsesDismemberment ? dismemberedControlContext : fullOwnershipControlContext, dutreilContext, familyMainUsesDismemberment ? dismembermentContext : fullOwnershipContext],
    "family-dismembered": [...familySharedContext, dismemberedControlContext, dismembermentContext],
    "family-simple": [...familySharedContext, fullOwnershipControlContext, fullOwnershipContext],
    "sale-main": [
      matrimonialContext,
      sharesContext,
      { label: "Objectif de cession", content: reinvest === "oui" ? "Projet de remploi éligible déclaré : l'apport-cession peut être examiné avant la vente." : "Aucun remploi éligible déclaré : le report d'imposition ne peut pas être présumé." },
      { label: "Clause de remploi", content: "Si la holding cède les titres dans les 3 ans de l'apport, le report n'est maintenu que si elle s'engage à réinvestir au moins <b>70%</b> du produit dans les <b>3 ans</b> suivant la cession dans des actifs éligibles." },
      { label: "Trésorerie non soumise au quota", content: `Jusqu'à <b>30%</b> du produit, soit <b>${euro(V * .30)}</b> sur l'hypothèse saisie, peut rester disponible dans la holding sans obligation de remploi. Cette somme n'est pas exonérée ni distribuable personnellement sans analyse fiscale.` },
      { label: "Effet fiscal", content: "Le remploi permet le <b>maintien du report d'imposition initial</b> ; il ne crée pas un nouveau report et ne transforme pas la plus-value en exonération définitive." },
      { label: "Résidence fiscale", content: residence === "france" ? "Résidence fiscale française déclarée." : "Situation internationale déclarée : analyse conventionnelle nécessaire." },
    ],
    "sale-retirement": [
      matrimonialContext,
      sharesContext,
      { label: "Départ en retraite", content: retraite === "oui" ? "Départ sous 24 mois déclaré : vérifier cessation des fonctions et liquidation des droits." : "Départ sous 24 mois non déclaré : abattement retraite non activé." },
      { label: "Résidence fiscale", content: residence === "france" ? "Résidence fiscale française déclarée." : "Situation internationale déclarée : analyse conventionnelle nécessaire." },
    ],
    "sale-direct": [
      matrimonialContext,
      sharesContext,
      { label: "Cession directe", content: "Cession simulée sans report d'imposition ni abattement conditionnel." },
      { label: "Résidence fiscale", content: residence === "france" ? "Résidence fiscale française déclarée." : "Situation internationale déclarée : analyse conventionnelle nécessaire." },
    ],
  };

  // ── Transmettre ──────────────────────────────────────────────────────────────
  const ab = 100000 * donorCount;
  const abatementDetail = coupleHeldCompany
    ? `${euro(ab)} par enfant (${euro(100000)} dirigeant + ${euro(100000)} Madame)`
    : `${euro(ab)} du dirigeant pour chaque enfant`;
  const valueAfterDutreil = dutreilOK ? dutreilEligibleValue * 0.25 + actifsExclusDutreilPart : V;
  const valueAfterDutreilDemembrement = dismemberedValue(valueAfterDutreil);
  const valueAfterDutreilDemembrementPerChild = valueAfterDutreilDemembrement / enfantsN;
  const donationPP = donationCalculation(enfantsN, donationDonors, donor => V * donor.share);
  const donationNP = donationCalculation(enfantsN, donationDonors, donor => V * donor.share * donor.bareOwnershipRate);
  const donationDutPP = donationCalculation(enfantsN, donationDonors, donor => valueAfterDutreil * donor.share);
  const donationDutNP = donationCalculation(enfantsN, donationDonors, donor => valueAfterDutreil * donor.share * donor.bareOwnershipRate);
  const dPP = donationPP.dutiesTotal;
  const dNP = donationNP.dutiesTotal;
  const dDutPP = donationDutPP.dutiesTotal;
  const dDutNP = donationDutNP.dutiesTotal;
  const dDutMain = familyMainUsesDismemberment ? dDutNP : dDutPP;
  const familyMainTitle = familyMainUsesDismemberment
    ? "Donation démembrée avec Pacte Dutreil"
    : "Donation en pleine propriété avec Pacte Dutreil";
  const familyRecommendedId = dutreilOK
    ? "family-main"
    : transfersControl
      ? "family-simple"
      : "family-dismembered";
  const familyMainFit = familyMainUsesDismemberment
    ? [
      "Transmission au profit des enfants identifiés.",
      wantsControl ? "Objectif de contrôle fort : conservation possible de l'usufruit, des revenus et d'une gouvernance encadrée." : "Contrôle partagé : le démembrement permet une transition progressive.",
      "Activité déclarée compatible avec le Pacte Dutreil.",
    ]
    : [
      "Transmission au profit des enfants identifiés.",
      "Objectif de sortie du contrôle : transfert immédiat des droits attachés aux titres.",
      "Activité déclarée compatible avec le Pacte Dutreil.",
    ];
  const familyMainProcess = familyMainUsesDismemberment
    ? [
      "Signer l'<b>engagement collectif de conservation</b> (Dutreil, 2 ans) ou vérifier le « réputé acquis ».",
      "Réaliser une <b>donation-partage en nue-propriété</b> au profit des enfants, devant notaire.",
      "Faire prendre l'<b>engagement individuel</b> (6 ans) + fonction de direction par un bénéficiaire.",
      "Isoler et valoriser les <b>actifs non exclusivement affectés</b> à l'activité professionnelle.",
      `Vérifier le <b>reliquat d'abattement</b> par enfant après les donations antérieures de ${donorLabel}.`,
      "Valider l'ensemble avec le notaire et l'avocat fiscaliste.",
    ]
    : [
      "Signer l'<b>engagement collectif de conservation</b> ou vérifier le dispositif réputé acquis.",
      "Préparer une <b>donation-partage en pleine propriété</b> au profit des enfants.",
      "Faire souscrire les engagements individuels de conservation et organiser la fonction de direction requise.",
      "Isoler et valoriser les actifs non exclusivement affectés à l'activité professionnelle.",
      `Vérifier le <b>reliquat d'abattement</b> par enfant après les donations antérieures de ${donorLabel}.`,
      "Mettre à jour les registres sociaux et organiser le transfert effectif de gouvernance.",
    ];
  const tStrats: Strategy[] = [
    {
      name: "Donation pleine propriété", cost: dPP, gain: 0, gainPct: 0, delai: "1 mois", complex: 1, risque: 1, best: false,
      points: ["Transmission immédiate et simple", "Pas de réserve d'usufruit", "Coût fiscal le plus élevé"],
    },
    {
      name: dismemberedStrategyName, cost: dNP, gain: 0, gainPct: 0, delai: "1-2 mois", complex: 2, risque: 1, best: false,
      points: ["Le ou les donateurs conservent l'usufruit (revenus + pouvoir)", `Barème appliqué par usufruitier: ${dismembermentRuleDetail} (art. 669)`, "Reconstitution exonérée au décès (art. 1133)"],
    },
    {
      name: dutreilOK ? familyMainTitle : "Pacte Dutreil (non éligible ici)",
      cost: dutreilOK ? dDutMain : dPP, gain: 0, gainPct: 0, delai: "3-6 mois", complex: 3, risque: 2, best: false,
      points: dutreilOK
        ? ["Abattement 75% sur l'assiette Dutreil éligible (art. 787 B)", familyMainUsesDismemberment ? "Démembrement cohérent avec le contrôle souhaité" : "Pleine propriété cohérente avec la sortie du contrôle", "Actifs non exclusivement professionnels exclus de l'exonération"]
        : ["Société non opérationnelle ou seuils non atteints", "Vérifier holding animatrice", "À fiabiliser avant tout engagement"],
    },
  ];
  const tBest = familyRecommendedId === "family-main" ? 2 : familyRecommendedId === "family-simple" ? 0 : 1;
  tStrats[tBest].best = true;
  tStrats.forEach(s => { s.gain = Math.max(0, dPP - s.cost); s.gainPct = pct(s.gain, dPP); });
  const tRec = tStrats[tBest];

  const transmettre: TransResult = {
    recoTitle: tRec.name,
    recoSub: dutreilOK
      ? familyMainUsesDismemberment
        ? `Cumul de l'abattement Dutreil 2026 (75% sur l'assiette éligible), de la décote de nue-propriété et des abattements encore disponibles après rappel fiscal.`
        : "Abattement Dutreil 2026 appliqué avant une transmission en pleine propriété, cohérente avec un transfert du pouvoir."
      : transfersControl
        ? "À défaut d'éligibilité Dutreil, la donation en pleine propriété reste la plus cohérente avec la sortie du contrôle."
        : "À défaut d'éligibilité Dutreil, la donation démembrée reste le levier le plus efficient.",
    kpiSans: dPP, kpiAvec: tRec.cost, kpiEco: dPP - tRec.cost, kpiEcoPct: pct(dPP - tRec.cost, dPP),
    pieBefore: [{ label: "Net transmis", value: Math.max(0, V - dPP), color: "#1E2761" }, { label: "Droits de donation", value: dPP, color: "#B23A48" }],
    pieAfter: [{ label: "Net transmis", value: Math.max(0, V - tRec.cost), color: "#1B7A52" }, { label: "Droits de donation", value: tRec.cost, color: "#C9A227" }],
    pieTotal: V,
    strategies: tStrats,
    hypothesis: `Barème ligne directe (art. 777), abattement maximal ${abatementDetail} /15 ans (art. 779), rappel fiscal des donations antérieures par enfant: ${donationDutNP.previousSummary} (art. 784), ${dismembermentRuleDetail} (art. 669), Dutreil 2026 −75% sur l'actif professionnel éligible (art. 787 B). Actifs exclus Dutreil saisis: ${euro(actifsExclusDutreilPart)}. Chiffrage sur ${enfantsN} enfant(s).`,
    plan: dutreilOK ? familyMainProcess : [
      "<b>Fiabiliser l'éligibilité Dutreil</b> (caractère opérationnel/animateur, seuils) ; restructurer si besoin.",
      transfersControl ? "À défaut, privilégier la <b>donation-partage en pleine propriété</b> si le transfert du pouvoir est assumé." : "À défaut, privilégier la <b>donation-partage démembrée</b>.",
      "Échelonner les donations pour purger les abattements tous les 15 ans.",
      "Valider avec le notaire et l'avocat fiscaliste.",
    ],
  };

  // ── Ceder ────────────────────────────────────────────────────────────────────
  const retirementAbatement = retraite === "oui" && secteur === "agricole" && jeuneAgriculteur === "oui" ? 600000 : 500000;
  const cessionDetail = (saleValue: number, acquisitionValue: number, abatement = 0): CedDetail => {
    const capitalGain = Math.max(0, saleValue - acquisitionValue);
    const incomeTax = Math.max(0, capitalGain - abatement) * 0.128;
    const socialLevies = capitalGain * 0.172;
    const referenceIncome = capitalGain + autres;
    const highIncomeContribution = cehrCalc(referenceIncome, couple);
    const cdhrReferenceBeforeMajoration = incomeTax + autres * 0.30 + highIncomeContribution;
    const cdhrMajoration = cdhrReferenceMajoration(couple, dependentsForCdhr);
    const differentialContribution = cdhrCalc(referenceIncome, couple, cdhrReferenceBeforeMajoration, dependentsForCdhr);
    return {
      PV: capitalGain,
      ir: incomeTax,
      ps: socialLevies,
      ce: highIncomeContribution,
      cd: differentialContribution,
      rfr: referenceIncome,
      cdhrTarget: cdhrTargetTax(referenceIncome, couple),
      cdhrReferenceTax: cdhrReferenceBeforeMajoration + cdhrMajoration,
      cdhrMajoration,
      total: incomeTax + socialLevies + highIncomeContribution + differentialContribution,
    };
  };
  const PV = Math.max(0, V - PR);
  const directDetail = cessionDetail(V, PR);
  const retraiteDetail = cessionDetail(V, PR, retirementAbatement);
  const netDirect = Math.max(0, V - directDetail.total);
  const liquidityNeed = Math.max(0, besoinLiquidite);
  let partialSaleValue = V;
  let partialDetail = directDetail;
  if (liquidityNeed > 0 && liquidityNeed < netDirect && V > 0) {
    let low = 0;
    let high = V;
    for (let step = 0; step < 36; step += 1) {
      const testedSale = (low + high) / 2;
      const testedDetail = cessionDetail(testedSale, PR * testedSale / V);
      if (testedSale - testedDetail.total >= liquidityNeed) high = testedSale;
      else low = testedSale;
    }
    partialSaleValue = high;
    partialDetail = cessionDetail(partialSaleValue, PR * partialSaleValue / V);
  }
  const partialNet = Math.max(0, partialSaleValue - partialDetail.total);

  const directTotal = directDetail.total;
  const cStrats: Strategy[] = [
    {
      name: "Cession directe (PFU)", cost: directTotal, gain: 0, gainPct: 0, delai: "Immédiat", complex: 1, risque: 1, best: false,
      points: ["PFU 30% (12,8% IR + 17,2% PS)", "+ CEHR et CDHR sur le RFR", "Liquidités immédiates, fiscalité maximale"],
    },
    {
      name: "Cession + abattement retraite", cost: retraite === "oui" ? retraiteDetail.total : directTotal, gain: 0, gainPct: 0, delai: "Immédiat", complex: 2, risque: 2, best: false,
      points: retraite === "oui"
        ? [`Abattement ${euro(retirementAbatement)} sur l'assiette IR (art. 150-0 D ter)`, "PS, CEHR, CDHR dus sur le gain plein (réintégration art. 1417)", "Conditionné au départ en retraite sous 24 mois"]
        : ["Non éligible : pas de départ retraite sous 24 mois", "Abattement fixe dirigeant retraite non applicable", "Voir apport-cession"],
    },
    {
      name: "Apport-cession (report)", cost: reinvest === "oui" ? 0 : directTotal, gain: 0, gainPct: 0, delai: "2-3 mois (avant cession)", complex: 3, risque: 3, best: false,
      points: reinvest === "oui"
        ? ["Report d'imposition de la PV (art. 150-0 B ter)", "Réinvestir au moins 70% du produit sous 3 ans", "Conservation et quotas de remploi à suivre dans la holding"]
        : ["Sans réinvestissement, le report tombe", "Imposition identique à la cession directe", "Vigilance abus de droit (L.64 LPF)"],
    },
  ];
  const cBest = reinvest === "oui" ? 2 : retraite === "oui" ? 1 : 0;
  cStrats[cBest].best = true;
  cStrats.forEach(s => { s.gain = Math.max(0, directTotal - s.cost); s.gainPct = pct(s.gain, directTotal); });
  const cRec = cStrats[cBest];
  const shownDetail = retraite === "oui" ? retraiteDetail : directDetail;

  const ceder: CedResult = {
    recoTitle: cRec.name,
    recoSub: cBest === 2
      ? "L'apport préalable à une holding reporte la plus-value ; depuis la loi de finances 2026, le remploi minimal est de 70% sous 3 ans, avec suivi des actifs conservés."
      : cBest === 1
        ? `Le départ en retraite ouvre l'abattement de ${euro(retirementAbatement)} sur l'assiette IR ; attention, PS/CEHR/CDHR restent calculés sur le gain plein.`
        : "En l'absence de réinvestissement et de départ retraite, la cession directe au PFU reste la voie par défaut.",
    kpiSans: directTotal, kpiAvec: cRec.cost, kpiEco: directTotal - cRec.cost, kpiEcoPct: pct(directTotal - cRec.cost, directTotal),
    pieBefore: [{ label: "Net dirigeant", value: Math.max(0, V - directTotal), color: "#1E2761" }, { label: "Imposition", value: directTotal, color: "#B23A48" }],
    pieAfter: [{ label: "Net / réinvesti", value: Math.max(0, V - cRec.cost), color: "#1B7A52" }, { label: "Imposition", value: cRec.cost, color: "#C9A227" }],
    pieTotal: V,
    strategies: cStrats,
    hypothesis: `PFU 30% (12,8% IR + 17,2% PS). CEHR marginale sur le RFR (3% puis 4%, art. 223 sexies). CDHR 2026 = max(0 ; cible art. 224 après décote d'entrée − impôt de référence majoré de ${euro(cdhrReferenceMajoration(couple, dependentsForCdhr))}). L'abattement de ${euro(retirementAbatement)} (art. 150-0 D ter) réduit l'IR mais est réintégré au RFR (art. 1417). Apport-cession 2026: remploi 70% sous 3 ans. Les retraitements fins du RFR et revenus exceptionnels doivent être confirmés sur la déclaration réelle.`,
    plan: cBest === 2 ? [
      "Constituer une <b>holding</b> et <b>apporter les titres</b> AVANT toute cession (art. 150-0 B ter).",
      "Faire céder les titres par la holding ; <b>réinvestir au moins 70%</b> du produit sous 3 ans (activité éligible).",
      "Documenter le caractère économique du réinvestissement (<b>anti-abus de droit</b>).",
      "Piloter la trésorerie de la holding (capitalisation à l'IS).",
      "Valider le montage avec l'avocat fiscaliste.",
    ] : cBest === 1 ? [
      "Vérifier les <b>conditions de l'abattement retraite</b> : cessation de fonctions + liquidation des droits sous 24 mois.",
      "Arbitrer <b>PFU vs barème</b> selon le taux marginal.",
      "Anticiper l'impact <b>CEHR/CDHR</b> (gain plein dans le RFR).",
      "Étaler éventuellement la cession sur deux années civiles pour lisser le RFR.",
      "Valider avec l'avocat fiscaliste.",
    ] : [
      "Comparer <b>PFU et option barème</b>.",
      "Étudier un <b>apport-cession</b> si un réinvestissement devient envisageable.",
      "Lisser le RFR sur deux exercices pour réduire CEHR/CDHR.",
      "Valider avec l'avocat fiscaliste.",
    ],
    detail: shownDetail,
    isRetraite: retraite === "oui",
  };

  // ── Mixte ────────────────────────────────────────────────────────────────────
  const droitsDonNP = dutreilOK ? dDutNP : dNP;
  const mixte: MixteResult = { droitsDonNP, pvPurgee: Math.max(0, V - PR), dutreilOK };
  const hasProtectedPartner = situation === "marié" || situation === "pacsé";
  const isPacsPartner = situation === "pacsé";
  const dirigeantOwnedValue = Vtot * rawQuotePart / 100;
  const protectedShare = Math.min(100, Math.max(0, partProtectionConjoint)) / 100;
  const spouseProtectedFullValue = dirigeantOwnedValue * protectedShare;
  const spouseUsufructRate = Math.max(0, 1 - qMadame);
  const spouseProtectedUsufructValue = spouseProtectedFullValue * spouseUsufructRate;
  const spouseUsufructDonation = spouseDonationCalculation(spouseProtectedUsufructValue, donationsAnterieuresConjoint);
  const spouseFullDonation = spouseDonationCalculation(spouseProtectedFullValue, donationsAnterieuresConjoint);
  const spouseCivilAct = isPacsPartner ? "Testament au profit du partenaire pacsé" : "Donation entre époux au dernier vivant";
  const spouseAbatementArticle = isPacsPartner ? "CGI, art. 790 F" : "CGI, art. 790 E";
  const protectedOwnershipContext: CtxItem = {
    label: "Titres à protéger",
    content: `${Math.round(protectedShare * 100)}% des titres détenus par le dirigeant, soit <b>${euro(spouseProtectedFullValue)}</b> sur une détention de <b>${euro(dirigeantOwnedValue)}</b>.`,
  };
  const spouseHistoryContext: CtxItem = {
    label: "Donations au bénéficiaire",
    content: `Donations reçues du dirigeant depuis moins de 15 ans : <b>${euro(Math.max(0, donationsAnterieuresConjoint))}</b>. L'abattement disponible est calculé selon ${spouseAbatementArticle}.`,
  };
  contextByStrategy["liquidity-partial"] = [
    matrimonialContext,
    sharesContext,
    { label: "Besoin net immédiat", content: `Besoin saisi : <b>${euro(liquidityNeed)}</b>. Cession calibrée à <b>${euro(partialSaleValue)}</b> pour un net estimé de <b>${euro(partialNet)}</b>.` },
    { label: "Titres conservés", content: `Valeur non cédée estimée : <b>${euro(Math.max(0, V - partialSaleValue))}</b>, sous réserve du prix réel et des statuts.` },
  ];
  contextByStrategy["liquidity-direct"] = [
    matrimonialContext,
    sharesContext,
    { label: "Liquidité disponible", content: `Vente de la totalité de la part analysée : net estimé après imposition de <b>${euro(netDirect)}</b>.` },
    { label: "Régime fiscal", content: "Cession directe modélisée sans report d'imposition ni abattement conditionnel." },
  ];
  contextByStrategy["liquidity-retirement"] = [
    matrimonialContext,
    sharesContext,
    { label: "Liquidité disponible", content: `Net estimé après abattement retraite sur l'IR : <b>${euro(Math.max(0, V - retraiteDetail.total))}</b>.` },
    { label: "Départ en retraite", content: "Le bénéfice de l'abattement suppose la réalisation effective des conditions et du calendrier de départ." },
  ];
  contextByStrategy["spouse-death"] = [
    matrimonialContext,
    { label: "Besoin du conjoint", content: "Protection au décès sans transfert immédiat de titres déclaré." },
    protectedOwnershipContext,
    { label: "Fiscalité successorale", content: "Le conjoint survivant ou partenaire pacsé bénéficiaire est exonéré de droits de mutation par décès (CGI, art. 796-0 bis)." },
  ];
  contextByStrategy["spouse-usufruct"] = [
    matrimonialContext,
    protectedOwnershipContext,
    spouseHistoryContext,
    { label: "Usufruit transmis", content: `Âge du bénéficiaire : <b>${ageMadame} ans</b> ; valeur fiscale de l'usufruit : <b>${Math.round(spouseUsufructRate * 100)}%</b> des titres visés.` },
  ];
  contextByStrategy["spouse-full"] = [
    matrimonialContext,
    protectedOwnershipContext,
    spouseHistoryContext,
    { label: "Transfert de propriété", content: "Donation immédiate en pleine propriété de la fraction renseignée : contrôler les droits de vote après l'acte." },
  ];
  contextByStrategy["spouse-required"] = [
    { label: "Protection du conjoint", content: "Aucun époux ou partenaire pacsé n'est renseigné. Ce parcours exige d'identifier un bénéficiaire pouvant être protégé." },
  ];

  const latentGain = Math.max(0, plusvalues || PV);
  const statusLabel = statut === "tns"
    ? "Travailleur non salarié"
    : statut === "liberal"
      ? "Profession libérale"
      : statut === "mandat"
        ? "Mandat non rémunéré"
        : "Assimilé salarié";
  const residenceLabel = residence === "france"
    ? "résident fiscal français"
    : residence === "ue"
      ? "résident UE hors France"
      : "résident hors UE";
  const holdingLabel = holding === "animatrice"
    ? "holding animatrice existante"
    : holding === "passive"
      ? "holding patrimoniale à qualifier"
      : "pas de holding renseignée";
  const recommendStrategies = (items: ClientStrategy[], id: string): ClientStrategy[] => items
    .map(item => ({ ...item, recommended: item.id === id }))
    .sort((left, right) => Number(right.recommended) - Number(left.recommended));
  const familyStrategies = recommendStrategies([
    ...(dutreilOK ? [{
      id: "family-main",
      title: familyMainTitle,
      family: "Transmission familiale",
      summary: familyMainUsesDismemberment
        ? "Exonération Dutreil sur l'actif éligible puis donation de la nue-propriété aux enfants."
        : "Exonération Dutreil sur l'actif éligible puis donation en pleine propriété aux enfants.",
      tax: dDutMain,
      delay: "3 à 6 mois",
      recommended: false,
      recommendationReason: familyMainUsesDismemberment
        ? "Cette stratégie réduit l'assiette taxable tout en restant cohérente avec un objectif de conservation ou de partage du contrôle."
        : "Cette stratégie conserve l'avantage Dutreil tout en respectant l'objectif de transfert du contrôle aux enfants.",
      fit: familyMainFit,
      conditions: familyMainUsesDismemberment ? DUTREIL_LEGAL_CONDITIONS : [...DUTREIL_LEGAL_CONDITIONS, "Assumer le transfert immédiat des droits de vote et des droits financiers attachés aux titres donnés."],
      process: familyMainProcess,
    }] : []),
    {
      id: "family-dismembered",
      title: "Donation démembrée sans Pacte Dutreil",
      family: "Transmission familiale",
      summary: "Donation de la nue-propriété avec conservation de l'usufruit, sans exonération Dutreil.",
      tax: dNP,
      delay: "1 à 2 mois",
      recommended: false,
      recommendationReason: "Cette option conserve la logique de transmission et de revenus sans dépendre de l'éligibilité Dutreil.",
      fit: ["Objectif de transmission aux enfants.", "Réduction de la base taxable par le barème du démembrement.", "Absence de condition de conservation Dutreil."],
      conditions: DEMEMBREMENT_SOLO_LEGAL_CONDITIONS,
      process: ["Valoriser les titres et identifier leur détention.", "Faire établir l'acte de donation démembrée par le notaire.", "Organiser usufruit, vote et dividendes dans les statuts.", "Déclarer et acquitter les droits calculés."],
    },
    {
      id: "family-simple",
      title: "Donation en pleine propriété",
      family: "Transmission familiale",
      summary: "Transfert immédiat des titres aux enfants selon les abattements disponibles.",
      tax: dPP,
      delay: "1 mois",
      recommended: false,
      recommendationReason: "Cette option est la plus directe, mais transfère immédiatement les droits attachés aux titres.",
      fit: ["Transmission simple à expliquer et à formaliser.", "Absence de suivi Dutreil ou de démembrement.", "Appropriée si le pouvoir est transmis avec les titres."],
      conditions: DONATION_SIMPLE_LEGAL_CONDITIONS,
      process: ["Valoriser les titres donnés.", "Vérifier les abattements encore disponibles.", "Signer et déclarer la donation.", "Mettre à jour les registres et la gouvernance."],
    },
  ], familyRecommendedId);
  const cessionStrategies = recommendStrategies([
    ...(reinvest === "oui" ? [{
      id: "sale-main",
      title: "Apport-cession avec report d'imposition",
      family: "Cession à un tiers",
      summary: "Apport préalable à une holding, remploi éligible d'au moins 70% du prix et jusqu'à 30% sans obligation de remploi dans la holding.",
      tax: 0,
      delay: "2 à 3 mois avant cession",
      recommended: false,
      recommendationReason: `Le projet de remploi permet de maintenir le report d'imposition de la plus-value d'apport tout en laissant jusqu'à ${euro(V * .30)} hors obligation de remploi dans la holding.`,
      fit: ["Objectif de cession à un tiers.", "Projet de remploi éligible déclaré par le dirigeant.", `Avantage de souplesse : le quota impose le remploi de ${euro(V * .70)} au minimum et laisse jusqu'à ${euro(V * .30)} sans obligation de remploi dans la holding.`, "Imposition immédiate de la plus-value placée en report : 0 € sous conditions ; il ne s'agit ni d'une exonération définitive ni d'un nouveau report."],
      conditions: ["L'apport doit intervenir avant toute cession juridiquement engagée (CGI, art. 150-0 B ter).", "Si la holding cède les titres apportés dans les 3 ans de l'apport, elle doit s'engager à remployer au moins 70% du produit dans les 3 ans suivant la cession.", "Le remploi peut financer des moyens permanents d'exploitation, des participations ou souscriptions au capital de sociétés opérationnelles éligibles, ou certains fonds de capital-investissement éligibles.", "Sont exclus notamment les activités financières, la gestion de patrimoine mobilier ou immobilier et les activités immobilières.", "Conserver les preuves de substance, de remploi et de suivi du report."],
      process: ["Constituer ou qualifier la holding bénéficiaire de l'apport.", "Apporter les titres avant la vente et constater le report.", "Faire céder les titres par la holding.", "Insérer et exécuter l'engagement de remploi éligible d'au moins 70% dans le délai applicable.", "Suivre le maintien ou la fin du report et conserver toutes les preuves."],
    }] : []),
    ...(retraite === "oui" ? [{
      id: "sale-retirement",
      title: "Cession avec abattement dirigeant retraite",
      family: "Cession à un tiers",
      summary: "Vente directe avec abattement fixe sur l'assiette d'impôt sur le revenu sous conditions de départ.",
      tax: retraiteDetail.total,
      delay: "1 à 2 mois",
      recommended: false,
      recommendationReason: "Le départ en retraite déclaré réduit l'impôt sur le revenu, sans neutraliser les prélèvements ni contributions additionnelles.",
      fit: ["Sortie au profit d'un tiers.", "Départ en retraite sous 24 mois déclaré.", `Abattement IR modélisé : ${euro(retirementAbatement)}.`],
      conditions: ["Respecter les conditions et le calendrier de cessation des fonctions et liquidation des droits à retraite.", "Valider l'éligibilité des titres cédés.", "Déclarer la plus-value et les contributions sur le revenu fiscal de référence."],
      process: ["Valider l'éligibilité retraite avant la signature.", "Finaliser la valorisation et le contrat de cession.", "Réaliser la vente et documenter le départ.", "Déclarer la plus-value avec l'abattement applicable."],
    }] : []),
    {
      id: "sale-direct",
      title: "Cession directe au tiers",
      family: "Cession à un tiers",
      summary: "Vente des titres détenus par le dirigeant avec imposition de droit commun de la plus-value.",
      tax: directDetail.total,
      delay: "1 à 2 mois",
      recommended: false,
      recommendationReason: "La cession directe fournit le prix de vente sans condition de remploi ou de départ en retraite.",
      fit: ["Objectif de cession à un tiers.", "Liquidités versées directement au cédant.", "Régime fiscal calculable immédiatement sur le prix et le prix de revient."],
      conditions: ["Justifier le prix et le prix de revient fiscal.", "Prévoir les garanties et modalités de paiement.", "Déclarer la plus-value et les contributions applicables."],
      process: ["Valoriser et négocier les titres.", "Signer l'acte de cession et encaisser le prix.", "Mettre à jour les registres sociaux.", "Déclarer la plus-value et payer l'impôt."],
    },
  ], reinvest === "oui" ? "sale-main" : retraite === "oui" ? "sale-retirement" : "sale-direct");
  const partialLiquidityAvailable = liquidityNeed > 0 && liquidityNeed < netDirect;
  const liquidityRecommended = transfersControl
    ? retraite === "oui"
      ? "liquidity-retirement"
      : "liquidity-direct"
    : partialLiquidityAvailable
      ? "liquidity-partial"
      : retraite === "oui"
        ? "liquidity-retirement"
        : "liquidity-direct";
  const liquidityStrategies = recommendStrategies([
    ...(partialLiquidityAvailable ? [{
      id: "liquidity-partial",
      title: "Cession partielle calibrée au besoin de liquidités",
      family: "Liquidité immédiate",
      summary: "Vendre uniquement la fraction nécessaire au besoin net et conserver le solde des titres.",
      tax: partialDetail.total,
      delay: "1 à 2 mois",
      recommended: false,
      recommendationReason: "La vente partielle couvre le besoin immédiat saisi tout en préservant une partie de la participation, ce qui répond à l'objectif de contrôle conservé ou partagé.",
      fit: [`Besoin net renseigné : ${euro(liquidityNeed)}.`, `Prix de cession estimé : ${euro(partialSaleValue)} pour un net de ${euro(partialNet)}.`, `Titres conservés estimés : ${euro(Math.max(0, V - partialSaleValue))}.`, wantsControl ? "Objectif de contrôle : éviter une cession intégrale lorsque le besoin peut être couvert partiellement." : "Objectif de contrôle partagé : conserver une participation résiduelle organisée dans les statuts."],
      conditions: ["Autoriser et documenter la cession partielle de titres.", "Ventiler le prix de revient fiscal au prorata des titres cédés.", "Vérifier les droits de préemption et le contrôle restant."],
      process: ["Fixer le besoin net à financer.", "Faire valoriser la fraction de titres nécessaire.", "Signer la cession partielle et encaisser le prix.", "Déclarer la plus-value des seuls titres cédés."],
    }] : []),
    ...(retraite === "oui" ? [{
      id: "liquidity-retirement",
      title: "Cession complète avec abattement retraite",
      family: "Liquidité immédiate",
      summary: "Sortie complète fournissant des liquidités, avec réduction d'assiette IR si les conditions retraite sont respectées.",
      tax: retraiteDetail.total,
      delay: "1 à 2 mois",
      recommended: false,
      recommendationReason: "Ce scénario est pertinent si la sortie complète et le départ en retraite correspondent au projet du dirigeant.",
      fit: [`Net estimé après imposition : ${euro(Math.max(0, V - retraiteDetail.total))}.`, "Départ en retraite déclaré.", "La totalité de la valeur cédée devient disponible, après fiscalité."],
      conditions: ["Respecter strictement le calendrier retraite.", "Vérifier que l'étendue de la cession satisfait le régime.", "Déclarer la plus-value et les contributions restant dues."],
      process: ["Valider le départ en retraite.", "Finaliser et signer la cession.", "Encaisser le prix et organiser la trésorerie.", "Déclarer la fiscalité de la cession."],
    }] : []),
    {
      id: "liquidity-direct",
      title: "Cession directe avec encaissement immédiat",
      family: "Liquidité immédiate",
      summary: "Vente de l'intégralité de la part analysée pour rendre le produit net disponible au dirigeant.",
      tax: directDetail.total,
      delay: "1 à 2 mois",
      recommended: false,
      recommendationReason: transfersControl ? "Cette option est cohérente avec une sortie du contrôle et transforme directement les titres en liquidités disponibles." : "Cette option transforme directement les titres en liquidités disponibles, mais elle est moins cohérente avec un objectif de contrôle conservé.",
      fit: [`Net disponible estimé : ${euro(netDirect)}.`, liquidityNeed > netDirect ? `Le besoin saisi de ${euro(liquidityNeed)} dépasse le net estimé.` : "Le besoin saisi peut être financé par le prix net estimé.", transfersControl ? "Objectif de sortie du contrôle compatible avec une cession complète." : "À retenir seulement si une cession partielle ne suffit pas ou n'est pas possible.", "Absence de remploi bloquant la disponibilité du prix."],
      conditions: ["Documenter le prix, le coût fiscal et le paiement.", "Sécuriser les garanties de cession.", "Déclarer la plus-value et les contributions."],
      process: ["Valoriser les titres et sécuriser l'acquéreur.", "Signer la cession.", "Encaisser le prix net des retenues ou paiements convenus.", "Déclarer et acquitter l'imposition."],
    },
  ], liquidityRecommended);
  const spouseFamily = isPacsPartner ? "Protection - PACS" : "Protection - conjoint";
  const spouseRecommendedId = besoinConjoint === "revenus"
    ? "spouse-usufruct"
    : besoinConjoint === "propriete"
      ? wantsControl ? "spouse-usufruct" : "spouse-full"
      : "spouse-death";
  const spouseStrategies = hasProtectedPartner
    ? recommendStrategies([
      {
        id: "spouse-death",
        title: spouseCivilAct,
        family: spouseFamily,
        summary: "Organiser les droits du survivant au décès sans transfert immédiat de titres.",
        tax: 0,
        delay: "1 mois",
        recommended: false,
        recommendationReason: "La priorité est la protection au décès : l'acte civil organise les droits du bénéficiaire et l'exonération successorale s'applique au conjoint ou partenaire pacsé.",
        fit: ["Protection du bénéficiaire en cas de décès.", "Aucun transfert immédiat ni droit de donation modélisé lors de la mise en place.", "Exonération successorale prévue par le CGI, article 796-0 bis."],
        conditions: [isPacsPartner ? "Établir un testament au profit du partenaire pacsé." : "Établir une donation entre époux au dernier vivant devant notaire.", "Respecter les droits des enfants et organiser la gouvernance des titres transmis.", "Actualiser l'acte en cas de changement familial ou capitalistique."],
        process: ["Identifier les titres et besoins du survivant.", "Faire rédiger l'acte approprié par le notaire.", "Coordonner l'acte avec les statuts et la gouvernance.", "Conserver et réviser la documentation patrimoniale."],
      },
      {
        id: "spouse-usufruct",
        title: isPacsPartner ? "Donation d'usufruit au partenaire pacsé" : "Donation d'usufruit au conjoint",
        family: spouseFamily,
        summary: "Transmettre immédiatement un droit aux revenus sur une fraction des titres, valorisé selon l'âge du bénéficiaire.",
        tax: spouseUsufructDonation.duties,
        delay: "1 à 2 mois",
        recommended: false,
        recommendationReason: "La donation d'usufruit répond à un besoin de revenus immédiats du bénéficiaire sans transférer toute la propriété des titres.",
        fit: [`Usufruit valorisé à ${Math.round(spouseUsufructRate * 100)}% pour un bénéficiaire de ${ageMadame} ans.`, `Fraction de titres visée : ${Math.round(protectedShare * 100)}%.`, `Dividendes annuels renseignés : ${euro(dividendes)}.`],
        conditions: ["Faire constater la donation et sa valorisation.", `Appliquer l'abattement de 80 724 € selon ${spouseAbatementArticle} et les donations de moins de 15 ans.`, "Organiser les droits financiers et les droits de vote dans les statuts."],
        process: ["Déterminer la fraction de titres et les revenus à protéger.", "Valoriser l'usufruit au jour de la donation.", "Signer et déclarer l'acte.", "Mettre à jour les clauses de gouvernance."],
      },
      {
        id: "spouse-full",
        title: isPacsPartner ? "Donation de titres en pleine propriété au partenaire pacsé" : "Donation de titres en pleine propriété au conjoint",
        family: spouseFamily,
        summary: "Transférer immédiatement une fraction des titres au conjoint ou partenaire protégé.",
        tax: spouseFullDonation.duties,
        delay: "1 à 2 mois",
        recommended: false,
        recommendationReason: "La pleine propriété convient lorsqu'une participation immédiate dans l'entreprise est recherchée pour le conjoint.",
        fit: [`Fraction donnée : ${Math.round(protectedShare * 100)}% des titres détenus par le dirigeant.`, "Le bénéficiaire devient propriétaire des titres donnés.", `Abattement applicable : 80 724 € sous réserve de l'historique renseigné.`],
        conditions: ["Valoriser précisément la fraction transmise.", `Appliquer l'abattement selon ${spouseAbatementArticle} et le rappel fiscal.`, "Contrôler la modification des droits de vote et du contrôle."],
        process: ["Définir la fraction à donner.", "Faire rédiger et signer l'acte.", "Effectuer les déclarations fiscales.", "Mettre à jour les registres et la gouvernance."],
      },
    ], spouseRecommendedId)
    : [{
      id: "spouse-required",
      title: "Identifier le bénéficiaire à protéger",
      family: "Protection du conjoint",
      summary: "Aucun époux ou partenaire pacsé n'est indiqué dans la situation.",
      tax: 0,
      delay: "À compléter",
      recommended: true,
      recommendationReason: "La protection du conjoint nécessite d'abord de qualifier le bénéficiaire et son statut civil.",
      fit: ["La situation matrimoniale ne renseigne pas de conjoint ou partenaire pacsé."],
      conditions: ["Renseigner la situation matrimoniale et le bénéficiaire visé."],
      process: ["Compléter la situation du dirigeant.", "Relancer l'analyse avec le statut civil pertinent."],
    }];
  const saleObjective = objectif === "cession" || objectif === "liquidite";
  const liquidityObjective = objectif === "liquidite";
  const protectionObjective = objectif === "protection";
  const strategiesByObjective: Record<string, ClientStrategy[]> = {
    transmission: familyStrategies,
    cession: cessionStrategies,
    liquidite: liquidityStrategies,
    protection: spouseStrategies,
  };
  const chosenRecommendationTitle = protectionObjective
    ? (spouseStrategies.find(s => s.recommended) ?? spouseStrategies[0])?.title ?? "Protection du conjoint à qualifier"
    : saleObjective
      ? cRec.name
      : tRec.name;
  const recommendation: Recommendation = {
    title: chosenRecommendationTitle,
    plain: protectionObjective
      ? "La protection du conjoint est priorisée selon le besoin exprimé : revenus immédiats, propriété des titres ou protection au décès."
      : saleObjective
      ? "La liquidité et le calendrier de cession dirigent la recommandation; le report ou l'abattement retraite restent conditionnels."
      : "La transmission familiale est priorisée en combinant pédagogie, conservation du contrôle et réduction de l'assiette taxable.",
    rationale: protectionObjective ? [
      hasProtectedPartner ? "Le bénéficiaire à protéger est identifié dans la situation matrimoniale." : "Aucun conjoint ou partenaire pacsé n'est renseigné : l'analyse doit d'abord qualifier le bénéficiaire.",
      besoinConjoint === "revenus" ? "Le besoin déclaré porte sur les revenus : l'usufruit est privilégié." : besoinConjoint === "propriete" ? "Le besoin déclaré porte sur la propriété des titres : le transfert doit être comparé à l'objectif de contrôle." : "Le besoin déclaré porte sur la protection au décès : l'acte civil et successoral est prioritaire.",
      wantsControl ? "La conservation du contrôle limite les transmissions immédiates en pleine propriété." : acceptsSharedControl ? "Le partage du contrôle autorise une transmission encadrée, sous réserve des statuts." : "La sortie du contrôle rend plus cohérent un transfert immédiat des droits attachés aux titres.",
    ] : saleObjective ? [
      `Valeur analysée ${euro(V)} et plus-value latente renseignée ${euro(latentGain)}.`,
      reinvest === "oui" ? "Le réinvestissement déclaré permet d'étudier l'apport-cession avant la vente, avec un remploi 2026 minimal de 70% sous 3 ans." : "Aucun réinvestissement n'est déclaré; le besoin de liquidités pèse dans l'arbitrage.",
      retraite === "oui" ? "Le départ en retraite sous 24 mois doit être testé pour l'abattement fixe." : "L'abattement dirigeant retraite n'est pas activé dans la saisie.",
    ] : [
      `${enfants} enfant(s) renseigné(s) et objectif ${objectif}; la logique familiale est documentée avant l'acte.`,
      dutreilOK ? "L'éligibilité Dutreil déclarée réduit l'assiette éligible; les actifs non exclusivement professionnels restent taxés hors exonération 75%." : "L'éligibilité Dutreil est incertaine; le démembrement reste le levier de repli.",
      conserver === "oui" ? "La conservation des revenus et du pouvoir appelle un schéma de démembrement et de gouvernance." : "Le dirigeant accepte une transmission plus directe du pouvoir.",
    ],
    limits: [
      "Le chiffrage reste indicatif tant que la valorisation, les donations antérieures et les statuts ne sont pas audités.",
      residence === "france" ? "La résidence fiscale française est supposée stable." : "La résidence fiscale non française impose une analyse conventionnelle et déclarative dédiée.",
      demembrement === "oui" ? "Un démembrement existant doit être rapproché des actes antérieurs." : "Aucun démembrement antérieur n'est intégré au calcul.",
    ],
    alternatives: protectionObjective
      ? ["donation d'usufruit au conjoint", "donation de titres en pleine propriété", "donation entre époux ou testament selon le statut civil"]
      : saleObjective
      ? ["cession directe", "cession progressive à un repreneur", "donation avant cession si le calendrier le permet"]
      : ["donation-partage démembrée", "holding familiale", "cession partielle ou stratégie mixte"],
  };

  const metrics: Metric[] = protectionObjective
    ? [
      {
        label: "Bénéficiaire protégé",
        value: hasProtectedPartner ? (isPacsPartner ? "Partenaire pacsé" : "Conjoint") : "Non renseigné",
          detail: hasProtectedPartner ? `${regimeLabels[effectiveRegime] ?? effectiveRegime}; âge du bénéficiaire ${ageMadame} ans.` : "Renseigner un époux ou partenaire pacsé pour obtenir les stratégies adaptées.",
      },
      {
        label: "Titres du dirigeant",
        value: euro(dirigeantOwnedValue),
        detail: `${rawQuotePart}% des titres de l'entreprise, ${holdingLabel}.`,
      },
      {
        label: "Fraction à protéger",
        value: euro(spouseProtectedFullValue),
        detail: `${Math.round(protectedShare * 100)}% des titres détenus par le dirigeant; usufruit fiscal valorisé à ${Math.round(spouseUsufructRate * 100)}%.`,
      },
      {
        label: "Revenus à préserver",
        value: `${euro(dividendes)} / an`,
        detail: `Donations antérieures au bénéficiaire : ${euro(donationsAnterieuresConjoint)}.`,
      },
    ]
    : saleObjective
      ? [
        {
          label: "Objectif",
          value: liquidityObjective ? "Liquidité immédiate" : "Cession à un tiers",
          detail: `${residenceLabel}; ${statusLabel}.`,
        },
        {
          label: "Titres à céder",
          value: euro(V),
          detail: `${rawQuotePart}% des titres détenus par le dirigeant; prix de revient fiscal ${euro(PR)}.`,
        },
        {
          label: "Plus-value calculée",
          value: euro(directDetail.PV),
          detail: "Différence entre la valeur de cession modélisée et le prix de revient fiscal.",
        },
        {
          label: liquidityObjective ? "Besoin / net direct" : "Net après vente directe",
          value: liquidityObjective ? `${euro(liquidityNeed)} / ${euro(netDirect)}` : euro(netDirect),
          detail: liquidityObjective ? "Le scénario recommandé cherche à satisfaire le besoin avec la fraction de titres nécessaire." : "Montant indicatif après impôt estimé de la cession directe.",
        },
      ]
      : [
        {
          label: "Profil",
          value: coupleHeldCompany ? `M. ${age} ans | Mme ${ageMadame} ans | ${residenceLabel}` : `${age} ans | ${residenceLabel}`,
          detail: `${situation}; régime ${regimeLabels[effectiveRegime] ?? effectiveRegime}; ${enfants} enfant(s).`,
        },
        {
          label: "Entreprise analysée",
          value: euro(V),
          detail: `${coupleHeldCompany ? "100% des titres déclarés détenus par le couple" : `${rawQuotePart}% des titres du dirigeant`}, ${holdingLabel}.`,
        },
        {
          label: "Cadre de transmission",
          value: enfantsN > 1 ? `${enfantsN} enfants` : `${enfantsN} enfant`,
          detail: `${repreneurs === "oui" ? "Repreneur familial identifié." : "Repreneur familial non confirmé."} Donations antérieures intégrées dans le rappel fiscal.`,
        },
        {
          label: "Données de revenus saisies",
          value: `${euro(revenusDirigeant)} / an`,
          detail: `Revenus professionnels du dirigeant et dividendes attendus de ${euro(dividendes)} utilisés pour apprécier le besoin de conservation de l'usufruit.`,
        },
        {
          label: "Actifs exclus Dutreil",
          value: euro(actifsExclusDutreilPart),
          detail: actifsExclusDutreilPart > 0
            ? "Montant déclaré comme non exclusivement professionnel et exclu de l'exonération partielle."
            : "Aucun actif non exclusivement professionnel n'est saisi dans la simulation.",
        },
      ];

  const insights: Insight[] = protectionObjective
    ? [
      {
        title: "Statut du bénéficiaire",
        text: hasProtectedPartner
          ? `${isPacsPartner ? "Le partenaire pacsé doit être protégé par testament." : "La donation entre époux permet d'organiser les options du survivant."} L'exonération successorale est distinguée des donations immédiates.`
          : "Aucun conjoint ou partenaire pacsé n'est renseigné; les outils de protection conjugale ne peuvent pas être recommandés en l'état.",
        tone: hasProtectedPartner ? "good" : "warning",
      },
      {
        title: "Protection des revenus",
        text: besoinConjoint === "revenus"
          ? "Le besoin renseigné privilégie l'usufruit, qui donne vocation aux revenus des titres selon les clauses retenues."
          : "Un usufruit peut être comparé si la protection de revenus devient prioritaire.",
        tone: besoinConjoint === "revenus" ? "good" : "neutral",
      },
      {
        title: "Fiscalité immédiate",
        text: `Une donation immédiate utilise l'abattement de 80 724 € disponible après les donations antérieures déclarées (${spouseAbatementArticle}).`,
        tone: donationsAnterieuresConjoint > 0 ? "warning" : "neutral",
      },
      {
        title: "Gouvernance",
        text: "Tout transfert de titres ou d'usufruit doit être coordonné avec les droits de vote, les dividendes et les statuts de la société.",
        tone: "neutral",
      },
    ]
    : saleObjective
      ? [
        {
          title: liquidityObjective ? "Disponibilité des fonds" : "Projet de cession",
          text: liquidityObjective
            ? `Le besoin net déclaré est de ${euro(liquidityNeed)}; une cession partielle n'est recommandée que si elle peut couvrir ce besoin.`
            : "Les scénarios affichés sont ceux qui mènent effectivement à une vente au tiers selon les conditions renseignées.",
          tone: liquidityObjective && liquidityNeed > netDirect ? "warning" : "good",
        },
        {
          title: "Plus-value et contributions",
          text: `La plus-value modélisée de ${euro(directDetail.PV)} alimente l'impôt sur le revenu, les prélèvements sociaux et, le cas échéant, la CEHR/CDHR.`,
          tone: "neutral",
        },
        {
          title: "Conditions particulières",
          text: liquidityObjective
            ? "L'apport-cession n'est pas présenté car il impose un remploi et ne répond pas à une liquidité immédiatement disponible."
            : reinvest === "oui"
              ? "Le réinvestissement déclaré permet de présenter l'apport-cession sous réserve du report et du remploi exigé."
              : "Sans réinvestissement déclaré, l'apport-cession n'est pas proposé.",
          tone: "neutral",
        },
        {
          title: "Départ en retraite",
          text: retraite === "oui"
            ? "L'abattement retraite est présenté sous réserve de satisfaire toutes ses conditions légales."
            : "Aucun abattement dirigeant retraite n'est appliqué en l'absence de départ déclaré.",
          tone: retraite === "oui" ? "good" : "neutral",
        },
      ]
      : [
        {
          title: "Transmission familiale",
          text: enfants > 0 && repreneurs === "oui"
            ? "Des repreneurs sont identifiés; la gouvernance, l'égalité familiale et les fonctions de direction peuvent être préparées."
            : "Le repreneur familial n'est pas sécurisé; comparer cession, management package et transmission progressive.",
          tone: enfants > 0 && repreneurs === "oui" ? "good" : "warning",
        },
        {
          title: "Éligibilité réglementaire",
          text: dutreilOK
            ? "L'activité saisie est traitée comme opérationnelle; il reste à prouver les seuils, engagements et obligations déclaratives."
            : "Le Pacte Dutreil n'est pas retenu en l'état; vérifier l'activité et la holding.",
          tone: dutreilOK ? "good" : "warning",
        },
        {
          title: "Contrôle et revenus",
          text: transfersControl
            ? "Le transfert ou la sortie du contrôle oriente vers une cession ou une donation en pleine propriété, avec des garanties post-opération à encadrer."
            : wantsControl
              ? "La conservation du contrôle appelle des clauses statutaires, des droits de vote organisés et une politique de revenus après l'opération."
              : "Le partage progressif du contrôle impose de formaliser la gouvernance, les droits d'information et les décisions réservées.",
          tone: "neutral",
        },
        {
          title: "Actifs exclus Dutreil",
          text: actifsExclusDutreilPart > 0
            ? `${euro(actifsExclusDutreilPart)} d'actifs non exclusivement professionnels sont exclus de l'exonération Dutreil 2026.`
            : "Aucun actif non exclusivement professionnel n'est saisi. Ce point reste à confirmer avec la comptabilité et les justificatifs d'affectation professionnelle.",
          tone: actifsExclusDutreilPart > 0 ? "warning" : "neutral",
        },
      ];

  const fiscalLines: TaxLine[] = [
    {
      label: "1. Valorisation entreprise",
      base: coupleHeldCompany
        ? `Entreprise déclarée détenue par le couple: 100% de la valorisation de ${euro(Vtot)}`
        : `${rawQuotePart}% de la valorisation de ${euro(Vtot)}`,
      amount: V,
      rule: coupleHeldCompany ? "Valeur des titres transmis par le couple." : "Valeur des titres transmis par le dirigeant.",
    },
    {
      label: "2. Pacte Dutreil",
      base: dutreilOK
        ? actifsExclusDutreilPart > 0
          ? `(${euro(dutreilEligibleValue)} x 25%) + ${euro(actifsExclusDutreilPart)} exclus de l'exonération`
          : `${euro(V)} x 25% après exonération de 75%`
        : "Pacte Dutreil non retenu: assiette inchangée",
      amount: valueAfterDutreil,
      rule: dutreilOK ? "Assiette conservée après exonération partielle 2026." : "Éligibilité à fiabiliser avant exonération.",
    },
    {
      label: "3. Démembrement",
      base: dismembermentBase(valueAfterDutreil),
      amount: valueAfterDutreilDemembrement,
      rule: dismembermentRule,
    },
    {
      label: "4. Part par enfant",
      base: `${euro(valueAfterDutreilDemembrement)} / ${enfantsN} enfant(s)`,
      amount: valueAfterDutreilDemembrementPerChild,
      rule: "Répartition avant abattement personnel.",
    },
    {
      label: "5. Donations antérieures rapportables",
      base: `${donationDutNP.previousSummary} par enfant`,
      amount: donationDutNP.previousPerChild,
      rule: "Rappel fiscal des donations de moins de 15 ans (CGI, art. 784).",
    },
    {
      label: "6. Abattement appliqué par enfant",
      base: donationDutNP.abatementSummary,
      amount: donationDutNP.appliedAbatementPerChild,
      rule: "Reliquat disponible après donations antérieures (CGI, art. 779).",
    },
    {
      label: "7. Base taxable par enfant",
      base: `${euro(valueAfterDutreilDemembrementPerChild)} - ${euro(donationDutNP.appliedAbatementPerChild)}`,
      amount: donationDutNP.taxablePerChild,
      rule: "Base soumise au barème des donations.",
    },
    {
      label: "8. Base taxable donations",
      base: `${euro(donationDutNP.taxablePerChild)} x ${enfantsN} enfant(s)`,
      amount: donationDutNP.taxableTotal,
      rule: "Base taxable totale de la transmission modélisée.",
    },
    {
      label: "9. Application du barème des droits",
      base: "Barème par donateur et par enfant, après tranches déjà consommées",
      amount: dDutNP,
      rule: "Droits dus sur la nouvelle donation selon les articles 777 et 784 du CGI.",
    },
    {
      label: "10. Montant total des droits de donation dus",
      base: "Total à payer au titre de la donation simulée",
      amount: dDutNP,
      rule: "Montant total estimatif dû pour l'opération retenue.",
      total: true,
    },
  ];

  const valueAfterDutreilPerChild = valueAfterDutreil / enfantsN;
  const fiscalLinesDutreilFullOwnership: TaxLine[] = [
    {
      label: "1. Valorisation entreprise",
      base: coupleHeldCompany
        ? `Entreprise déclarée détenue par le couple: 100% de la valorisation de ${euro(Vtot)}`
        : `${rawQuotePart}% de la valorisation de ${euro(Vtot)}`,
      amount: V,
      rule: coupleHeldCompany ? "Valeur des titres transmis par le couple." : "Valeur des titres transmis par le dirigeant.",
    },
    {
      label: "2. Pacte Dutreil",
      base: actifsExclusDutreilPart > 0
        ? `(${euro(dutreilEligibleValue)} x 25%) + ${euro(actifsExclusDutreilPart)} exclus de l'exonération`
        : `${euro(V)} x 25% après exonération de 75%`,
      amount: valueAfterDutreil,
      rule: "Assiette conservée après exonération partielle 2026.",
    },
    {
      label: "3. Transmission en pleine propriété",
      base: "Aucune réserve d'usufruit retenue car l'objectif est le transfert du contrôle",
      amount: valueAfterDutreil,
      rule: "La pleine propriété est cohérente avec une sortie du pouvoir, sous réserve des engagements Dutreil.",
    },
    {
      label: "4. Part par enfant",
      base: `${euro(valueAfterDutreil)} / ${enfantsN} enfant(s)`,
      amount: valueAfterDutreilPerChild,
      rule: "Répartition avant abattement personnel.",
    },
    {
      label: "5. Donations antérieures rapportables",
      base: `${donationDutPP.previousSummary} par enfant`,
      amount: donationDutPP.previousPerChild,
      rule: "Rappel fiscal des donations de moins de 15 ans (CGI, art. 784).",
    },
    {
      label: "6. Abattement appliqué par enfant",
      base: donationDutPP.abatementSummary,
      amount: donationDutPP.appliedAbatementPerChild,
      rule: "Reliquat disponible après donations antérieures (CGI, art. 779).",
    },
    {
      label: "7. Base taxable par enfant",
      base: `${euro(valueAfterDutreilPerChild)} - ${euro(donationDutPP.appliedAbatementPerChild)}`,
      amount: donationDutPP.taxablePerChild,
      rule: "Base soumise au barème des donations.",
    },
    {
      label: "8. Base taxable donations",
      base: `${euro(donationDutPP.taxablePerChild)} x ${enfantsN} enfant(s)`,
      amount: donationDutPP.taxableTotal,
      rule: "Base taxable totale de la transmission modélisée.",
    },
    {
      label: "9. Application du barème des droits",
      base: "Barème par donateur et par enfant, après tranches déjà consommées",
      amount: dDutPP,
      rule: "Droits dus sur la nouvelle donation selon les articles 777 et 784 du CGI.",
    },
    {
      label: "10. Montant total des droits de donation dus",
      base: "Total à payer au titre de la donation simulée",
      amount: dDutPP,
      rule: "Montant total estimatif dû pour l'opération retenue.",
      total: true,
    },
  ];

  const valueDemembrementOnly = dismemberedValue(V);
  const valueDemembrementOnlyPerChild = valueDemembrementOnly / enfantsN;

  const fiscalLinesDismembermentOnly: TaxLine[] = [
    {
      label: "1. Valorisation entreprise",
      base: coupleHeldCompany
        ? `Entreprise déclarée détenue par le couple: 100% de la valorisation de ${euro(Vtot)}`
        : `${rawQuotePart}% de la valorisation de ${euro(Vtot)}`,
      amount: V,
      rule: coupleHeldCompany ? "Valeur des titres transmis par le couple." : "Valeur des titres transmis par le dirigeant.",
    },
    {
      label: "2. Démembrement",
      base: dismembermentBase(V),
      amount: valueDemembrementOnly,
      rule: dismembermentRule,
    },
    {
      label: "3. Part par enfant",
      base: `${euro(valueDemembrementOnly)} / ${enfantsN} enfant(s)`,
      amount: valueDemembrementOnlyPerChild,
      rule: "Répartition avant abattement personnel.",
    },
    {
      label: "4. Donations antérieures rapportables",
      base: `${donationNP.previousSummary} par enfant`,
      amount: donationNP.previousPerChild,
      rule: "Rappel fiscal des donations de moins de 15 ans (CGI, art. 784).",
    },
    {
      label: "5. Abattement appliqué par enfant",
      base: donationNP.abatementSummary,
      amount: donationNP.appliedAbatementPerChild,
      rule: "Reliquat disponible après donations antérieures (CGI, art. 779).",
    },
    {
      label: "6. Base taxable par enfant",
      base: `${euro(valueDemembrementOnlyPerChild)} - ${euro(donationNP.appliedAbatementPerChild)}`,
      amount: donationNP.taxablePerChild,
      rule: "Base soumise au barème des donations.",
    },
    {
      label: "7. Base taxable donations",
      base: `${euro(donationNP.taxablePerChild)} x ${enfantsN} enfant(s)`,
      amount: donationNP.taxableTotal,
      rule: "Base taxable totale de la transmission modélisée.",
    },
    {
      label: "8. Application du barème des droits",
      base: "Barème par donateur et par enfant, après tranches déjà consommées",
      amount: dNP,
      rule: "Droits dus sur la nouvelle donation démembrée (CGI, art. 777 et 784).",
    },
    {
      label: "9. Montant total des droits de donation dus",
      base: "Total à payer au titre de la donation simulée",
      amount: dNP,
      rule: "Montant total estimatif dû pour l'opération retenue.",
      total: true,
    },
  ];

  const valueSimplePerChild = V / enfantsN;

  const fiscalLinesSimpleDonation: TaxLine[] = [
    {
      label: "1. Valorisation entreprise",
      base: coupleHeldCompany
        ? `Entreprise déclarée détenue par le couple: 100% de la valorisation de ${euro(Vtot)}`
        : `${rawQuotePart}% de la valorisation de ${euro(Vtot)}`,
      amount: V,
      rule: coupleHeldCompany ? "Valeur des titres transmis par le couple." : "Valeur des titres transmis par le dirigeant.",
    },
    {
      label: "2. Part par enfant",
      base: `${euro(V)} / ${enfantsN} enfant(s)`,
      amount: valueSimplePerChild,
      rule: "Répartition avant abattement personnel.",
    },
    {
      label: "3. Donations antérieures rapportables",
      base: `${donationPP.previousSummary} par enfant`,
      amount: donationPP.previousPerChild,
      rule: "Rappel fiscal des donations de moins de 15 ans (CGI, art. 784).",
    },
    {
      label: "4. Abattement appliqué par enfant",
      base: donationPP.abatementSummary,
      amount: donationPP.appliedAbatementPerChild,
      rule: "Reliquat disponible après donations antérieures (CGI, art. 779).",
    },
    {
      label: "5. Base taxable par enfant",
      base: `${euro(valueSimplePerChild)} - ${euro(donationPP.appliedAbatementPerChild)}`,
      amount: donationPP.taxablePerChild,
      rule: "Base soumise au barème des donations.",
    },
    {
      label: "6. Base taxable donations",
      base: `${euro(donationPP.taxablePerChild)} x ${enfantsN} enfant(s)`,
      amount: donationPP.taxableTotal,
      rule: "Base taxable totale de la transmission modélisée.",
    },
    {
      label: "7. Application du barème des droits",
      base: "Barème par donateur et par enfant, après tranches déjà consommées",
      amount: dPP,
      rule: "Droits dus sur la nouvelle donation en pleine propriété (CGI, art. 777 et 784).",
    },
    {
      label: "8. Montant total des droits de donation dus",
      base: "Total à payer au titre de la donation simulée",
      amount: dPP,
      rule: "Montant total estimatif dû pour l'opération retenue.",
      total: true,
    },
  ];

  const saleFiscalLines = (saleValue: number, acquisitionValue: number, detail: CedDetail): TaxLine[] => [
    {
      label: "1. Prix de cession des titres",
      base: "Valeur des titres cédés retenue dans la simulation",
      amount: saleValue,
      rule: "Prix à documenter dans l'acte de cession.",
    },
    {
      label: "2. Prix de revient fiscal",
      base: "Prix de revient affecté aux titres cédés",
      amount: acquisitionValue,
      rule: "CGI, article 150-0 D.",
    },
    {
      label: "3. Plus-value imposable",
      base: `${euro(saleValue)} - ${euro(acquisitionValue)}`,
      amount: detail.PV,
      rule: "Différence entre le prix effectif de cession et le prix de revient fiscal.",
    },
    {
      label: "4. Impôt sur le revenu au PFU",
      base: `${euro(detail.PV)} x 12,8%`,
      amount: detail.ir,
      rule: "Imposition forfaitaire des plus-values mobilières (CGI, art. 200 A).",
    },
    {
      label: "5. Prélèvements sociaux",
      base: `${euro(detail.PV)} x 17,2%`,
      amount: detail.ps,
      rule: "Prélèvements sociaux modélisés sur la plus-value.",
    },
    {
      label: "6. CEHR estimée",
      base: `Revenu fiscal de référence modélisé : ${euro(detail.rfr)}`,
      amount: detail.ce,
      rule: "Contribution exceptionnelle sur les hauts revenus : 3% puis 4% selon les seuils du foyer (CGI, art. 223 sexies).",
    },
    {
      label: "7. CDHR estimée",
      base: `Cible 2026 ${euro(detail.cdhrTarget)} - impôt de référence majoré ${euro(detail.cdhrReferenceTax)}`,
      amount: detail.cd,
      rule: `Contribution différentielle 2026 avec décote d'entrée art. 224 ; majoration intégrée : ${euro(detail.cdhrMajoration)}.`,
    },
    {
      label: "8. Montant total d'impôt dû",
      base: "IR + prélèvements sociaux + CEHR + CDHR estimées",
      amount: detail.total,
      rule: "Montant fiscal total indicatif de la cession simulée.",
      total: true,
    },
  ];
  const retirementFiscalLines: TaxLine[] = [
    {
      label: "1. Prix de cession des titres",
      base: "Valeur des titres cédés retenue dans la simulation",
      amount: V,
      rule: "Prix à documenter dans l'acte de cession.",
    },
    {
      label: "2. Prix de revient fiscal",
      base: "Prix de revient des titres cédés",
      amount: PR,
      rule: "CGI, article 150-0 D.",
    },
    {
      label: "3. Plus-value avant abattement",
      base: `${euro(V)} - ${euro(PR)}`,
      amount: retraiteDetail.PV,
      rule: "Plus-value de cession avant régime retraite.",
    },
    {
      label: "4. Abattement dirigeant retraite",
      base: `Abattement fixe retenu : ${euro(retirementAbatement)}`,
      amount: Math.min(retraiteDetail.PV, retirementAbatement),
      rule: "Abattement appliqué à l'assiette d'IR sous conditions (CGI, art. 150-0 D ter).",
    },
    {
      label: "5. Impôt sur le revenu",
      base: `${euro(Math.max(0, retraiteDetail.PV - retirementAbatement))} x 12,8%`,
      amount: retraiteDetail.ir,
      rule: "L'abattement retraite réduit l'assiette de l'impôt sur le revenu.",
    },
    {
      label: "6. Prélèvements sociaux",
      base: `${euro(retraiteDetail.PV)} x 17,2%`,
      amount: retraiteDetail.ps,
      rule: "Les prélèvements sociaux demeurent calculés sur la plus-value.",
    },
    {
      label: "7. CEHR estimée",
      base: `Revenu fiscal de référence modélisé : ${euro(retraiteDetail.rfr)}`,
      amount: retraiteDetail.ce,
      rule: "Contribution exceptionnelle sur les hauts revenus : 3% puis 4% selon les seuils du foyer (CGI, art. 223 sexies).",
    },
    {
      label: "8. CDHR estimée",
      base: `Cible 2026 ${euro(retraiteDetail.cdhrTarget)} - impôt de référence majoré ${euro(retraiteDetail.cdhrReferenceTax)}`,
      amount: retraiteDetail.cd,
      rule: `Contribution différentielle 2026 avec décote d'entrée art. 224 ; majoration intégrée : ${euro(retraiteDetail.cdhrMajoration)}.`,
    },
    {
      label: "9. Montant total d'impôt dû",
      base: "IR + prélèvements sociaux + CEHR + CDHR estimées",
      amount: retraiteDetail.total,
      rule: "Montant fiscal total indicatif après abattement retraite.",
      total: true,
    },
  ];
  const reportFiscalLines: TaxLine[] = [
    {
      label: "1. Valeur des titres apportés",
      base: `${rawQuotePart}% des titres valorisés`,
      amount: V,
      rule: "Apport préalable à la holding bénéficiaire.",
    },
    {
      label: "2. Plus-value placée en report",
      base: `${euro(V)} - ${euro(PR)}`,
      amount: directDetail.PV,
      rule: "Report d'imposition de la plus-value d'apport (CGI, art. 150-0 B ter).",
    },
    {
      label: "3. Remploi minimal à justifier",
      base: `${euro(V)} x 70%`,
      amount: V * .70,
      rule: "Engagement requis pour maintenir le report si la holding cède les titres apportés dans les 3 ans (CGI, art. 150-0 B ter ; LF 2026, art. 11).",
    },
    {
      label: "4. Part hors obligation de remploi",
      base: `${euro(V)} x 30%`,
      amount: V * .30,
      rule: "Trésorerie pouvant rester dans la holding sans obligation de remploi au titre du quota ; elle n'est ni exonérée ni versée au dirigeant sans fiscalité propre.",
    },
    {
      label: "5. Effet de la clause de remploi",
      base: "Remploi conforme : maintien du report ; remploi non conforme : fin du report et taxation de la plus-value.",
      amount: directDetail.PV,
      rule: "Le remploi maintient le report initial ; il ne crée pas un nouveau report ni une exonération définitive.",
    },
    {
      label: "6. Impôt immédiatement exigible sur la plus-value en report",
      base: "La plus-value n'est pas exonérée : son imposition est reportée sous conditions.",
      amount: 0,
      rule: "Le report tombe si les conditions de conservation et de remploi ne sont pas respectées.",
      total: true,
    },
  ];
  const spouseUsufructFiscalLines: TaxLine[] = [
    {
      label: "1. Valeur de la fraction protégée",
      base: `${Math.round(protectedShare * 100)}% de la détention du dirigeant de ${euro(dirigeantOwnedValue)}`,
      amount: spouseProtectedFullValue,
      rule: "Valeur des titres dont l'usufruit est transmis.",
    },
    {
      label: "2. Valorisation de l'usufruit donné",
      base: `${euro(spouseProtectedFullValue)} x usufruit ${Math.round(spouseUsufructRate * 100)}% à ${ageMadame} ans`,
      amount: spouseProtectedUsufructValue,
      rule: "Barème fiscal du démembrement (CGI, art. 669).",
    },
    {
      label: "3. Donations antérieures rapportables",
      base: "Donations reçues du dirigeant depuis moins de 15 ans",
      amount: spouseUsufructDonation.previousGift,
      rule: "Rappel fiscal (CGI, art. 784).",
    },
    {
      label: "4. Abattement appliqué",
      base: `Reliquat disponible ${euro(spouseUsufructDonation.remainingAbatement)}`,
      amount: spouseUsufructDonation.appliedAbatement,
      rule: `Abattement entre bénéficiaires selon ${spouseAbatementArticle}.`,
    },
    {
      label: "5. Base taxable de la donation",
      base: `${euro(spouseProtectedUsufructValue)} - ${euro(spouseUsufructDonation.appliedAbatement)}`,
      amount: spouseUsufructDonation.taxableValue,
      rule: "Base soumise au barème entre époux ou partenaires pacsés.",
    },
    {
      label: "6. Montant total des droits de donation dus",
      base: "Barème applicable après prise en compte des donations antérieures",
      amount: spouseUsufructDonation.duties,
      rule: "Barème des donations entre époux ou partenaires pacsés (CGI, art. 777).",
      total: true,
    },
  ];
  const spouseFullFiscalLines: TaxLine[] = [
    {
      label: "1. Valeur des titres donnés",
      base: `${Math.round(protectedShare * 100)}% de la détention du dirigeant de ${euro(dirigeantOwnedValue)}`,
      amount: spouseProtectedFullValue,
      rule: "Donation en pleine propriété de la fraction renseignée.",
    },
    {
      label: "2. Donations antérieures rapportables",
      base: "Donations reçues du dirigeant depuis moins de 15 ans",
      amount: spouseFullDonation.previousGift,
      rule: "Rappel fiscal (CGI, art. 784).",
    },
    {
      label: "3. Abattement appliqué",
      base: `Reliquat disponible ${euro(spouseFullDonation.remainingAbatement)}`,
      amount: spouseFullDonation.appliedAbatement,
      rule: `Abattement applicable selon ${spouseAbatementArticle}.`,
    },
    {
      label: "4. Base taxable de la donation",
      base: `${euro(spouseProtectedFullValue)} - ${euro(spouseFullDonation.appliedAbatement)}`,
      amount: spouseFullDonation.taxableValue,
      rule: "Base soumise au barème entre époux ou partenaires pacsés.",
    },
    {
      label: "5. Montant total des droits de donation dus",
      base: "Barème applicable après prise en compte des donations antérieures",
      amount: spouseFullDonation.duties,
      rule: "Barème des donations entre époux ou partenaires pacsés (CGI, art. 777).",
      total: true,
    },
  ];
  const spouseDeathFiscalLines: TaxLine[] = [
    {
      label: "1. Mise en place de la protection successorale",
      base: spouseCivilAct,
      amount: 0,
      rule: "L'acte organise la protection sans donation immédiate de titres dans ce scénario.",
    },
    {
      label: "2. Droits de mutation au décès du bénéficiaire protégé",
      base: "Conjoint survivant ou partenaire pacsé bénéficiaire",
      amount: 0,
      rule: "Exonération des droits de mutation par décès (CGI, art. 796-0 bis).",
      total: true,
    },
  ];
  const noSpouseFiscalLines: TaxLine[] = [{
    label: "Information manquante",
    base: "Aucun conjoint ou partenaire pacsé bénéficiaire n'est renseigné",
    amount: 0,
    rule: "Compléter la situation avant le chiffrage d'une protection conjugale.",
    total: true,
  }];
  const partialCostBasis = V > 0 ? PR * partialSaleValue / V : 0;

  const fiscalLinesByStrategy: Record<string, TaxLine[]> = {
    "family-main": dutreilOK ? (familyMainUsesDismemberment ? fiscalLines : fiscalLinesDutreilFullOwnership) : fiscalLinesDismembermentOnly,
    "family-dismembered": fiscalLinesDismembermentOnly,
    "family-simple": fiscalLinesSimpleDonation,
    "sale-main": reportFiscalLines,
    "sale-retirement": retirementFiscalLines,
    "sale-direct": saleFiscalLines(V, PR, directDetail),
    "liquidity-partial": saleFiscalLines(partialSaleValue, partialCostBasis, partialDetail),
    "liquidity-direct": saleFiscalLines(V, PR, directDetail),
    "liquidity-retirement": retirementFiscalLines,
    "spouse-death": spouseDeathFiscalLines,
    "spouse-usufruct": spouseUsufructFiscalLines,
    "spouse-full": spouseFullFiscalLines,
    "spouse-required": noSpouseFiscalLines,
  };
  const commonDonationFiscalWatch = [
    "Les donations antérieures saisies sont intégrées par donateur et par enfant ; leurs actes et dates restent à vérifier.",
    "Les réductions spécifiques et dons non rapportables ne sont pas modélisés.",
    "Le chiffrage final doit être confirmé sur l'acte, la valorisation des titres et la situation déclarative réelle.",
  ];
  const fiscalWatchByStrategy: Record<string, string[]> = {
    "family-main": [
      ...commonDonationFiscalWatch,
      dutreilOK
        ? `L'exonération partielle est conditionnée à l'éligibilité, aux engagements de conservation et à la vérification des actifs non exclusivement professionnels saisis pour ${euro(actifsExclusDutreilPart)}.`
        : "Cette option ne peut bénéficier de l'exonération partielle tant que les conditions d'éligibilité ne sont pas sécurisées.",
      familyMainUsesDismemberment
        ? `La valeur de nue-propriété doit être confirmée selon ${dismembermentRuleDetail}.`
        : "La pleine propriété est retenue pour respecter l'objectif de transfert du contrôle ; vérifier que le dirigeant accepte la perte des droits attachés aux titres donnés.",
    ],
    "family-dismembered": [
      ...commonDonationFiscalWatch,
      `La valeur taxable de la nue-propriété doit être confirmée selon ${dismembermentRuleDetail}.`,
      "Vérifier la rédaction de l'acte et l'organisation des droits d'usufruit et de nue-propriété.",
    ],
    "family-simple": [
      ...commonDonationFiscalWatch,
      "La simulation porte sur une transmission en pleine propriété : vérifier l'étendue exacte des titres transmis et l'accord du conjoint lorsqu'il est requis.",
    ],
    "sale-main": [
      "Le montant affiché est l'impôt immédiatement exigible sur la plus-value placée en report : il ne s'agit pas d'une exonération définitive.",
      "Si la holding cède les titres apportés dans les 3 ans, le report dépend de l'engagement de remployer au moins 70% du produit dans les 3 ans suivant la cession.",
      `Le quota laisse jusqu'à ${euro(V * .30)} sans obligation de remploi dans la holding ; cette fraction ne constitue pas une somme nette distribuable au dirigeant en franchise d'impôt.`,
      "Investissements éligibles : moyens permanents d'exploitation d'une activité opérationnelle éligible, acquisition ou souscription au capital de sociétés opérationnelles admissibles, ou véhicules de capital-investissement autorisés (FCPR, FPCI, SLP, SCR) sous leurs conditions.",
      "Investissements exclus notamment : activités financières, gestion du propre patrimoine mobilier ou immobilier, construction d'immeubles en vue de vente ou location et activités immobilières.",
      "La fiscalité ultérieure de la holding, des distributions ou de la sortie du report n'est pas calculée dans ce montant.",
    ],
    "sale-retirement": [
      "L'abattement retraite suppose la validation complète des conditions légales avant signature.",
      "Les prélèvements sociaux et contributions additionnelles ne sont pas neutralisés par l'abattement d'impôt sur le revenu.",
      "La CEHR et la CDHR reposent sur le revenu fiscal de référence du foyer ; la CDHR 2026 intègre la décote d'entrée, la majoration de 12 500 € pour les couples et 1 500 € par personne à charge.",
      "Le chiffrage CEHR/CDHR doit être confirmé avec la déclaration globale du foyer, notamment pour les retraitements du RFR et les revenus exceptionnels.",
    ],
    "sale-direct": [
      "Le calcul suppose le PFU ; l'option globale pour le barème progressif doit être comparée au cas réel.",
      "Le prix de revient fiscal et le prix effectif de cession doivent être justifiés.",
      "CEHR et CDHR sont estimées à partir des données de revenus saisies ; la CDHR 2026 tient compte de la décote d'entrée et des majorations légales renseignées.",
    ],
    "liquidity-partial": [
      "La fraction de titres à vendre est une estimation destinée à atteindre le besoin net saisi ; elle doit être recalculée avec le prix signé.",
      "Le prix de revient est ventilé proportionnellement aux titres cédés dans la simulation.",
      "CEHR et CDHR sont estimées sur la fraction cédée et les revenus renseignés ; la CDHR 2026 tient compte de la décote d'entrée et des majorations légales du foyer.",
      "Vérifier l'impact de la vente partielle sur le contrôle et les accords entre associés.",
    ],
    "liquidity-direct": [
      "Le net disponible suppose l'encaissement effectif du prix et le paiement de l'imposition estimée.",
      "Comparer le PFU à l'option globale au barème dans la situation réelle du foyer.",
      "CEHR et CDHR sont estimées à partir des revenus renseignés ; la CDHR 2026 tient compte de la décote d'entrée et des majorations légales renseignées.",
    ],
    "liquidity-retirement": [
      "La disponibilité nette dépend du maintien de l'abattement retraite après contrôle des conditions.",
      "Les prélèvements sociaux et contributions estimées demeurent applicables.",
      "La CDHR 2026 est estimée avec la décote d'entrée et les majorations légales du foyer, mais doit être recalée sur l'avis réel.",
      "Vérifier que la sortie complète correspond effectivement au besoin de liquidités et au projet professionnel.",
    ],
    "spouse-death": [
      "Le montant nul correspond à la mise en place et aux droits successoraux du bénéficiaire protégé, non aux coûts d'acte ou à la gouvernance future.",
      "La donation entre époux concerne le mariage ; pour un PACS, la protection successorale exige notamment un testament.",
      "Les droits des enfants et la gouvernance de l'entreprise doivent être analysés avec le notaire.",
    ],
    "spouse-usufruct": [
      `La valorisation fiscale de l'usufruit repose sur l'âge renseigné du bénéficiaire (${ageMadame} ans).`,
      `L'abattement de 80 724 € est appliqué selon ${spouseAbatementArticle}, après les donations antérieures saisies.`,
      "La donation d'usufruit produit des effets immédiats sur les revenus attachés aux titres.",
    ],
    "spouse-full": [
      "La donation de pleine propriété transfère immédiatement les droits attachés aux titres donnés.",
      `L'abattement de 80 724 € est appliqué selon ${spouseAbatementArticle}, après les donations antérieures saisies.`,
      "La valorisation et la nouvelle répartition du pouvoir doivent être sécurisées dans les actes sociaux.",
    ],
    "spouse-required": [
      "Aucun calcul de protection du conjoint ne peut être interprété sans bénéficiaire éligible renseigné.",
    ],
  };

  const controlGuardrail = wantsControl
    ? "Objectif de contrôle conservé : formaliser les droits de vote (usufruit/nue-propriété), les clauses statutaires et un pacte d'associés avant la transmission."
    : acceptsSharedControl
      ? "Objectif de contrôle partagé : préciser les décisions réservées, les droits d'information, la nomination des dirigeants et les étapes de bascule du pouvoir."
      : "Objectif de transfert ou de sortie du contrôle : encadrer la gouvernance post-opération, les garanties données et les mécanismes de sortie.";

  const legalPanels: LegalPanel[] = [
    {
      title: "Pacte Dutreil",
      plain: "Une partie importante de la valeur transmise peut sortir de l'assiette taxable si l'entreprise, les titres et les engagements sont suivis.",
      technical: "Depuis la loi de finances 2026, le dossier doit aussi isoler les actifs non exclusivement affectés à l'activité professionnelle, qui ne profitent pas de l'exonération de 75%.",
      example: `Sur ${euro(V)}, le moteur applique Dutreil sur ${euro(dutreilEligibleValue)} d'actif éligible et conserve ${euro(actifsExclusDutreilPart)} hors exonération.`,
      caution: secteurNonElig ? "La saisie pointe une holding passive ou un secteur immobilier; l'éligibilité ne doit pas être présumée." : "Conserver les preuves de seuils, fonctions, actifs éligibles et engagement individuel de 6 ans.",
      references: ["CGI 787 B", "Loi de finances 2026 art. 8", "BOFiP Dutreil"],
    },
    {
      title: "Démembrement et gouvernance",
      plain: coupleHeldCompany ? "Chaque époux peut transmettre la nue-propriété des titres qu'il détient tout en conservant son usufruit." : "Le dirigeant peut transmettre la nue-propriété tout en conservant une partie des revenus et du pouvoir.",
      technical: `L'acte, les statuts et la convention de vote doivent traiter usufruit, dividendes, réserves et décisions collectives. ${controlGuardrail}`,
      example: coupleHeldCompany
        ? `Le calcul applique ${Math.round(q * 100)}% de nue-propriété aux titres de Monsieur (${age} ans) et ${Math.round(qMadame * 100)}% à ceux de Madame (${ageMadame} ans).`
        : `À ${age} ans, la nue-propriété est valorisée à ${Math.round(q * 100)}% dans le calcul fiscal indicatif.`,
      caution: demembrement === "oui" ? "Un démembrement antérieur est déclaré; rapprocher les actes existants avant une nouvelle donation." : "Ne pas confondre fiscalité du démembrement et contrôle réel des décisions sociales.",
      references: ["CGI 669", "CGI 1133"],
    },
    {
      title: "Cession et apport-cession",
      plain: "Une vente directe donne de la liquidité; une holding peut différer l'imposition si le calendrier et le réinvestissement sont respectés.",
      technical: "L'apport doit précéder la cession et le report doit être suivi avec un remploi 2026 minimal de 70% sous 3 ans, puis les délais de conservation applicables.",
      example: reinvest === "oui" ? "Le dossier déclare un projet de réinvestissement; la holding devient un scénario prioritaire si le remploi 70% est finançable." : "Sans réinvestissement, l'apport-cession revient vers la fiscalité de la vente.",
      caution: "Une cession déjà engagée ou un montage sans substance économique appelle une revue anti-abus.",
      references: ["CGI 150-0 B ter", "Loi de finances 2026 art. 11", "LPF L.64"],
    },
    {
      title: "Famille, conjoint et succession",
      plain: "La solution doit rester compréhensible et équilibrée pour le conjoint, les enfants repreneurs et les non-repreneurs.",
      technical: "Régime matrimonial, donation-partage, clauses statutaires, soultes et protection successorale doivent être rapprochés.",
      example: titresCommuns ? "Le régime saisi peut appeler l'accord du conjoint sur les titres communs." : "Les titres paraissent propres, mais la protection du conjoint reste un sujet patrimonial.",
      caution: "L'économie fiscale ne remplace pas l'analyse civile de l'égalité familiale et des pouvoirs.",
      references: ["Code civil 1424", "Code civil - donation-partage"],
    },
  ];

  const timeline: ProcessStep[] = [
    {
      title: "Audit patrimonial et juridique",
      objective: "Fiabiliser la photographie du dirigeant, de la famille et des titres.",
      actions: "Collecter les actes, les valorisations, la structure capitalistique et les objectifs.",
      owners: "CGP, dirigeant, expert-comptable",
      documents: "Statuts, registre des titres, comptes, régime matrimonial, actes antérieurs",
      timing: "1 à 3 semaines",
      watch: residence === "france" ? "Vérifier la cohérence civil/fiscal." : "Ajouter l'analyse internationale et conventionnelle.",
    },
    {
      title: saleObjective ? "Structuration de la cession" : "Qualification Dutreil et gouvernance",
      objective: saleObjective ? "Choisir entre vente directe, retraite et holding." : "Sécuriser éligibilité, contrôle et revenus.",
      actions: saleObjective ? "Tester SPA, holding, réinvestissement et garanties." : "Vérifier engagements, direction, usufruit et clauses de vote.",
      owners: "Avocat fiscaliste, notaire, conseil M&A",
      documents: saleObjective ? "LOI, data room, valorisation, calendrier d'apport et plan de remploi 70%" : "Engagements Dutreil, projet d'acte, statuts, gouvernance, ventilation actifs éligibles",
      timing: "2 à 6 semaines",
      watch: saleObjective ? "Ne pas inverser apport et cession." : "Ne pas présumer l'activité éligible.",
    },
    {
      title: saleObjective ? "Actes de cession et flux" : "Donation ou donation-partage",
      objective: "Réaliser l'opération retenue avec sa piste d'audit.",
      actions: saleObjective ? "Signer, calculer la plus-value, tracer prix et réinvestissement." : "Signer les actes, calculer les droits, déposer les déclarations.",
      owners: "Notaire, avocat, expert-comptable",
      documents: "Actes signés, déclarations, preuves de paiement, procès-verbaux",
      timing: saleObjective ? "Jour J à 3 ans selon réinvestissement" : "Jour J puis engagements de conservation",
      watch: "Conserver les preuves et le calendrier opposable.",
    },
    {
      title: "Suivi post-opération et rapport",
      objective: "Transformer la simulation en dossier client exploitable.",
      actions: "Mettre à jour la timeline, les obligations, la fiscalité future et le rapport PDF.",
      owners: "Cabinet, client, partenaires juridiques",
      documents: "Rapport, échéancier, annexes BOFiP/CGI, checklists de suivi",
      timing: "Annuel et à chaque événement",
      watch: "Relancer les obligations déclaratives et la veille réglementaire.",
    },
  ];

  const dossier: DossierResult = {
    recommendation,
    metrics,
    insights,
    fiscalLines,
    fiscalLinesByStrategy,
    fiscalWatchByStrategy,
    contextByStrategy,
    legalPanels,
    sources: officialSources,
    timeline,
  };

  const tabMap: Record<string, ResultTab> = {
    transmission: "scenarios",
    cession: "scenarios",
    liquidite: "scenarios",
    protection: "situation",
  };

  return { ctx, transmettre, ceder, mixte, dossier, strategiesByObjective, suggestedTab: tabMap[objectif] ?? "scenarios", objective: objectif, control: controle };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Simulator() {
  const [form, setForm] = useState<FormState>({
    age: 58, ageMadame: 58, enfants: 2, donationsAnterieuresMonsieur: 0, donationsAnterieuresMadame: 0,
    donationsAnterieuresConjoint: 0,
    situation: "marié", regime: "communaute_legale", residence: "france",
    formejur: "SAS", secteur: "commercial", holding: "non", statut: "assimile",
    valeur: 3000000, quotepart: 100, prixrevient: 200000, plusvalues: 2800000,
    revenusDirigeant: 180000, dividendes: 90000, autresrev: 150000, personnesCharge: 0,
    actifsExclusDutreil: 0,
    besoinLiquidite: 500000, partProtectionConjoint: 25, besoinConjoint: "deces",
    objectif: "transmission", controle: "conserver",
  });
  const [segs, setSegs] = useState<SegState>({
    dutreil: "oui", retraite: "non", reinvest: "oui", repreneurs: "oui", conserver: "oui", demembrement: "non", coupleDetention: "non", jeuneAgriculteur: "non",
  });
  const [results, setResults] = useState<AllResults | null>(null);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("scenarios");
  const [showDutreilMemo, setShowDutreilMemo] = useState(false);

  function run() {
    const r = compute(form, segs);
    setResults(r);
    setSelectedStrategyId(null);
    setActiveTab(r.suggestedTab);
    setTimeout(() => document.getElementById("sim-results")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  const yn = [{ v: "oui", label: "Oui" }, { v: "non", label: "Non" }];
  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === "number" ? +e.target.value : e.target.value }));
  const setSeg = (k: keyof typeof segs) => (v: string) => setSegs(s => ({ ...s, [k]: v }));
  const saleObjective = form.objectif === "cession" || form.objectif === "liquidite";
  const transmissionObjective = form.objectif === "transmission";
  const protectionObjective = form.objectif === "protection";
  const familyObjective = transmissionObjective || protectionObjective;
  const hasPartner = form.situation === "marié" || form.situation === "pacsé";
  const strategyOptions = results ? buildClientStrategies(results) : [];
  const selectedStrategy = strategyOptions.find(strategy => strategy.id === selectedStrategyId)
    ?? strategyOptions.find(strategy => strategy.recommended)
    ?? strategyOptions[0];
  const activeContext = results && selectedStrategy
    ? results.dossier.contextByStrategy[selectedStrategy.id] ?? results.ctx
    : [];

  return (
    <div className={css.page}>
      <header className={`${css.header} ${css.printHidden}`}>
        <div className={css.headerTop}>
          <div>
            <p className={css.kicker}>Cabinet de gestion de patrimoine · Plateforme d'ingénierie patrimoniale · v3</p>
            <h1 className={css.h1}>Transmission &amp; cession du patrimoine professionnel du dirigeant</h1>
            <p className={css.headerP}>Une saisie unique, puis un dossier dirigeant recentré : scénarios, analyses juridique et fiscale, sources officielles et rapport client imprimable.</p>
          </div>
          <Link href="/" className={css.btnReturn}>← Retour</Link>
        </div>
      </header>

      <div className={css.wrap}>

        {/* ── Formulaire ── */}
        <div className={`${css.card} ${css.printHidden}`}>
          <h2 className={css.cardH2}><span className={css.secNum}>1</span>Situation du dirigeant &amp; de l'entreprise</h2>
          <p className={css.sub}>Saisie commune aux analyses. Montants en euros — hypothèses fiscales indicatives et pièces du dossier à vérifier.</p>

          <h3 className={css.blockH3}>Profil du dirigeant</h3>
          <div className={css.grid}>
            <div>
              {familyObjective && (
                <>
                  {transmissionObjective && (
                    <>
                      <label className={css.fieldLabel}>Âge du dirigeant <span className={css.hint}>(démembrement)</span></label>
                      <input type="number" className={css.textInput} value={form.age} min={25} max={100} onChange={setF("age")} />
                      {form.quotepart < 100 && hasPartner && segs.coupleDetention === "oui" && (
                        <>
                          <label className={css.fieldLabel}>Âge de Madame <span className={css.hint}>(démembrement de ses parts)</span></label>
                          <input type="number" className={css.textInput} value={form.ageMadame} min={25} max={100} onChange={setF("ageMadame")} />
                        </>
                      )}
                    </>
                  )}
                  {protectionObjective && hasPartner && (
                    <>
                      <label className={css.fieldLabel}>{form.situation === "pacsé" ? "Âge du partenaire bénéficiaire" : "Âge du conjoint bénéficiaire"} <span className={css.hint}>(valorisation d'un usufruit)</span></label>
                      <input type="number" className={css.textInput} value={form.ageMadame} min={18} max={110} onChange={setF("ageMadame")} />
                    </>
                  )}
                  <label className={css.fieldLabel}>Nombre d'enfants</label>
                  <input type="number" className={css.textInput} value={form.enfants} min={0} max={12} onChange={setF("enfants")} />
                </>
              )}
              <label className={css.fieldLabel}>Situation matrimoniale</label>
              <select className={css.selectInput} value={form.situation} onChange={setF("situation")}>
                <option value="marié">Marié</option>
                <option value="pacsé">Pacsé</option>
                <option value="célibataire">Célibataire</option>
                <option value="divorcé">Divorcé</option>
                <option value="veuf">Veuf</option>
              </select>
            </div>
            <div>
              {familyObjective && form.situation === "marié" && (
                <>
                  <label className={css.fieldLabel}>Régime matrimonial</label>
                  <select className={css.selectInput} value={form.regime} onChange={setF("regime")}>
                    <option value="communaute_legale">Communauté légale (réduite aux acquêts)</option>
                    <option value="communaute_universelle">Communauté universelle</option>
                    <option value="separation">Séparation de biens</option>
                    <option value="participation">Participation aux acquêts</option>
                    <option value="separation_societe">Séparation avec société d'acquêts</option>
                    <option value="pacs">PACS</option>
                    <option value="etranger">Régime étranger (ex. marocain)</option>
                    <option value="celibataire">Célibataire / Veuf / Divorcé</option>
                  </select>
                </>
              )}
              <label className={css.fieldLabel}>Résidence fiscale</label>
              <select className={css.selectInput} value={form.residence} onChange={setF("residence")}>
                <option value="france">France</option>
                <option value="ue">Union européenne hors France</option>
                <option value="hors_ue">Hors Union européenne</option>
              </select>
              {form.objectif === "transmission" && (
                <>
                  <label className={css.fieldLabel}>Enfants repreneurs identifiés ?</label>
                  <Seg value={segs.repreneurs} onChange={setSeg("repreneurs")}
                    options={[{ v: "oui", label: "Oui" }, { v: "non", label: "Non / pas encore" }]} />
                </>
              )}
            </div>
          </div>

          <h3 className={css.blockH3}>Profil de l'entreprise</h3>
          <div className={css.grid}>
            <div>
              <label className={css.fieldLabel}>Forme juridique de la structure</label>
              <select className={css.selectInput} value={form.formejur} onChange={setF("formejur")}>
                <option value="SAS">SAS / SASU</option>
                <option value="SA">SA</option>
                <option value="SARL">SARL / EURL</option>
                <option value="SCA">SCA</option>
                <option value="SC">Société civile (SC / SCI)</option>
                <option value="EI">Entreprise individuelle</option>
                <option value="HOLDING">Holding</option>
              </select>
              <label className={css.fieldLabel}>Secteur / nature de l'activité</label>
              <select className={css.selectInput} value={form.secteur} onChange={setF("secteur")}>
                <option value="commercial">Commerciale / industrielle</option>
                <option value="liberal">Libérale</option>
                <option value="artisanal">Artisanale</option>
                <option value="agricole">Agricole</option>
                <option value="holding_animatrice">Holding animatrice</option>
                <option value="holding_passive">Holding passive / patrimoniale</option>
                <option value="immobilier">Immobilier (gestion de patrimoine)</option>
              </select>
              {saleObjective && (
                <>
                  <label className={css.fieldLabel}>Statut du dirigeant</label>
                  <select className={css.selectInput} value={form.statut} onChange={setF("statut")}>
                    <option value="assimile">Assimilé salarié</option>
                    <option value="tns">Travailleur non salarié</option>
                    <option value="liberal">Profession libérale</option>
                    <option value="mandat">Mandat non rémunéré</option>
                  </select>
                </>
              )}
              <label className={css.fieldLabel}>Valeur vénale de l'entreprise (100% des titres) €</label>
              <input type="number" className={css.textInput} value={form.valeur} min={0} step={10000} onChange={setF("valeur")} />
            </div>
            <div>
              <label className={css.fieldLabel}>Quote-part détenue par le dirigeant <span className={css.hint}>(%)</span></label>
              <input type="number" className={css.textInput} value={form.quotepart} min={0} max={100} step={1} onChange={setF("quotepart")} />
              {transmissionObjective && form.quotepart < 100 && hasPartner && (
                <>
                  <label className={css.fieldLabel}>Entreprise détenue par le couple ?</label>
                  <Seg value={segs.coupleDetention} onChange={setSeg("coupleDetention")} options={yn} />
                </>
              )}
              {transmissionObjective && (
                <>
                  <label className={css.fieldLabel}>Donations antérieures de moins de 15 ans par Monsieur, par enfant €</label>
                  <input type="number" className={css.textInput} value={form.donationsAnterieuresMonsieur} min={0} step={1000} onChange={setF("donationsAnterieuresMonsieur")} />
                  {form.quotepart < 100 && hasPartner && segs.coupleDetention === "oui" && (
                    <>
                      <label className={css.fieldLabel}>Donations antérieures de moins de 15 ans par Madame, par enfant €</label>
                      <input type="number" className={css.textInput} value={form.donationsAnterieuresMadame} min={0} step={1000} onChange={setF("donationsAnterieuresMadame")} />
                    </>
                  )}
                  <p className={css.hint}>Montants reçus par chacun des enfants du même donateur, soumis au rappel fiscal de l'article 784 du CGI. Si l'historique diffère entre enfants, réaliser un chiffrage individualisé.</p>
                </>
              )}
              {protectionObjective && hasPartner && (
                <>
                  <label className={css.fieldLabel}>Fraction des parts détenues par le dirigeant à protéger ou transmettre au bénéficiaire (%)</label>
                  <input type="number" className={css.textInput} value={form.partProtectionConjoint} min={0} max={100} step={1} onChange={setF("partProtectionConjoint")} />
                  <label className={css.fieldLabel}>Donations reçues du dirigeant par le bénéficiaire depuis moins de 15 ans €</label>
                  <input type="number" className={css.textInput} value={form.donationsAnterieuresConjoint} min={0} step={1000} onChange={setF("donationsAnterieuresConjoint")} />
                  <p className={css.hint}>Ces donations diminuent l'abattement de 80 724 € encore disponible pour une donation immédiate au conjoint ou partenaire.</p>
                </>
              )}
              <label className={css.fieldLabel}>Holding existante</label>
              <select className={css.selectInput} value={form.holding} onChange={setF("holding")}>
                <option value="non">Non</option>
                <option value="animatrice">Holding animatrice</option>
                <option value="passive">Holding passive / patrimoniale</option>
              </select>
              {saleObjective && (
                <>
                  <label className={css.fieldLabel}>Prix d'acquisition / valeur fiscale des titres €</label>
                  <input type="number" className={css.textInput} value={form.prixrevient} min={0} step={10000} onChange={setF("prixrevient")} />
                  <label className={css.fieldLabel}>Autres revenus annuels du foyer (hors cession) € <span className={css.hint}>(CEHR / CDHR)</span></label>
                  <input type="number" className={css.textInput} value={form.autresrev} min={0} step={5000} onChange={setF("autresrev")} />
                  <label className={css.fieldLabel}>Personnes fiscalement à charge du foyer <span className={css.hint}>(CDHR)</span></label>
                  <input type="number" className={css.textInput} value={form.personnesCharge} min={0} max={12} step={1} onChange={setF("personnesCharge")} />
                  <p className={css.hint}>La CDHR 2026 majore l'impôt de référence de 1 500 € par personne à charge et de 12 500 € en cas d'imposition commune.</p>
                </>
              )}
            </div>
          </div>

          {transmissionObjective && (
            <>
              <h3 className={css.blockH3}>Revenus et points Dutreil</h3>
              <div className={css.grid}>
                <div>
                  <label className={css.fieldLabel}>Revenus professionnels annuels du dirigeant €</label>
                  <input type="number" className={css.textInput} value={form.revenusDirigeant} min={0} step={5000} onChange={setF("revenusDirigeant")} />
                  <label className={css.fieldLabel}>Dividendes annuels attendus €</label>
                  <input type="number" className={css.textInput} value={form.dividendes} min={0} step={5000} onChange={setF("dividendes")} />
                </div>
                <div>
                  <label className={css.fieldLabel}>Actifs exclus Dutreil 2026 € <span className={css.hint}>(non exclusivement professionnels)</span></label>
                  <input type="number" className={css.textInput} value={form.actifsExclusDutreil} min={0} step={10000} onChange={setF("actifsExclusDutreil")} />
                  <label className={css.fieldLabel}>Démembrement déjà existant ?</label>
                  <Seg value={segs.demembrement} onChange={setSeg("demembrement")} options={yn} />
                </div>
              </div>
            </>
          )}
          {protectionObjective && hasPartner && (
            <>
              <h3 className={css.blockH3}>Besoin de protection du conjoint</h3>
              <div className={css.grid}>
                <div>
                  <label className={css.fieldLabel}>Besoin prioritaire du conjoint</label>
                  <select className={css.selectInput} value={form.besoinConjoint} onChange={setF("besoinConjoint")}>
                    <option value="deces">Protection au décès, sans transfert immédiat</option>
                    <option value="revenus">Percevoir les revenus des titres</option>
                    <option value="propriete">Détenir immédiatement une fraction des titres</option>
                  </select>
                </div>
                <div>
                  <label className={css.fieldLabel}>Dividendes annuels attachés aux titres €</label>
                  <input type="number" className={css.textInput} value={form.dividendes} min={0} step={5000} onChange={setF("dividendes")} />
                </div>
              </div>
            </>
          )}
          {saleObjective && (
            <>
              <h3 className={css.blockH3}>Données de cession</h3>
              <div className={css.grid}>
                <div>
                  <label className={css.fieldLabel}>Plus-values latentes renseignées €</label>
                  <input type="number" className={css.textInput} value={form.plusvalues} min={0} step={10000} onChange={setF("plusvalues")} />
                </div>
                <div>
                  {form.objectif === "cession" && (
                    <>
                      <label className={css.fieldLabel}>Projet de remploi éligible d'au moins 70% du produit de cession dans les 3 ans ?</label>
                      <Seg value={segs.reinvest} onChange={setSeg("reinvest")}
                        options={[{ v: "oui", label: "Oui, remploi éligible" }, { v: "non", label: "Non" }]} />
                      {segs.reinvest === "oui" && (
                        <p className={css.hint}>Sont visés notamment les moyens d'exploitation d'une activité industrielle, commerciale, artisanale, agricole ou libérale, des sociétés opérationnelles éligibles ou certains fonds de capital-investissement. Sont exclus notamment les activités financières et immobilières. Le solde maximal de 30% n'est pas à remployer, mais il reste dans la holding : ce n'est pas une exonération personnelle du dirigeant.</p>
                      )}
                    </>
                  )}
                  {form.objectif === "liquidite" && (
                    <>
                      <label className={css.fieldLabel}>Besoin net de liquidités immédiatement disponible €</label>
                      <input type="number" className={css.textInput} value={form.besoinLiquidite} min={0} step={10000} onChange={setF("besoinLiquidite")} />
                      <p className={css.hint}>La simulation déterminera la fraction de titres à céder pour couvrir ce besoin, si possible.</p>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          <h3 className={css.blockH3}>Objectifs &amp; contraintes</h3>
          <div className={css.grid}>
            <div>
              <label className={css.fieldLabel}>Objectif principal</label>
              <select className={css.selectInput} value={form.objectif} onChange={setF("objectif")}>
                <option value="transmission">Transmission familiale</option>
                <option value="cession">Cession à un tiers</option>
                <option value="protection">Protection du conjoint</option>
                <option value="liquidite">Liquidité immédiate</option>
              </select>
              {(familyObjective || form.objectif === "liquidite") && (
                <>
                  <label className={css.fieldLabel}>Contrôle souhaité après l'opération</label>
                  <select className={css.selectInput} value={form.controle} onChange={setF("controle")}>
                    <option value="conserver">Conserver le contrôle</option>
                    <option value="partage">Partager progressivement le contrôle</option>
                    <option value="sortie">Transférer ou sortir du contrôle</option>
                  </select>
                  <p className={css.hint}>Ce choix influence la stratégie recommandée : démembrement si le contrôle doit rester encadré, pleine propriété ou cession si le contrôle doit être transféré.</p>
                </>
              )}
            </div>
            <div>
              {transmissionObjective && (
                <>
                  <div className={css.fieldLabelRow}>
                    <label className={css.fieldLabelInline}>La société exerce-t-elle une activité éligible au Pacte Dutreil ?</label>
                    <button
                      type="button"
                      className={css.memoButton}
                      aria-label="Afficher le mémo des conditions Dutreil"
                      aria-expanded={showDutreilMemo}
                      onClick={() => setShowDutreilMemo(open => !open)}
                    >
                      *
                    </button>
                  </div>
                  <Seg value={segs.dutreil} onChange={setSeg("dutreil")} options={yn} />
                  {showDutreilMemo && (
                    <div className={css.memoBox}>
                      <h4>Conditions principales d'éligibilité Dutreil</h4>
                      <ul>
                        <li>Activité éligible : commerciale, industrielle, artisanale, agricole, libérale ou holding animatrice.</li>
                        <li>Engagement collectif de conservation de 2 ans, ou dispositif réputé acquis si les conditions sont réunies.</li>
                        <li>Engagement individuel de conservation de 6 ans par les bénéficiaires.</li>
                        <li>Fonction de direction exercée dans les conditions prévues par le régime Dutreil.</li>
                        <li>Depuis 2026, identification des actifs non exclusivement professionnels, exclus de l'exonération de 75%.</li>
                      </ul>
                    </div>
                  )}
                </>
              )}
              {(form.objectif === "cession" || form.objectif === "liquidite") && (
                <>
                  <label className={css.fieldLabel}>Départ en retraite du dirigeant sous 24 mois ?</label>
                  <Seg value={segs.retraite} onChange={setSeg("retraite")} options={yn} />
                  {form.secteur === "agricole" && segs.retraite === "oui" && (
                    <>
                      <label className={css.fieldLabel}>Cession à un jeune agriculteur aidé ?</label>
                      <Seg value={segs.jeuneAgriculteur} onChange={setSeg("jeuneAgriculteur")} options={yn} />
                    </>
                  )}
                </>
              )}
              {transmissionObjective && (
                <>
                  <label className={css.fieldLabel}>Conserver revenus &amp; pouvoir pendant la transmission ?</label>
                  <Seg value={segs.conserver} onChange={setSeg("conserver")} options={yn} />
                </>
              )}
            </div>
          </div>

          <div className={css.cta}>
            <button className={css.btnPrimary} onClick={run}>Générer le dossier dirigeant →</button>
          </div>
        </div>

        {/* ── Résultats ── */}
        {results && selectedStrategy && (
          <div id="sim-results">
            <div className={`${css.card} ${css.printHidden}`}>
              <h2 className={css.cardH2}><span className={css.secNum}>★</span>Contexte juridique &amp; patrimonial</h2>
              <div className={css.ctxGrid}>
                {activeContext.map((item, i) => (
                  <div key={i} className={css.ctxItem}>
                    <div className={css.ctxH}>{item.label}</div>
                    <div>{boldify(item.content)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${css.tabs} ${css.printHidden}`}>
              {([
                ["situation", "1 Situation"],
                ["scenarios", "2 Scénarios"],
                ["juridique", "3 Juridique"],
                ["fiscale", "4 Fiscal"],
                ["sources", "5 Sources"],
                ["rapport", "Rapport client"],
              ] as [ResultTab, string][]).map(([tab, label]) => (
                <button key={tab}
                  className={`${css.tab} ${activeTab === tab ? css.tabOn : ""}`}
                  onClick={() => setActiveTab(tab)}>
                  {label}
                </button>
              ))}
            </div>

            <div className={`${css.tabpane} ${activeTab === "situation" ? css.tabpaneOn : ""}`}>
              <TabSituation d={results.dossier} />
            </div>
            <div className={`${css.tabpane} ${activeTab === "scenarios" ? css.tabpaneOn : ""}`}>
              <TabScenarios
                strategies={strategyOptions}
                selectedId={selectedStrategyId}
                onSelect={setSelectedStrategyId}
              />
            </div>
            <div className={`${css.tabpane} ${activeTab === "juridique" ? css.tabpaneOn : ""}`}>
              <TabJuridique d={results.dossier} strategy={selectedStrategy} />
            </div>
            <div className={`${css.tabpane} ${activeTab === "fiscale" ? css.tabpaneOn : ""}`}>
              <TabFiscal d={results.dossier} strategy={selectedStrategy} />
            </div>
            <div className={`${css.tabpane} ${activeTab === "sources" ? css.tabpaneOn : ""}`}>
              <TabSources d={results.dossier} strategy={selectedStrategy} />
            </div>
            <div className={`${css.tabpane} ${activeTab === "rapport" ? css.tabpaneOn : ""}`}>
              <TabReport d={results.dossier} strategy={selectedStrategy} context={activeContext} />
            </div>

            <p className={`${css.footerNote} ${css.printHidden}`}>
              Prototype v3 — Cabinet CGP · Plateforme de transmission professionnelle · Chiffrage indicatif à sécuriser avec les sources et actes du dossier
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
