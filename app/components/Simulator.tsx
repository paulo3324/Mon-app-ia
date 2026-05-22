"use client";

import { useState } from "react";
import css from "./Simulator.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PieSeg { label: string; value: number; color: string; }

interface Strategy {
  name: string; cost: number; gain: number; gainPct: number;
  delai: string; complex: number; risque: number; points: string[]; best: boolean;
}

interface TransResult {
  recoTitle: string; recoSub: string;
  kpiSans: number; kpiAvec: number; kpiEco: number; kpiEcoPct: number;
  pieBefore: PieSeg[]; pieAfter: PieSeg[]; pieTotal: number;
  strategies: Strategy[];
  hypothesis: string; plan: string[];
}

interface CedDetail { PV: number; ir: number; ps: number; ce: number; cd: number; rfr: number; total: number; }

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
  suggestedTab: string;
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

function cdhrCalc(rfr: number, couple: boolean, impotRef: number): number {
  const seuil = couple ? 500000 : 250000;
  if (rfr <= seuil) return 0;
  return Math.max(0, 0.20 * rfr - impotRef);
}

const euro = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";
const pct = (a: number, b: number) => b > 0 ? Math.round(a / b * 100) : 0;

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

// ─── SVG Pie chart ────────────────────────────────────────────────────────────

function SvgPie({ segments, size = 150 }: { segments: PieSeg[]; size?: number }) {
  const r = size / 2 - 2, cx = size / 2, cy = size / 2;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let ang = -Math.PI / 2;
  const paths = segments.map((s, i) => {
    const a0 = ang;
    ang += (s.value / total) * 2 * Math.PI;
    if (s.value / total > 0.999)
      return <circle key={i} cx={cx} cy={cy} r={r} fill={s.color} />;
    const x1 = cx + r * Math.cos(a0), y1 = cy + r * Math.sin(a0);
    const x2 = cx + r * Math.cos(ang), y2 = cy + r * Math.sin(ang);
    const large = (ang - a0) > Math.PI ? 1 : 0;
    return (
      <path key={i}
        d={`M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`}
        fill={s.color}
      />
    );
  });
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{paths}</svg>;
}

// ─── Pie box (before / after) ─────────────────────────────────────────────────

function PieBox({ title, segments, total, best }: { title: string; segments: PieSeg[]; total: number; best?: boolean }) {
  return (
    <div className={`${css.pieBox} ${best ? css.pieBoxBest : ""}`}>
      <h4 className={css.pieBoxTitle}>{title}</h4>
      <SvgPie segments={segments} />
      <div className={css.legend}>
        {segments.map((s, i) => (
          <div key={i}>
            <span className={css.legendDot} style={{ background: s.color }} />
            {s.label} : <b>{euro(s.value)}</b> ({pct(s.value, total)}%)
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Strategy card ────────────────────────────────────────────────────────────

function StratCard({ s }: { s: Strategy }) {
  const dots = (n: number) => "●".repeat(n) + "○".repeat(3 - n);
  return (
    <div className={`${css.strat} ${s.best ? css.stratBest : ""}`}>
      {s.best && <span className={css.stratBadge}>RECOMMANDÉE</span>}
      <h4 className={css.stratH4}>{s.name}</h4>
      <div className={css.stratCost}>{euro(s.cost)}</div>
      {s.gain > 0
        ? <div className={css.stratGain}>− {euro(s.gain)} vs référence (−{s.gainPct}%)</div>
        : <div className={css.stratRef}>Scénario de référence</div>}
      <div className={css.stratMeta}>Délai : <b>{s.delai}</b></div>
      <div className={css.stratMeta}>Complexité : <b className={css.dots}>{dots(s.complex)}</b></div>
      <div className={css.stratMeta}>Risque fiscal : <b className={css.dots}>{dots(s.risque)}</b></div>
      <ul className={css.stratList}>
        {s.points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </div>
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

function TabTransmettre({ t }: { t: TransResult }) {
  return (
    <>
      <div className={css.recoBanner}>
        <div className={css.recoTag}>Scénario 1 — Transmission familiale</div>
        <h3 className={css.recoH3}>{t.recoTitle}</h3>
        <p className={css.recoP}>{t.recoSub}</p>
      </div>
      <div className={css.kpis}>
        <div className={css.kpi}>
          <div className={css.kpiV}>{euro(t.kpiSans)}</div>
          <div className={css.kpiL}>Droits sans optimisation</div>
        </div>
        <div className={css.kpi}>
          <div className={css.kpiV}>{euro(t.kpiAvec)}</div>
          <div className={css.kpiL}>Droits stratégie recommandée</div>
        </div>
        <div className={css.kpi}>
          <div className={`${css.kpiV} ${css.kpiVGreen}`}>{euro(t.kpiEco)} (−{t.kpiEcoPct}%)</div>
          <div className={css.kpiL}>Économie de droits</div>
        </div>
      </div>

      <div className={css.card}>
        <h2 className={css.cardH2}><span className={css.secNum}>A</span>Schéma avant / après</h2>
        <p className={css.sub}>Répartition de la valeur transmise : part nette reçue par les enfants vs droits de donation.</p>
        <div className={css.pies}>
          <PieBox title="Sans optimisation" segments={t.pieBefore} total={t.pieTotal} />
          <PieBox title="Stratégie recommandée" segments={t.pieAfter} total={t.pieTotal} best />
        </div>
      </div>

      <div className={css.card}>
        <h2 className={css.cardH2}><span className={css.secNum}>B</span>Stratégies comparées</h2>
        <p className={css.sub}>Trois voies de transmission. La stratégie recommandée est encadrée en doré.</p>
        <div className={css.strats}>
          {t.strategies.map((s, i) => <StratCard key={i} s={s} />)}
        </div>
      </div>

      <div className={css.card}>
        <h2 className={css.cardH2}><span className={css.secNum}>C</span>Détail du chiffrage</h2>
        <table className={css.dataTable}>
          <thead><tr><th>Stratégie</th><th style={{ textAlign: "right" }}>Droits estimés</th></tr></thead>
          <tbody>
            {t.strategies.map((s, i) => (
              <tr key={i} className={s.best ? css.trTotal : undefined}>
                <td>{s.name}</td>
                <td className={css.tdNum}>{euro(s.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={css.disclaimer}><strong>Hypothèses.</strong> {t.hypothesis}</div>
      </div>

      <div className={css.card}>
        <h2 className={css.cardH2}><span className={css.secNum}>D</span>Plan d'action recommandé</h2>
        <ol className={css.plan}>
          {t.plan.map((p, i) => <li key={i} className={css.planLi}>{boldify(p)}</li>)}
        </ol>
      </div>
    </>
  );
}

function TabCeder({ c }: { c: CedResult }) {
  const d = c.detail;
  return (
    <>
      <div className={css.recoBanner}>
        <div className={css.recoTag}>Scénario 2 — Cession à un tiers</div>
        <h3 className={css.recoH3}>{c.recoTitle}</h3>
        <p className={css.recoP}>{c.recoSub}</p>
      </div>
      <div className={css.kpis}>
        <div className={css.kpi}>
          <div className={css.kpiV}>{euro(c.kpiSans)}</div>
          <div className={css.kpiL}>Imposition cession directe</div>
        </div>
        <div className={css.kpi}>
          <div className={css.kpiV}>{euro(c.kpiAvec)}</div>
          <div className={css.kpiL}>Imposition stratégie recommandée</div>
        </div>
        <div className={css.kpi}>
          <div className={`${css.kpiV} ${css.kpiVGreen}`}>{euro(c.kpiEco)} (−{c.kpiEcoPct}%)</div>
          <div className={css.kpiL}>Gain (report / abattement)</div>
        </div>
      </div>

      <div className={css.card}>
        <h2 className={css.cardH2}><span className={css.secNum}>A</span>Schéma avant / après</h2>
        <p className={css.sub}>Répartition du produit de cession : net pour le dirigeant vs imposition (PFU + PS + CEHR + CDHR).</p>
        <div className={css.pies}>
          <PieBox title="Cession directe" segments={c.pieBefore} total={c.pieTotal} />
          <PieBox title="Stratégie recommandée" segments={c.pieAfter} total={c.pieTotal} best />
        </div>
      </div>

      <div className={css.card}>
        <h2 className={css.cardH2}><span className={css.secNum}>B</span>Stratégies comparées</h2>
        <p className={css.sub}>Trois voies de cession. La stratégie recommandée est encadrée en doré.</p>
        <div className={css.strats}>
          {c.strategies.map((s, i) => <StratCard key={i} s={s} />)}
        </div>
      </div>

      <div className={css.card}>
        <h2 className={css.cardH2}><span className={css.secNum}>C</span>Détail de l'imposition (cession directe)</h2>
        <table className={css.dataTable}>
          <thead><tr><th>Composante</th><th style={{ textAlign: "right" }}>Montant</th></tr></thead>
          <tbody>
            <tr><td>Plus-value de cession</td><td className={css.tdNum}>{euro(d.PV)}</td></tr>
            <tr>
              <td>Impôt sur le revenu (12,8%{c.isRetraite ? " après abatt. 500 k€" : ""})</td>
              <td className={css.tdNum}>{euro(d.ir)}</td>
            </tr>
            <tr><td>Prélèvements sociaux (17,2%)</td><td className={css.tdNum}>{euro(d.ps)}</td></tr>
            <tr><td>CEHR (art. 223 sexies) — RFR {euro(d.rfr)}</td><td className={css.tdNum}>{euro(d.ce)}</td></tr>
            <tr><td>CDHR (art. 224, min. 20% RFR)</td><td className={css.tdNum}>{euro(d.cd)}</td></tr>
            <tr className={css.trTotal}><td>Imposition totale</td><td className={css.tdNum}>{euro(d.total)}</td></tr>
          </tbody>
        </table>
        <div className={css.disclaimer}><strong>Hypothèses.</strong> {c.hypothesis}</div>
      </div>

      <div className={css.card}>
        <h2 className={css.cardH2}><span className={css.secNum}>D</span>Plan d'action recommandé</h2>
        <ol className={css.plan}>
          {c.plan.map((p, i) => <li key={i} className={css.planLi}>{boldify(p)}</li>)}
        </ol>
      </div>
    </>
  );
}

function TabMixte({ m }: { m: MixteResult }) {
  return (
    <>
      <div className={css.recoBanner}>
        <div className={css.recoTag}>Scénario 3 — Stratégie mixte (donation avant cession)</div>
        <h3 className={css.recoH3}>Donation-partage des titres puis cession par les enfants</h3>
        <p className={css.recoP}>Combine la purge de la plus-value par donation et l'optimisation des droits. Aperçu — à affiner à la prochaine itération.</p>
      </div>
      <div className={css.card}>
        <h2 className={css.cardH2}><span className={css.secNum}>★</span>Donation-partage avant cession : le meilleur des deux mondes</h2>
        <p className={css.sub}>Donner la nue-propriété des titres aux enfants AVANT la cession purge la plus-value à hauteur de la part donnée, tout en optimisant les droits de mutation.</p>
        <table className={css.dataTable}>
          <thead><tr><th>Effet</th><th style={{ textAlign: "right" }}>Estimation</th></tr></thead>
          <tbody>
            <tr>
              <td>Droits de donation {m.dutreilOK ? "(Dutreil + démembrement)" : "(démembrement)"}</td>
              <td className={css.tdNum}>{euro(m.droitsDonNP)}</td>
            </tr>
            <tr>
              <td>Plus-value purgée par la donation (part donnée)</td>
              <td className={css.tdNum}>{euro(m.pvPurgee)}</td>
            </tr>
            <tr className={css.trTotal}>
              <td>Principe</td>
              <td className={css.tdNum}>Donner puis céder</td>
            </tr>
          </tbody>
        </table>
        <div className={css.disclaimer}>
          <strong>Conditions impératives.</strong> La donation doit être <b>réelle, antérieure et non liée</b> à une cession déjà engagée (sinon abus de droit, art. L.64 LPF). La purge de la plus-value ne joue que sur la fraction effectivement donnée. Schéma à modéliser finement à la prochaine itération.
        </div>
      </div>
    </>
  );
}

// ─── Main compute function ────────────────────────────────────────────────────

function compute(
  age: number, enfants: number, regime: string, secteur: string,
  valeur: number, quotepart: number, prixrevient: number, autresrev: number,
  objectif: string, controle: string, preparation: string,
  segs: { dutreil: string; retraite: string; reinvest: string; repreneurs: string; conserver: string },
): AllResults {
  const couple = regime !== "celibataire";
  const Vtot = Math.max(0, valeur);
  const V = Vtot * Math.min(100, Math.max(0, quotepart)) / 100;
  const PR = Math.max(0, prixrevient);
  const autres = Math.max(0, autresrev);
  const { dutreil, retraite, reinvest, repreneurs } = segs;
  const enfantsN = Math.max(1, enfants);
  const secteurNonElig = secteur === "holding_passive" || secteur === "immobilier";
  const dutreilOK = dutreil === "oui" && !secteurNonElig;
  const nbDon = couple ? 2 : 1;

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
  const titresCommuns = regime === "communaute_legale" || regime === "communaute_universelle";
  const regimeNote = titresCommuns
    ? "Titres potentiellement <b>communs</b> : l'accord du conjoint est requis pour donner ou céder (art. 1424 C. civ.)."
    : (regime === "separation" || regime === "separation_societe" || regime === "participation")
      ? "Titres en principe <b>propres</b> au dirigeant : il en dispose seul."
      : regime === "etranger"
        ? "Régime <b>étranger</b> : vérifier la loi applicable (Règlement UE 2016/1103)."
        : "Pas de conjoint à protéger dans l'analyse patrimoniale.";
  const controleLabels: Record<string, string> = {
    total: "conservation totale du contrôle",
    majorite: "conserver la majorité",
    minoritaire: "position minoritaire",
    sortie: "sortie complète",
  };
  const controleNote = (controle === "total" || controle === "majorite")
    ? "Objectif de contrôle élevé → privilégier le <b>démembrement</b> et/ou une <b>holding</b> avec droits de vote renforcés."
    : "Contrôle réduit accepté → la <b>pleine propriété</b> ou une cession plus large est envisageable.";
  const prepLabels: Record<string, string> = {
    aucune: "aucune démarche", reflexion: "première réflexion", encours: "acte en cours",
  };
  const ctx: CtxItem[] = [
    { label: "Régime matrimonial", content: (regimeLabels[regime] ?? regime) + " — " + regimeNote },
    { label: "Part analysée", content: "Quote-part du dirigeant : <b>" + quotepart + "%</b> de " + euro(Vtot) + " = <b>" + euro(V) + "</b>" },
    { label: "Contrôle visé", content: (controleLabels[controle] ?? controle) + " — " + controleNote },
    { label: "Repreneurs", content: repreneurs === "oui" ? "Enfant(s) repreneur(s) identifié(s) : transmission familiale facilitée." : "Pas de repreneur familial identifié : étudier la cession ou un management package." },
    { label: "Éligibilité Dutreil", content: secteurNonElig ? "Secteur <b>non éligible</b> en l'état (holding passive / immobilier) : viser une holding <b>animatrice</b>." : "Secteur a priori <b>éligible</b> au Pacte Dutreil (activité opérationnelle)." },
    { label: "Préparation", content: "Niveau actuel : <b>" + (prepLabels[preparation] ?? preparation) + "</b>" + (preparation === "encours" ? " — sécuriser l'antériorité des actes (anti-abus de droit)." : "") },
  ];

  // ── Transmettre ──────────────────────────────────────────────────────────────
  const q = quotiteNP(age);
  const parEnfant = V / enfantsN;
  const ab = 100000 * nbDon;
  const dPP = droitsLigneDirecte(Math.max(0, parEnfant - ab)) * enfantsN;
  const dNP = droitsLigneDirecte(Math.max(0, parEnfant * q - ab)) * enfantsN;
  const dDutNP = droitsLigneDirecte(Math.max(0, parEnfant * 0.25 * q - ab)) * enfantsN;
  let dDutPP = droitsLigneDirecte(Math.max(0, parEnfant * 0.25 - ab)) * enfantsN;
  if (dutreilOK && age < 70) dDutPP *= 0.5;

  const tStrats: Strategy[] = [
    {
      name: "Donation pleine propriété", cost: dPP, gain: 0, gainPct: 0, delai: "1 mois", complex: 1, risque: 1, best: false,
      points: ["Transmission immédiate et simple", "Pas de réserve d'usufruit", "Coût fiscal le plus élevé"],
    },
    {
      name: `Donation démembrée (NP ${Math.round(q * 100)}%)`, cost: dNP, gain: 0, gainPct: 0, delai: "1-2 mois", complex: 2, risque: 1, best: false,
      points: ["Le dirigeant conserve l'usufruit (revenus + pouvoir)", `Assiette réduite à ${Math.round(q * 100)}% (art. 669)`, "Reconstitution exonérée au décès (art. 1133)"],
    },
    {
      name: dutreilOK ? "Pacte Dutreil + démembrement" : "Pacte Dutreil (non éligible ici)",
      cost: dutreilOK ? dDutNP : dPP, gain: 0, gainPct: 0, delai: "3-6 mois", complex: 3, risque: 2, best: false,
      points: dutreilOK
        ? ["Abattement 75% (art. 787 B) cumulé au démembrement", "Engagements collectif 2 ans + individuel 4 ans", "Solution la plus efficiente"]
        : ["Société non opérationnelle ou seuils non atteints", "Vérifier holding animatrice", "À fiabiliser avant tout engagement"],
    },
  ];
  const tBest = dutreilOK ? 2 : 1;
  tStrats[tBest].best = true;
  tStrats.forEach(s => { s.gain = Math.max(0, dPP - s.cost); s.gainPct = pct(s.gain, dPP); });
  const tRec = tStrats[tBest];

  const transmettre: TransResult = {
    recoTitle: tRec.name,
    recoSub: dutreilOK
      ? "Cumul de l'abattement Dutreil (75%), de la décote de nue-propriété et de l'abattement de 100 000 € par parent et par enfant."
      : "À défaut d'éligibilité Dutreil, la donation démembrée reste le levier le plus efficient.",
    kpiSans: dPP, kpiAvec: tRec.cost, kpiEco: dPP - tRec.cost, kpiEcoPct: pct(dPP - tRec.cost, dPP),
    pieBefore: [{ label: "Net transmis", value: Math.max(0, V - dPP), color: "#1E2761" }, { label: "Droits de donation", value: dPP, color: "#B23A48" }],
    pieAfter: [{ label: "Net transmis", value: Math.max(0, V - tRec.cost), color: "#1B7A52" }, { label: "Droits de donation", value: tRec.cost, color: "#C9A227" }],
    pieTotal: V,
    strategies: tStrats,
    hypothesis: `Barème ligne directe (art. 777), abattement 100 000 € par parent et par enfant /15 ans (art. 779), nue-propriété ${Math.round(q * 100)}% à ${age} ans (art. 669), Dutreil −75% (art. 787 B). Chiffrage sur ${enfantsN} enfant(s). Donations antérieures non prises en compte.`,
    plan: dutreilOK ? [
      "Signer l'<b>engagement collectif de conservation</b> (Dutreil, 2 ans) ou vérifier le « réputé acquis ».",
      "Réaliser une <b>donation-partage en nue-propriété</b> au profit des enfants, devant notaire.",
      "Faire prendre l'<b>engagement individuel</b> (4 ans) + fonction de direction par un bénéficiaire.",
      "Planifier les <b>abattements de 100 000 €</b> sur 15 ans (donations graduées).",
      "Valider l'ensemble avec le notaire et l'avocat fiscaliste.",
    ] : [
      "<b>Fiabiliser l'éligibilité Dutreil</b> (caractère opérationnel/animateur, seuils) ; restructurer si besoin.",
      "À défaut, privilégier la <b>donation-partage démembrée</b>.",
      "Échelonner les donations pour purger les abattements tous les 15 ans.",
      "Valider avec le notaire et l'avocat fiscaliste.",
    ],
  };

  // ── Ceder ────────────────────────────────────────────────────────────────────
  const PV = Math.max(0, V - PR);
  const irD = PV * 0.128, psD = PV * 0.172, rfrD = PV + autres;
  const ceD = cehrCalc(rfrD, couple);
  const cdD = cdhrCalc(rfrD, couple, irD + autres * 0.30 + ceD);
  const directDetail: CedDetail = { PV, ir: irD, ps: psD, ce: ceD, cd: cdD, rfr: rfrD, total: irD + psD + ceD + cdD };

  const irR = Math.max(0, PV - 500000) * 0.128, psR = PV * 0.172, rfrR = PV + autres;
  const ceR = cehrCalc(rfrR, couple);
  const cdR = cdhrCalc(rfrR, couple, irR + autres * 0.30 + ceR);
  const retraiteDetail: CedDetail = { PV, ir: irR, ps: psR, ce: ceR, cd: cdR, rfr: rfrR, total: irR + psR + ceR + cdR };

  const directTotal = directDetail.total;
  const cStrats: Strategy[] = [
    {
      name: "Cession directe (PFU)", cost: directTotal, gain: 0, gainPct: 0, delai: "Immédiat", complex: 1, risque: 1, best: false,
      points: ["PFU 30% (12,8% IR + 17,2% PS)", "+ CEHR et CDHR sur le RFR", "Liquidités immédiates, fiscalité maximale"],
    },
    {
      name: "Cession + abattement retraite", cost: retraite === "oui" ? retraiteDetail.total : directTotal, gain: 0, gainPct: 0, delai: "Immédiat", complex: 2, risque: 2, best: false,
      points: retraite === "oui"
        ? ["Abattement 500 000 € sur l'assiette IR (art. 150-0 D ter)", "PS, CEHR, CDHR dus sur le gain plein (réintégration art. 1417)", "Conditionné au départ en retraite sous 24 mois"]
        : ["Non éligible : pas de départ retraite sous 24 mois", "Abattement de 500 000 € non applicable", "Voir apport-cession"],
    },
    {
      name: "Apport-cession (report)", cost: reinvest === "oui" ? 0 : directTotal, gain: 0, gainPct: 0, delai: "2-3 mois (avant cession)", complex: 3, risque: 3, best: false,
      points: reinvest === "oui"
        ? ["Report d'imposition de la PV (art. 150-0 B ter)", "Réinvestir 60% du produit sous 24 mois", "Capitalisation à l'IS dans la holding"]
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
      ? "L'apport préalable à une holding reporte la plus-value ; le réinvestissement de 60% sous 24 mois pérennise le report et permet de capitaliser à l'IS."
      : cBest === 1
        ? "Le départ en retraite ouvre l'abattement de 500 000 € sur l'assiette IR ; attention, PS/CEHR/CDHR restent calculés sur le gain plein."
        : "En l'absence de réinvestissement et de départ retraite, la cession directe au PFU reste la voie par défaut.",
    kpiSans: directTotal, kpiAvec: cRec.cost, kpiEco: directTotal - cRec.cost, kpiEcoPct: pct(directTotal - cRec.cost, directTotal),
    pieBefore: [{ label: "Net dirigeant", value: Math.max(0, V - directTotal), color: "#1E2761" }, { label: "Imposition", value: directTotal, color: "#B23A48" }],
    pieAfter: [{ label: "Net / réinvesti", value: Math.max(0, V - cRec.cost), color: "#1B7A52" }, { label: "Imposition", value: cRec.cost, color: "#C9A227" }],
    pieTotal: V,
    strategies: cStrats,
    hypothesis: "PFU 30% (12,8% IR + 17,2% PS). CEHR marginale sur le RFR (3% puis 4%). CDHR = max(0 ; 20% du RFR − impôt de référence). L'abattement de 500 000 € (art. 150-0 D ter) réduit l'IR mais est réintégré au RFR (art. 1417). Lissage simplifié.",
    plan: cBest === 2 ? [
      "Constituer une <b>holding</b> et <b>apporter les titres</b> AVANT toute cession (art. 150-0 B ter).",
      "Faire céder les titres par la holding ; <b>réinvestir 60%</b> du produit sous 24 mois (activité éligible).",
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
  const droitsDonNP = droitsLigneDirecte(Math.max(0, (V / enfantsN) * (dutreilOK ? 0.25 : 1) * q - 100000 * nbDon)) * enfantsN;
  const mixte: MixteResult = { droitsDonNP, pvPurgee: Math.max(0, V - PR), dutreilOK };

  const tabMap: Record<string, string> = {
    transmission: "transmettre", cession: "ceder", liquidite: "ceder",
    protection: "transmettre", continuite: "transmettre", optimisation: "transmettre",
  };

  return { ctx, transmettre, ceder, mixte, suggestedTab: tabMap[objectif] ?? "transmettre" };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Simulator() {
  const [form, setForm] = useState({
    age: 58, enfants: 2,
    regime: "communaute_legale", formejur: "SAS", secteur: "commercial",
    valeur: 3000000, quotepart: 100, prixrevient: 200000, autresrev: 150000,
    objectif: "transmission", horizon: "court", controle: "total", preparation: "reflexion",
  });
  const [segs, setSegs] = useState({
    dutreil: "oui", retraite: "non", reinvest: "oui", repreneurs: "oui", conserver: "oui",
  });
  const [results, setResults] = useState<AllResults | null>(null);
  const [activeTab, setActiveTab] = useState("transmettre");

  function run() {
    const r = compute(
      form.age, form.enfants, form.regime, form.secteur,
      form.valeur, form.quotepart, form.prixrevient, form.autresrev,
      form.objectif, form.controle, form.preparation, segs,
    );
    setResults(r);
    setActiveTab(r.suggestedTab);
    setTimeout(() => document.getElementById("sim-results")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  const yn = [{ v: "oui", label: "Oui" }, { v: "non", label: "Non" }];
  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === "number" ? +e.target.value : e.target.value }));
  const setSeg = (k: keyof typeof segs) => (v: string) => setSegs(s => ({ ...s, [k]: v }));

  return (
    <div className={css.page}>
      <header className={css.header}>
        <div className={css.headerTop}>
          <div>
            <p className={css.kicker}>Cabinet de gestion de patrimoine · Outil d'aide à la décision · v2</p>
            <h1 className={css.h1}>Transmission &amp; cession du patrimoine professionnel du dirigeant</h1>
            <p className={css.headerP}>Une saisie unique, puis trois scénarios (Transmettre, Céder, Mixte). Intègre le barème des donations, le démembrement, le Pacte Dutreil, l'abattement dirigeant retraite, le PFU, la CEHR et la CDHR.</p>
          </div>
          <a href="/" className={css.btnReturn}>← Retour</a>
        </div>
      </header>

      <div className={css.wrap}>

        {/* ── Formulaire ── */}
        <div className={css.card}>
          <h2 className={css.cardH2}><span className={css.secNum}>1</span>Situation du dirigeant &amp; de l'entreprise</h2>
          <p className={css.sub}>Saisie commune aux trois scénarios. Montants en euros — hypothèses fiscales 2025 (ligne directe).</p>

          <h3 className={css.blockH3}>Profil du dirigeant</h3>
          <div className={css.grid}>
            <div>
              <label className={css.fieldLabel}>Âge du dirigeant <span className={css.hint}>(démembrement, retraite)</span></label>
              <input type="number" className={css.textInput} value={form.age} min={25} max={100} onChange={setF("age")} />
              <label className={css.fieldLabel}>Nombre d'enfants</label>
              <input type="number" className={css.textInput} value={form.enfants} min={0} max={12} onChange={setF("enfants")} />
            </div>
            <div>
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
              <label className={css.fieldLabel}>Enfants repreneurs identifiés ?</label>
              <Seg value={segs.repreneurs} onChange={setSeg("repreneurs")}
                options={[{ v: "oui", label: "Oui" }, { v: "non", label: "Non / pas encore" }]} />
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
              <label className={css.fieldLabel}>Valeur vénale de l'entreprise (100% des titres) €</label>
              <input type="number" className={css.textInput} value={form.valeur} min={0} step={10000} onChange={setF("valeur")} />
            </div>
            <div>
              <label className={css.fieldLabel}>Quote-part détenue par le dirigeant <span className={css.hint}>(%)</span></label>
              <input type="number" className={css.textInput} value={form.quotepart} min={0} max={100} step={1} onChange={setF("quotepart")} />
              <label className={css.fieldLabel}>Prix d'acquisition / valeur fiscale des titres €</label>
              <input type="number" className={css.textInput} value={form.prixrevient} min={0} step={10000} onChange={setF("prixrevient")} />
              <label className={css.fieldLabel}>Autres revenus annuels du foyer (hors cession) € <span className={css.hint}>(CEHR / CDHR)</span></label>
              <input type="number" className={css.textInput} value={form.autresrev} min={0} step={5000} onChange={setF("autresrev")} />
            </div>
          </div>

          <h3 className={css.blockH3}>Objectifs &amp; contraintes</h3>
          <div className={css.grid}>
            <div>
              <label className={css.fieldLabel}>Objectif principal</label>
              <select className={css.selectInput} value={form.objectif} onChange={setF("objectif")}>
                <option value="transmission">Transmission familiale</option>
                <option value="cession">Cession à un tiers</option>
                <option value="optimisation">Optimisation fiscale</option>
                <option value="continuite">Continuité — rester aux commandes 2 ans</option>
                <option value="protection">Protection du conjoint</option>
                <option value="liquidite">Liquidité immédiate</option>
              </select>
              <label className={css.fieldLabel}>Horizon de l'opération</label>
              <select className={css.selectInput} value={form.horizon} onChange={setF("horizon")}>
                <option value="immediat">Immédiat (&lt; 12 mois)</option>
                <option value="court">Court terme (1–3 ans)</option>
                <option value="moyen">Moyen terme (3–5 ans)</option>
                <option value="long">Long terme (&gt; 5 ans)</option>
              </select>
              <label className={css.fieldLabel}>Contrôle souhaité après l'opération</label>
              <select className={css.selectInput} value={form.controle} onChange={setF("controle")}>
                <option value="total">Conservation totale du contrôle</option>
                <option value="majorite">Conserver la majorité</option>
                <option value="minoritaire">Position minoritaire</option>
                <option value="sortie">Sortie complète</option>
              </select>
              <label className={css.fieldLabel}>Niveau de préparation actuel</label>
              <select className={css.selectInput} value={form.preparation} onChange={setF("preparation")}>
                <option value="aucune">Aucune démarche</option>
                <option value="reflexion">Première réflexion</option>
                <option value="encours">Acte en cours</option>
              </select>
            </div>
            <div>
              <label className={css.fieldLabel}>Société opérationnelle à l'IS &amp; seuils Dutreil atteignables ?</label>
              <Seg value={segs.dutreil} onChange={setSeg("dutreil")} options={yn} />
              <label className={css.fieldLabel}>Départ en retraite du dirigeant sous 24 mois ?</label>
              <Seg value={segs.retraite} onChange={setSeg("retraite")} options={yn} />
              <label className={css.fieldLabel}>Conserver revenus &amp; pouvoir pendant la transmission ?</label>
              <Seg value={segs.conserver} onChange={setSeg("conserver")} options={yn} />
              <label className={css.fieldLabel}>Volonté de réinvestir le produit de cession (activité éligible) ?</label>
              <Seg value={segs.reinvest} onChange={setSeg("reinvest")}
                options={[{ v: "oui", label: "Oui" }, { v: "non", label: "Non (liquidités)" }]} />
            </div>
          </div>

          <div className={css.cta}>
            <button className={css.btnPrimary} onClick={run}>Analyser les 3 scénarios →</button>
          </div>
        </div>

        {/* ── Résultats ── */}
        {results && (
          <div id="sim-results">
            <div className={css.card}>
              <h2 className={css.cardH2}><span className={css.secNum}>★</span>Contexte juridique &amp; patrimonial</h2>
              <div className={css.ctxGrid}>
                {results.ctx.map((item, i) => (
                  <div key={i} className={css.ctxItem}>
                    <div className={css.ctxH}>{item.label}</div>
                    <div>{boldify(item.content)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={css.tabs}>
              {(["transmettre", "ceder", "mixte"] as const).map((t, i) => (
                <button key={t}
                  className={`${css.tab} ${activeTab === t ? css.tabOn : ""}`}
                  onClick={() => setActiveTab(t)}>
                  {["① Transmettre aux enfants", "② Céder à un tiers", "③ Stratégie mixte"][i]}
                </button>
              ))}
            </div>

            <div className={`${css.tabpane} ${activeTab === "transmettre" ? css.tabpaneOn : ""}`}>
              <TabTransmettre t={results.transmettre} />
            </div>
            <div className={`${css.tabpane} ${activeTab === "ceder" ? css.tabpaneOn : ""}`}>
              <TabCeder c={results.ceder} />
            </div>
            <div className={`${css.tabpane} ${activeTab === "mixte" ? css.tabpaneOn : ""}`}>
              <TabMixte m={results.mixte} />
            </div>

            <p className={css.footerNote}>
              Prototype v2 — Cabinet CGP · Hypothèses fiscales 2025 (France, ligne directe) · CEHR/CDHR modélisées avec lissage simplifié
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
