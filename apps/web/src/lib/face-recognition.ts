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

// ── Anti-usurpation (détection de clignement) ───────────────────────────────
// face-api.js compare uniquement des traits géométriques du visage : une
// photo imprimée ou affichée à l'écran produit la même empreinte qu'une
// vraie personne et serait acceptée. On exige en plus un clignement des
// yeux détecté sur plusieurs images consécutives avant de valider un
// pointage — une photo fixe ne peut pas cligner des yeux. Ce n'est pas une
// preuve de vivacité infaillible (une vidéo d'une personne qui cligne
// passerait), mais ça bloque le cas simple et fréquent d'une photo tenue
// devant la caméra, pour un coût de calcul nul (les repères du visage sont
// déjà calculés pour la reconnaissance elle-même).
const EAR_SEUIL_FERME = 0.22;
const EAR_SEUIL_OUVERT = 0.27;

function distanceEuclidienne2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Eye Aspect Ratio (Soukupová & Čech, 2016) : chute nettement pendant un
// clignement puis remonte — le rapport hauteur/largeur de l'œil sur les 6
// points de repère que fournit face-api.js pour chaque œil.
function calculerEAR(oeil: { x: number; y: number }[]): number {
  const vertical1 = distanceEuclidienne2D(oeil[1], oeil[5]);
  const vertical2 = distanceEuclidienne2D(oeil[2], oeil[4]);
  const horizontal = distanceEuclidienne2D(oeil[0], oeil[3]);
  return (vertical1 + vertical2) / (2 * horizontal);
}

// Appelé à haute fréquence (quelques images par seconde) pendant qu'un
// candidat est identifié — volontairement plus léger que extraireEmpreinte
// (pas de calcul du descripteur 128 dimensions, juste les repères du visage).
export async function mesurerOuvertureYeux(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): Promise<number | null> {
  const resultat = await faceapi.detectSingleFace(input, OPTIONS).withFaceLandmarks();
  if (!resultat) return null;
  const gauche = calculerEAR(resultat.landmarks.getLeftEye());
  const droite = calculerEAR(resultat.landmarks.getRightEye());
  return (gauche + droite) / 2;
}

// Un clignement = l'EAR descend sous le seuil "fermé" puis remonte au-dessus
// du seuil "ouvert" plus tard dans l'historique — pas besoin que ce soit sur
// deux mesures consécutives (l'échantillonnage peut rater l'instant exact).
export function clignementDetecte(historiqueEAR: number[]): boolean {
  const indexFerme = historiqueEAR.findIndex((v) => v < EAR_SEUIL_FERME);
  if (indexFerme === -1) return false;
  return historiqueEAR.slice(indexFerme + 1).some((v) => v > EAR_SEUIL_OUVERT);
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
