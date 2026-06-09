"use client";

import ChatClient from "./components/ChatClient";

export default function HomePage() {
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      fontFamily: '"Segoe UI", Calibri, system-ui, Arial, sans-serif',
      color: "#1E2330",
      backgroundColor: "#F4F6FB",
      lineHeight: 1.45,
      margin: 0,
      minHeight: "100vh",
    },
    header: {
      background: "linear-gradient(135deg, #1E2761, #12183F)",
      color: "#fff",
      padding: "24px 32px",
    },
    headerContent: {
      maxWidth: "1080px",
      margin: "0 auto",
      display: "flex",
      justifyContent: "flex-start",
      alignItems: "center",
    } as React.CSSProperties,
    logo: {
      fontSize: "18px",
      fontWeight: 700,
      margin: 0,
    },
    simulatorBtn: {
      padding: "10px 20px",
      background: "#C9A227",
      color: "#1E2761",
      border: "none",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: 600,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-block",
      transition: "background 0.2s",
    } as React.CSSProperties,
    wrap: {
      maxWidth: "1080px",
      margin: "0 auto",
      padding: "40px 20px 64px",
    },
    hero: {
      textAlign: "center" as const,
      marginBottom: "40px",
    },
    title: {
      margin: "0 0 12px",
      fontFamily: "Georgia, serif",
      fontSize: "28px",
      fontWeight: 700,
      color: "#1E2761",
    },
    subtitle: {
      margin: "0 0 20px",
      color: "#5A6478",
      fontSize: "16px",
      maxWidth: "800px",
      marginLeft: "auto",
      marginRight: "auto",
    },
    simulatorsSection: {
      background: "#FFFFFF",
      border: "1px solid #E1E6F0",
      borderRadius: "8px",
      padding: "24px",
      marginBottom: "28px",
      boxShadow: "0 10px 28px rgba(30, 39, 97, 0.08)",
    },
    simulatorsTitle: {
      margin: "0 0 16px",
      fontFamily: "Georgia, serif",
      fontSize: "22px",
      fontWeight: 700,
      color: "#1E2761",
    },
    simulatorsIntro: {
      margin: "0 0 18px",
      color: "#5A6478",
      fontSize: "15px",
    },
    simulatorsActions: {
      display: "flex",
      flexWrap: "wrap",
      gap: "12px",
      alignItems: "center",
    } as React.CSSProperties,
  };

  return (
    <main style={styles.container}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <p style={styles.logo}>PatriPro, l&apos;outil préféré de Mr TUNICA</p>
        </div>
      </header>

      {/* HERO & CONTENT */}
      <div style={styles.wrap}>
        <div style={styles.hero}>
          <h1 style={styles.title}>Transmission du patrimoine professionnel</h1>
          <p style={styles.subtitle}>
            Analysez les meilleures stratégies avec l&apos;assistant IA spécialisé en droit fiscal et patrimonial.
          </p>
        </div>

        <section style={styles.simulatorsSection} aria-labelledby="simulators-title">
          <h2 id="simulators-title" style={styles.simulatorsTitle}>Nos simulateurs patrimoniales</h2>
          <p style={styles.simulatorsIntro}>
            Accédez aux outils de calcul et d&apos;aide à la décision patrimoniale.
          </p>
          <div style={styles.simulatorsActions}>
            <a
              href="/simulateur"
              style={styles.simulatorBtn}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#B8931F";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#C9A227";
              }}
            >
              Simulateur Fiscalité Professionnelle
            </a>
            <a
              href="/simulateur-investissement-immobilier"
              style={styles.simulatorBtn}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#B8931F";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#C9A227";
              }}
            >
              Simulateur Investissement Immobilier
            </a>
          </div>
        </section>

        {/* CHATBOX */}
        <ChatClient />
      </div>
    </main>
  );
}
