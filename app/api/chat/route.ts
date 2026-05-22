import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    // IMPORTANT: dans cette version du SDK (@google/generative-ai ^0.24.1),
    // la fonction ListModels n'est pas exposée directement.
    // Pour éviter de tourner en 404, on utilise un modèle connu pour être souvent supporté.
    // Le modèle attendu pour le projet est "gemini-2.5-flash".
    // Si votre compte ne l'a pas, remplacez par le modèle disponible depuis Google AI Studio.
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `Tu es un conseiller en gestion de patrimoine qui conseille tes clients sur l'univers de la finance, transmission, succession et fiscalité du patrimoine personnel et professionnel. Tes réponses doivent être courtes et claires. Tu te baseras sur des sources officielles telles que impot.gouv et les articles du BOFIP, Code général des impôts.

Ne donne pas de conseil juridique définitif. Présente cela comme une aide à la décision.

Ajoute toujours à la fin :
"Cette réponse constitue une aide à la décision et ne remplace pas une consultation juridique, fiscale ou notariale personnalisée."`

    // Correction du bug: l'API rejette systemInstruction (schema attendu invalide sur ce modèle).
    // On injecte donc la consigne dans le message envoyé.
    const combinedPrompt = `${systemPrompt}\n\nQuestion: ${message}`;

    const chat = model.startChat({});
    const result = await chat.sendMessage(combinedPrompt);
    const response = result.response;

    // Récupère le texte de la réponse de façon robuste (await si nécessaire)
    let text: string;
    try {
      if (response && typeof (response as any).text === "function") {
        text = await (response as any).text();
      } else if (typeof result === "string") {
        text = result;
      } else {
        text = JSON.stringify(result);
      }
    } catch (err) {
      text = String(err instanceof Error ? err.message : err);
    }

    return NextResponse.json({ answer: text });
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