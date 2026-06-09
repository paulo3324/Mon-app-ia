import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

type GeminiTextResponse = {
  text?: () => string | Promise<string>;
};

const MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GOOGLE_API_KEY non défini. Ajoute la clé dans .env.local et redémarre le serveur.",
        },
        { status: 500 }
      );
    }

    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message invalide." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const systemPrompt = `Tu es un conseiller en gestion de patrimoine qui conseille tes clients sur l'univers de la finance, transmission, succession et fiscalité du patrimoine personnel et professionnel. Tes réponses doivent être courtes et claires. Tu te baseras sur des sources officielles telles que impot.gouv et les articles du BOFIP, Code général des impôts.

Ne donne pas de conseil juridique définitif. Présente cela comme une aide à la décision.

Ajoute toujours à la fin :
"Cette réponse constitue une aide à la décision et ne remplace pas une consultation juridique, fiscale ou notariale personnalisée."`

    // Correction du bug: l'API rejette systemInstruction (schema attendu invalide sur ce modèle).
    // On injecte donc la consigne dans le message envoyé.
    const combinedPrompt = `${systemPrompt}\n\nQuestion: ${message}`;

    let lastError: unknown = null;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const chat = model.startChat({});
        const result = await chat.sendMessage(combinedPrompt);
        const response = result.response;
        const textResponse = response as GeminiTextResponse | undefined;

        let text: string;
        if (textResponse && typeof textResponse.text === "function") {
          text = await textResponse.text();
        } else if (typeof result === "string") {
          text = result;
        } else {
          text = JSON.stringify(result);
        }

        return NextResponse.json({ answer: text, model: modelName });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("Aucun modèle Gemini n'a répondu.");
  } catch (error) {
    console.error(error);

    const errorMessage =
      error instanceof Error ? error.message : "Erreur inconnue.";

    // Pour diagnostiquer le problème de modèle (404 modèles/... not found),
    // on retourne l'erreur brute.
    return NextResponse.json(
      {
        error: `Erreur API Google : ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
