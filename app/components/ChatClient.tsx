"use client";

import { useState } from "react";

// Fonction pour supprimer les marqueurs markdown ** et les convertir en styles
function parseMarkdown(text: string) {
  // Supprimer les **bold** et remplacer par du texte plus épais
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Icônes SVG style Apple
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <path d="M19 13l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z" />
    <path d="M6 17l.5 1.5L8 19l-1.5.5-.5 1.5-.5-1.5L4 19l1.5-.5.5-1.5z" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

export default function ChatClient() {
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!message.trim()) {
      setError("Veuillez saisir votre question.");
      return;
    }

    setLoading(true);
    setAnswer("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const contentType = response.headers.get("content-type") ?? "";
      let data: any;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(
          `Réponse inattendue du serveur : ${text.slice(0, 300)}`
        );
      }

      if (!response.ok) {
        throw new Error(data?.error || "Erreur lors de l'appel à l'API.");
      }

      setAnswer(data.answer ?? "Aucune réponse reçue.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur inattendue. Vérifiez la configuration du serveur."
      );
    } finally {
      setLoading(false);
    }
  }

  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      background: "#fff",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "#D9E0EE",
      borderRadius: "12px",
      padding: "20px 22px",
      boxShadow: "0 6px 24px rgba(18,24,63,.10)",
      marginBottom: "18px",
    },
    header: {
      marginBottom: "20px",
      paddingBottom: "16px",
      borderBottom: "1px solid #D9E0EE",
    },
    headerTitle: {
      margin: "0 0 4px",
      fontSize: "15px",
      fontWeight: 600,
      color: "#1E2761",
    },
    headerSubtitle: {
      margin: 0,
      fontSize: "13px",
      color: "#5A6478",
    },
    label: {
      display: "block",
      fontSize: "13px",
      fontWeight: 600,
      color: "#1E2761",
      marginBottom: "8px",
    } as React.CSSProperties,
    textarea: {
      width: "100%",
      padding: "10px 12px",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "#D9E0EE",
      borderRadius: "8px",
      fontSize: "14px",
      background: "#fff",
      color: "#1E2330",
      fontFamily: "inherit",
      resize: "vertical" as const,
      outline: "none",
      marginBottom: "16px",
    } as React.CSSProperties,
    buttonContainer: {
      display: "flex",
      gap: "12px",
      alignItems: "center",
    } as React.CSSProperties,
    button: {
      padding: "10px 20px",
      background: "#1E2761",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: 600,
      cursor: "pointer",
      transition: "background 0.2s",
    } as React.CSSProperties,
    buttonDisabled: {
      background: "#D9E0EE",
      cursor: "not-allowed",
      color: "#5A6478",
    } as React.CSSProperties,
    hint: {
      fontSize: "13px",
      color: "#5A6478",
      margin: 0,
    },
    errorBox: {
      background: "#FEE2E2",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "#FECACA",
      borderRadius: "8px",
      padding: "12px 14px",
      fontSize: "13px",
      color: "#991B1B",
      marginTop: "12px",
    },
    answerBox: {
      marginTop: "20px",
      padding: "24px",
      borderRadius: "12px",
      borderWidth: "1px",
      borderStyle: "solid",
      background: "#FAFAFA",
      borderColor: "#E5E7EB",
    } as React.CSSProperties,
    answerLoading: {
      color: "#6B7280",
      fontSize: "14px",
      fontStyle: "italic" as const,
    } as React.CSSProperties,
    answerContent: {
      background: "#FFFFFF",
      borderColor: "#E5E7EB",
      color: "#1F2937",
      fontSize: "16px",
      lineHeight: 1.8,
      fontWeight: 400,
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    } as React.CSSProperties,
    messageBubble: {
      background: "#F5F5F7",
      borderRadius: "16px",
      padding: "12px 16px",
      marginBottom: "16px",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      color: "#1F2937",
      fontSize: "15px",
    } as React.CSSProperties,
    answerBubble: {
      background: "#FFFFFF",
      borderRadius: "16px",
      padding: "16px 20px",
      border: "1px solid #E5E7EB",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
    } as React.CSSProperties,
    messageText: {
      flex: 1,
      fontSize: "15px",
      lineHeight: 1.6,
    } as React.CSSProperties,
    iconContainer: {
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    } as React.CSSProperties,
    answerEmpty: {
      background: "#FAFAFA",
      borderColor: "#E5E7EB",
      color: "#6B7280",
      fontStyle: "italic" as const,
      fontSize: "14px",
    } as React.CSSProperties,
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <p style={styles.headerTitle}>Assistant Patrimoine</p>
        <p style={styles.headerSubtitle}>
          Chat IA - Finance, transmission, succession et fiscalité
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <label style={styles.label} htmlFor="message">
 Question patrimoniale
        </label>
        <textarea
          id="message"
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          style={styles.textarea}
          placeholder="Ex : Comment réduire les droits de succession sur mon patrimoine ?"
        />

        <div style={styles.buttonContainer}>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.background = "#152550";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.background = "#1E2761";
              }
            }}
          >
            {loading ? "Analyse en cours..." : "Envoyer"}
          </button>

          <p style={styles.hint}>
            Réponse structurée et basée sur des sources officielles.
          </p>
        </div>

        {error ? (
          <p style={styles.errorBox}>
            {error}
          </p>
        ) : null}
      </form>

      {loading ? (
        <div style={{ ...styles.answerBubble }}>
          <div style={{ ...styles.iconContainer, background: "#F5F5F7", color: "#1F2937" }}>
            <SparklesIcon />
          </div>
          <div style={styles.messageText}>
            <span style={styles.answerLoading}>Réfléchissement en cours...</span>
          </div>
        </div>
      ) : answer ? (
        <div style={{ ...styles.answerBubble, marginTop: "20px" }}>
          <div style={{ ...styles.iconContainer, background: "#1F2937", color: "#FFFFFF" }}>
            <SparklesIcon />
          </div>
          <div style={{ ...styles.messageText, ...styles.answerContent }}>
            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{parseMarkdown(answer)}</div>
          </div>
        </div>
      ) : (
        <div style={{ ...styles.answerBox, ...styles.answerEmpty }}>
          Saisissez une question pour lancer l'analyse.
        </div>
      )}
    </div>
  );
}
