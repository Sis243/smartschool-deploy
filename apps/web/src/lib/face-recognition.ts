import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';
let modelsLoadedPromise: Promise<void> | null = null;

// Charge les modèles une seule fois (partagés par la page d'enrôlement et la
// page de pointage). Tourne entièrement dans le navigateur — aucune donnée
// biométrique ne transite par le serveur, seule l'empreinte (128 nombres)
// calculée localement est envoyée à l'API.
export function chargerModeles(): Promise<void> {
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return modelsLoadedPromise;
}

const OPTIONS = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

// Détecte un visage sur une image/vidéo et renvoie son empreinte (descripteur
// 128 dimensions). Retourne null si aucun visage net n'est détecté.
export async function extraireEmpreinte(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): Promise<Float32Array | null> {
  const resultat = await faceapi
    .detectSingleFace(input, OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return resultat?.descriptor ?? null;
}

// Distance euclidienne entre deux empreintes — face-api.js recommande un
// seuil ~0.6 : en dessous, on considère qu'il s'agit de la même personne.
export const SEUIL_CORRESPONDANCE = 0.55;

export function distance(a: Float32Array | number[], b: Float32Array | number[]): number {
  return faceapi.euclideanDistance(a as any, b as any);
}

export interface EleveAvecVisage {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  photoUrl: string | null;
  faceDescriptor: number[];
}

// Trouve le meilleur élève correspondant à une empreinte captée par la
// caméra, en dessous du seuil de correspondance. Renvoie null si personne
// ne correspond d'assez près (évite les faux positifs entre élèves).
export function trouverCorrespondance(
  empreinte: Float32Array,
  eleves: EleveAvecVisage[],
): { eleve: EleveAvecVisage; distance: number } | null {
  let meilleur: { eleve: EleveAvecVisage; distance: number } | null = null;
  for (const eleve of eleves) {
    if (!eleve.faceDescriptor || eleve.faceDescriptor.length !== 128) continue;
    const d = distance(empreinte, eleve.faceDescriptor);
    if (d < SEUIL_CORRESPONDANCE && (!meilleur || d < meilleur.distance)) {
      meilleur = { eleve, distance: d };
    }
  }
  return meilleur;
}
