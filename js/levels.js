/* ============================================================
   levels.js — Les 4 parcours du jeu
   ------------------------------------------------------------
   Un niveau est décrit comme une recette, morceau par morceau :
   "du sol, un trou, un pont, un ennemi ici, des carottes là…"
   La fonction construireNiveau() transforme la recette en
   vraies coordonnées pour le jeu.
   ============================================================ */

export const TUILE = 16;    // taille d'une tuile en pixels
export const SOL_Y = 224;   // hauteur du sol à l'écran
export const HAUTEUR_JEU = 270;

/* ---------- Les mots de la recette ---------- */

// Un bout de sol en herbe, long de n tuiles
const sol = (n) => ({ quoi: 'sol', n });
// Un trou : si Panpan tombe dedans, il perd une vie !
const trou = (n) => ({ quoi: 'trou', n });
// Un pont au-dessus du vide. matiere : 'bois' ou 'pierre'.
// fragile : true = le pont s'effrite quand on marche dessus !
const pont = (n, matiere = 'bois', fragile = false) => ({ quoi: 'pont', n, matiere, fragile });
// Une plateforme en l'air (dx = position depuis le début du
// dernier morceau, hauteur en pixels au-dessus du sol)
const plateforme = (dx, n, hauteur, fragile = false) => ({ quoi: 'plateforme', dx, n, hauteur, fragile });
// Une rangée de bonus (type : 'carotte', 'foin' ou 'salade')
const ligne = (type, dx, nb, ecart = 22, dy = 0) => ({ quoi: 'ligne', type, dx, nb, ecart, dy });
// Un ennemi qui patrouille (portee = jusqu'où il va-et-vient)
const ennemi = (type, dx, portee) => ({ quoi: 'ennemi', type, dx, portee });
// Le drapeau de mi-parcours (on y revient après une mort)
const checkpoint = (dx) => ({ quoi: 'checkpoint', dx });
// Le loup en fuite, tout au bout du parcours !
const loup = (dx) => ({ quoi: 'loup', dx });

/* ---------- La machine qui construit le niveau ---------- */

function construireNiveau(recette) {
  const niveau = {
    plateformes: [],
    bonus: [],
    ennemis: [],
    checkpointX: null,
    loupX: 0,
    longueur: 0,
  };
  let x = 0;      // où on en est dans le parcours
  let debut = 0;  // début du dernier morceau posé

  for (const c of recette) {
    switch (c.quoi) {
      case 'sol':
        niveau.plateformes.push({
          x, y: SOL_Y, w: c.n * TUILE, h: HAUTEUR_JEU - SOL_Y,
          tuile: 'herbe', fragile: false,
        });
        debut = x;
        x += c.n * TUILE;
        break;

      case 'trou':
        debut = x;
        x += c.n * TUILE;
        break;

      case 'pont': {
        const tuile = c.matiere === 'pierre' ? 'pontPierre' : 'pontBois';
        if (c.fragile) {
          // Chaque tuile du pont peut tomber séparément
          for (let i = 0; i < c.n; i++) {
            niveau.plateformes.push({
              x: x + i * TUILE, y: SOL_Y, w: TUILE, h: 8, tuile, fragile: true,
            });
          }
        } else {
          niveau.plateformes.push({ x, y: SOL_Y, w: c.n * TUILE, h: 8, tuile, fragile: false });
        }
        debut = x;
        x += c.n * TUILE;
        break;
      }

      case 'plateforme': {
        const px = debut + c.dx;
        const py = SOL_Y - c.hauteur;
        if (c.fragile) {
          for (let i = 0; i < c.n; i++) {
            niveau.plateformes.push({
              x: px + i * TUILE, y: py, w: TUILE, h: 8, tuile: 'pontBois', fragile: true,
            });
          }
        } else {
          niveau.plateformes.push({ x: px, y: py, w: c.n * TUILE, h: 8, tuile: 'pontBois', fragile: false });
        }
        break;
      }

      case 'ligne':
        for (let i = 0; i < c.nb; i++) {
          niveau.bonus.push({
            type: c.type,
            x: debut + c.dx + i * c.ecart,
            y: SOL_Y - 24 - c.dy,
          });
        }
        break;

      case 'ennemi':
        niveau.ennemis.push({
          type: c.type,
          x: debut + c.dx,
          xMin: debut + c.dx - c.portee,
          xMax: debut + c.dx + c.portee,
        });
        break;

      case 'checkpoint':
        niveau.checkpointX = debut + c.dx;
        break;

      case 'loup':
        niveau.loupX = debut + c.dx;
        break;
    }
  }
  niveau.longueur = x;
  return niveau;
}

/* ============================================================
   NIVEAU 1 — court et facile : on apprend à courir et sauter.
   Pas de chemin qui casse, des ennemis lents.
   ============================================================ */
const NIVEAU_1 = [
  sol(16),
  ligne('carotte', 130, 4),
  sol(12),
  ennemi('chien', 100, 55),
  ligne('carotte', 40, 3),
  trou(2),
  sol(12),
  plateforme(56, 3, 40),
  ligne('salade', 60, 2, 24, 48),
  ennemi('chien', 150, 40),
  pont(4, 'pierre'),
  ligne('foin', 6, 3, 20),
  sol(12),
  ennemi('renard', 110, 65),
  ligne('carotte', 30, 3),
  trou(2),
  sol(10),
  ligne('carotte', 30, 4),
  plateforme(90, 3, 40),
  ligne('foin', 94, 2, 24, 48),
  sol(14),
  ennemi('chien', 90, 60),
  ligne('salade', 170, 2),
  sol(10),
  loup(90),
];

/* ============================================================
   NIVEAU 2 — on découvre les ponts en bois… qui cassent !
   ============================================================ */
const NIVEAU_2 = [
  sol(14),
  ligne('carotte', 120, 4),
  sol(10),
  ennemi('renard', 80, 55),
  trou(3),
  sol(10),
  ligne('foin', 40, 3),
  ennemi('chien', 110, 45),
  pont(4, 'bois'),
  ligne('carotte', 8, 3, 20),
  sol(8),
  plateforme(40, 3, 40),
  ligne('salade', 44, 2, 24, 48),
  trou(3),
  sol(12),
  ennemi('belette', 100, 60),
  ligne('carotte', 30, 4),
  pont(5, 'bois', true), // ← premier pont fragile : cours vite !
  ligne('carotte', 10, 3, 24),
  sol(10),
  ennemi('chien', 80, 50),
  trou(2),
  sol(10),
  plateforme(50, 2, 40),
  plateforme(110, 2, 80),
  ligne('foin', 112, 2, 22, 88),
  ennemi('renard', 60, 40),
  sol(14),
  ligne('carotte', 60, 5),
  ennemi('chien', 160, 50),
  sol(10),
  loup(90),
];

/* ============================================================
   NIVEAU 3 — plus long, avec un checkpoint à mi-parcours,
   des belettes rapides et des ponts fragiles plus longs.
   ============================================================ */
const NIVEAU_3 = [
  sol(14),
  ligne('carotte', 110, 4),
  sol(10),
  ennemi('renard', 90, 60),
  trou(3),
  sol(8),
  ligne('foin', 30, 3),
  pont(6, 'bois', true),
  ligne('carotte', 12, 4, 22),
  sol(10),
  ennemi('belette', 80, 60),
  plateforme(50, 3, 40),
  ligne('salade', 54, 2, 24, 48),
  trou(4),
  sol(10),
  ennemi('chien', 70, 45),
  ligne('carotte', 30, 4),
  sol(8),
  checkpoint(60), // ← à partir d'ici, on repart du drapeau
  ligne('salade', 90, 2),
  sol(10),
  ennemi('renard', 90, 55),
  pont(8, 'bois', true), // long pont fragile !
  ligne('carotte', 16, 5, 24),
  sol(8),
  ennemi('belette', 70, 50),
  trou(3),
  plateforme(0, 2, 40),  // des plateformes pour traverser en sautant
  sol(8),
  plateforme(30, 2, 40),
  ligne('foin', 32, 2, 22, 48),
  trou(3),
  sol(12),
  ennemi('renard', 100, 60),
  ennemi('chien', 160, 40),
  ligne('carotte', 60, 4),
  sol(10),
  loup(90),
];

/* ============================================================
   NIVEAU 4 — le grand final : rapide, tendu, plein de ponts
   qui s'écroulent et d'ennemis véloces !
   ============================================================ */
const NIVEAU_4 = [
  sol(12),
  ligne('carotte', 100, 4),
  sol(8),
  ennemi('belette', 70, 55),
  trou(3),
  sol(8),
  ennemi('renard', 70, 50),
  pont(8, 'bois', true),
  ligne('carotte', 16, 5, 22),
  sol(8),
  ligne('foin', 30, 3),
  trou(4),
  sol(8),
  ennemi('belette', 60, 45),
  plateforme(40, 3, 40),
  ligne('salade', 44, 2, 24, 48),
  pont(10, 'bois', true), // très long pont fragile !
  ligne('carotte', 20, 6, 24),
  sol(10),
  ennemi('renard', 80, 60),
  checkpoint(120),
  sol(8),
  ennemi('chien', 60, 45),
  trou(4),
  plateforme(0, 2, 40),
  plateforme(48, 2, 80),
  ligne('carotte', 50, 2, 22, 88),
  sol(8),
  ennemi('belette', 60, 50),
  pont(6, 'bois', true),
  sol(6),
  ennemi('renard', 50, 40),
  trou(3),
  sol(8),
  ligne('foin', 30, 3),
  pont(12, 'bois', true), // le pont de tous les dangers !
  ligne('carotte', 24, 7, 24),
  sol(10),
  ennemi('belette', 70, 55),
  ennemi('renard', 120, 40),
  ligne('salade', 40, 3),
  sol(10),
  loup(90),
];

// Les 4 niveaux, prêts à jouer (l'indice 0 = niveau 1, etc.)
export const NIVEAUX = [
  construireNiveau(NIVEAU_1),
  construireNiveau(NIVEAU_2),
  construireNiveau(NIVEAU_3),
  construireNiveau(NIVEAU_4),
];
