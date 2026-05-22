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
      justifyContent: "space-between",
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
  };

  return (
    <main style={styles.container}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <p style={styles.logo}>PatriPro, l'outil préféré de Mr TUNICA</p>
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
            Lancer le simulateur
          </a>
        </div>
      </header>

      {/* HERO & CONTENT */}
      <div style={styles.wrap}>
        <div style={styles.hero}>
          <h1 style={styles.title}>Transmission du patrimoine professionnel</h1>
          <p style={styles.subtitle}>
            Analysez les meilleures stratégies avec l'assistant IA spécialisé en droit fiscal et patrimonial.
          </p>
        </div>

        {/* CHATBOX */}
        <ChatClient />
      </div>
    </main>
  );
}
