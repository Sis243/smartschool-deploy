import { clignementDetecte } from './face-recognition';

// clignementDetecte() décide si une photo imprimée tenue devant la caméra
// doit être rejetée (jamais de clignement) ou si une vraie personne a
// confirmé sa présence (l'EAR — Eye Aspect Ratio — chute puis remonte). La
// fonction est pure (pas de face-api.js/DOM requis), donc testée directement
// sur des historiques de valeurs représentatifs plutôt que mockée.
describe('clignementDetecte (anti-usurpation du pointage facial)', () => {
  it('ne détecte rien sur un historique plat (photo fixe tenue devant la caméra)', () => {
    const historiquePhotoFixe = [0.32, 0.31, 0.33, 0.32, 0.31, 0.32, 0.33, 0.32];
    expect(clignementDetecte(historiquePhotoFixe)).toBe(false);
  });

  it('détecte un vrai clignement : l\'EAR descend sous le seuil fermé puis remonte', () => {
    const historiqueAvecClignement = [0.32, 0.31, 0.18, 0.15, 0.30, 0.33];
    expect(clignementDetecte(historiqueAvecClignement)).toBe(true);
  });

  it('ne détecte rien si les yeux restent fermés (ne remonte jamais)', () => {
    const yeuxFermes = [0.32, 0.20, 0.15, 0.10, 0.12, 0.14];
    expect(clignementDetecte(yeuxFermes)).toBe(false);
  });

  it('ne détecte rien sur un historique vide ou trop court', () => {
    expect(clignementDetecte([])).toBe(false);
    expect(clignementDetecte([0.3])).toBe(false);
  });

  it('reconnaît un clignement même si la chute et la remontée ne sont pas des échantillons consécutifs', () => {
    // L'échantillonnage (toutes les 200ms) peut rater l'instant exact où
    // l'œil est totalement fermé — il faut accepter une chute suivie, même
    // plusieurs échantillons plus tard, d'une remontée claire.
    const historiqueAvecBruit = [0.32, 0.30, 0.21, 0.24, 0.23, 0.29, 0.33];
    expect(clignementDetecte(historiqueAvecBruit)).toBe(true);
  });

  it('ne confond pas un simple bruit de mesure (petite baisse sans franchir le seuil fermé) avec un clignement', () => {
    const bruitLeger = [0.32, 0.29, 0.30, 0.28, 0.31, 0.32];
    expect(clignementDetecte(bruitLeger)).toBe(false);
  });
});
