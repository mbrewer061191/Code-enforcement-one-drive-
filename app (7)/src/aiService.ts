import { GoogleGenAI, Type } from "@google/genai";
import { Case } from './types';
import { initialAddressState, initialViolationState, VIOLATIONS_LIST } from './constants';

let genAI: GoogleGenAI | null = null;

export const initAIService = () => {
    try {
        if (!process.env.API_KEY) {
          console.warn("Gemini API key not found. AI features will be disabled.");
          return;
        }
        genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } catch(e) {
        console.error("Failed to initialize AI Service. It's possible 'process.env.API_KEY' is not available.", e);
    }
};

// Call on module load
initAIService();

export const getAIService = () => genAI;

export const analyzePhotoWithAI = async (photoFile: File): Promise<Partial<Case>> => {
    if (!genAI) throw new Error("AI Service not initialized.");

    const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
    const base64Data = await toBase64(photoFile);
    const imagePart = { inlineData: { mimeType: photoFile.type, data: base64Data } };
    const textPart = { text: "Analyze this image for a code enforcement case. Identify the property address and the primary violation type from the VIOLATIONS_LIST. If the address is partially visible, provide the visible parts." };
    
    const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT, properties: {
                    address: { type: Type.OBJECT, properties: { street: { type: Type.STRING }}},
                    violationType: { type: Type.STRING, description: `One of: ${VIOLATIONS_LIST.map(v => v.type).join(', ')}`}
                }
            }
        }
    });

    const resultJson = JSON.parse(response.text);
    const matchedViolation = VIOLATIONS_LIST.find(v => v.type === resultJson.violationType) || initialViolationState;
    return {
        address: { ...initialAddressState, street: resultJson.address?.street || '' },
        violation: matchedViolation,
    };
};