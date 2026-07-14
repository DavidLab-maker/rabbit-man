/* ============================================================
   sprites.js — Tous les dessins du jeu en pixel art !
   ------------------------------------------------------------
   Chaque dessin est écrit avec des lettres, comme une grille de
   pixels : chaque lettre est une couleur, le point "." est
   transparent. On transforme ensuite ces grilles en petites
   images (canvas) une seule fois au démarrage.
   ============================================================ */

// ---------- La palette : les 16 couleurs du jeu ----------
export const PALETTE = {
  'W': '#ffffff', // blanc (fourrure de Panpan)
  'w': '#c9c9d6', // gris très clair (ombres, pattes)
  'B': '#2b5bd7', // bleu (uniforme de policier)
  'b': '#16327d', // bleu foncé (casquette, pantalon)
  'Y': '#ffd530', // jaune (badge, étoiles, foin)
  'K': '#1a1a24', // noir (yeux, rayures de prisonnier)
  'P': '#ff9eb4', // rose (nez, intérieur des oreilles)
  'G': '#2e8b31', // vert foncé (herbe)
  'g': '#7bc850', // vert clair (herbe, salade)
  'O': '#e8802a', // orange (carottes, renard)
  'o': '#a34d12', // orange foncé
  'T': '#8b5a2b', // brun (bois, chien)
  't': '#5a3a1a', // brun foncé
  'E': '#8c8c99', // gris (pierre, loup)
  'e': '#4f4f5c', // gris foncé
  'R': '#e03131', // rouge (cœurs, alarme)
};

// Transforme une grille de lettres en petite image (canvas)
export function creerSprite(lignes) {
  const hauteur = lignes.length;
  const largeur = Math.max(...lignes.map(l => l.length));
  const canvas = document.createElement('canvas');
  canvas.width = largeur;
  canvas.height = hauteur;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < lignes[y].length; x++) {
      const couleur = PALETTE[lignes[y][x]];
      if (couleur) { // "." et les lettres inconnues restent transparents
        ctx.fillStyle = couleur;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return canvas;
}

// Fabrique la version "miroir" d'un sprite (pour regarder à gauche)
export function retourner(sprite) {
  const canvas = document.createElement('canvas');
  canvas.width = sprite.width;
  canvas.height = sprite.height;
  const ctx = canvas.getContext('2d');
  ctx.translate(sprite.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(sprite, 0, 0);
  return canvas;
}

/* ============================================================
   PANPAN — on l'assemble comme un Lego :
   oreilles + casquette + tête + corps + jambes = 16 x 24 pixels
   ============================================================ */

// Les oreilles droites (position normale)
const OREILLES_1 = [
  '....W......W....',
  '...WPW....WPW...',
  '...WPW....WPW...',
  '...WPW....WPW...',
  '...WW......WW...',
];
// Les oreilles qui bougent (pour la course)
const OREILLES_2 = [
  '................',
  '...WW.....WW....',
  '...WPW...WPW....',
  '...WPW....WPW...',
  '...WW......WW...',
];

// La casquette bleue de policier
const CASQUETTE = [
  '..bbbbbbbbbbbb..',
  '.bbbbbbbbbbbbbb.',
];

// La tête (yeux ouverts)
const TETE = [
  '..WWWWWWWWWWWW..',
  '..WWKWWWWWWKWW..',
  '..WWKWWWWWWKWW..',
  '..WWWWWPPWWWWW..',
  '...WWWWwwWWWW...',
  '....WWWWWWWW....',
];
// La tête (yeux fermés, pour la mort)
const TETE_KO = [
  '..WWWWWWWWWWWW..',
  '..WWWWWWWWWWWW..',
  '..WKKWWWWWWKKW..',
  '..WWWWWPPWWWWW..',
  '...WWWWKKWWWW...',
  '....WWWWWWWW....',
];

// Le corps : uniforme bleu, badge jaune, matraque brune
const CORPS_IDLE = [
  '..BBBBBBBBBB....',
  '.BBYBBBBBBBB.T..',
  '.BBBBBBBBBBB.T..',
  '.WBBBBBBBBBWWT..',
  '..BBBBBBBBBB.T..',
  '..bbbbbbbbbb....',
];
// Le corps qui frappe : la matraque part en avant !
const CORPS_FRAPPE = [
  '..BBBBBBBBBB....',
  '.BBYBBBBBBBB....',
  '.BBBBBBBBBWWTTT.',
  '.WBBBBBBBBBB....',
  '..BBBBBBBBBB....',
  '..bbbbbbbbbb....',
];
// Le corps qui arme le coup : la matraque est levée
const CORPS_ARME = [
  '..BBBBBBBBBB.T..',
  '.BBYBBBBBBBB.T..',
  '.BBBBBBBBBBWWT..',
  '.WBBBBBBBBBB....',
  '..BBBBBBBBBB....',
  '..bbbbbbbbbb....',
];

// Les jambes : plusieurs poses pour l'animation
const JAMBES_DEBOUT = [
  '..bbb...bbb.....',
  '..bbb...bbb.....',
  '..bbb...bbb.....',
  '..bbb...bbb.....',
  '.wwww...wwww....',
];
const JAMBES_COURSE_1 = [ // jambes écartées
  '..bbb....bbb....',
  '.bbb......bbb...',
  '.bbb.......bbb..',
  'bbb.........bbb.',
  'www.........www.',
];
const JAMBES_COURSE_2 = [ // jambes qui se croisent
  '...bbb..bbb.....',
  '...bbb..bbb.....',
  '....bbbbbb......',
  '....bbbbb.......',
  '....wwwww.......',
];
const JAMBES_COURSE_3 = [ // jambes écartées (l'autre sens)
  '...bbb...bbb....',
  '..bbb.....bbb...',
  '..bbb.....bbb...',
  '.bbb.......bbb..',
  '.www.......www..',
];
const JAMBES_SAUT = [ // jambes repliées sous le corps
  '..bbb...bbb.....',
  '...bbb.bbb......',
  '....bbbbb.......',
  '....wwwww.......',
  '................',
];

// Assemble un Panpan complet à partir des morceaux
function panpan(oreilles, tete, corps, jambes) {
  return creerSprite([...oreilles, ...CASQUETTE, ...tete, ...corps, ...jambes]);
}

// La petite tête de Panpan pour compter les vies dans le HUD
const TETE_HUD = [
  '.W....W.',
  '.W....W.',
  'bbbbbbbb',
  'WWWWWWWW',
  'WKWWWWKW',
  'WWWPPWWW',
  '.WWWWWW.',
  '..WWWW..',
];

/* ============================================================
   LE LOUP — prisonnier en tenue rayée noir et blanc (16 x 22)
   ============================================================ */

const LOUP_TETE = [
  '..EE........EE..',
  '..EEE......EEE..',
  '..EEEEEEEEEEEE..',
  '..EEKEEEEEEKEE..',
  '..EEEEEEEEEEEE..',
  '...EEEEeeEEEE...',
  '....EEEKKEEE....',
  '.....EEEEEE.....',
];
const LOUP_CORPS = [ // rayures de prisonnier
  '..WWWWWWWWWW....',
  '.EKKKKKKKKKKE...',
  '.EWWWWWWWWWWE...',
  '.EKKKKKKKKKKE...',
  '.EWWWWWWWWWWE...',
  '..KKKKKKKKKK....',
];
const LOUP_JAMBES_1 = [
  '..WWW...WWW.....',
  '..KKK...KKK.....',
  '..WWW...WWW.....',
  '..eee...eee.....',
];
const LOUP_JAMBES_2 = [ // pour l'animation de course
  '.WWW.....WWW....',
  '.KKK.....KKK....',
  'WWW.......WWW...',
  'eee.......eee...',
];
// Le loup menotté : les pattes attachées devant lui
const LOUP_MENOTTE = [
  '..WWWWWWWWWW....',
  '.EKKKKKKKKKKE...',
  '.EWWWWWWWWWWE...',
  '..KKKKwwKKKK....',
  '..WWWWwwWWWW....',
  '..KKKKKKKKKK....',
];

/* ============================================================
   LES ENNEMIS — renard, chien, belette (2 poses de marche)
   ============================================================ */

// Le renard : roux, rapide, queue en panache
const RENARD_1 = [
  '..........O...O...',
  'OO........OO.OO...',
  'OWO......OOOOOOO..',
  '.OOO....OOOKOOKO..',
  '..OOOOOOOOOOOOOOK.',
  '..OOOOOOOOOOOWWW..',
  '...OOOOOOOOOO.....',
  '...O..O...O..O....',
  '...o..o...o..o....',
];
const RENARD_2 = [
  '..........O...O...',
  'OO........OO.OO...',
  'OWO......OOOOOOO..',
  '.OOO....OOOKOOKO..',
  '..OOOOOOOOOOOOOOK.',
  '..OOOOOOOOOOOWWW..',
  '...OOOOOOOOOO.....',
  '....O..O.O..O.....',
  '...o..o...o..o....',
];

// Le chien : marron, plus lent, oreilles tombantes
const CHIEN_1 = [
  '..........TT.TT...',
  '..........TTTTT...',
  'T.........TTTTTT..',
  'TT.......TTKTTKT..',
  '.TTTTTTTTTTTTTTTK.',
  '.TTTTTTTTTTTTttt..',
  '..TTTTTTTTTTT.....',
  '..T..T....T..T....',
  '..t..t....t..t....',
];
const CHIEN_2 = [
  '..........TT.TT...',
  '..........TTTTT...',
  'T.........TTTTTT..',
  'TT.......TTKTTKT..',
  '.TTTTTTTTTTTTTTTK.',
  '.TTTTTTTTTTTTttt..',
  '..TTTTTTTTTTT.....',
  '...T..T..T..T.....',
  '..t..t....t..t....',
];

// La belette : beige, petite et très rapide
const BELETTE_1 = [
  '...........ww.....',
  'w.........wwww....',
  'ww.......wwKwwK...',
  '.wwwwwwwwwwwwwwww.',
  '..wwwwwwwwwwWWW...',
  '..w..w....w..w....',
];
const BELETTE_2 = [
  '...........ww.....',
  'w.........wwww....',
  'ww.......wwKwwK...',
  '.wwwwwwwwwwwwwwww.',
  '..wwwwwwwwwwWWW...',
  '...w.w...w..w.....',
];

// L'étoile jaune qui tourne au-dessus d'un ennemi assommé
const ETOILE = [
  '..Y..',
  '.YYY.',
  'YYYYY',
  '.YYY.',
  '..Y..',
];

/* ============================================================
   LES BONUS — carotte, foin, salade + le cœur des vies
   ============================================================ */

const CAROTTE = [
  '..gg.g.',
  '.g.gg..',
  '..OOO..',
  '..OOO..',
  '.oOOO..',
  '..OOo..',
  '..OO...',
  '..Oo...',
  '...O...',
];
const FOIN = [
  '.YYYYYYYY.',
  'YYoYYYYoYY',
  'YYYYoYYYYY',
  'YoYYYYYoYY',
  'YYYYoYYYYY',
  '.YYYYYYYY.',
];
const SALADE = [
  '..gGGg...',
  '.gGgGGg..',
  'gGGgGgGg.',
  'gGgGGgGg.',
  '.gGgGGg..',
  '..gggg...',
];
const COEUR = [
  '.RR.RR.',
  'RRRRRRR',
  'RRRRRRR',
  '.RRRRR.',
  '..RRR..',
  '...R...',
];

/* ============================================================
   LE DÉCOR — tuiles de 16 x 16 (sol, pierre, ponts…)
   ============================================================ */

const TUILE_HERBE = [
  'gggGgggggGgggggg',
  'GgGGgGgGGgGgGgGg',
  'GGGGGGGGGGGGGGGG',
  'TTtTTTTtTTTTtTTT',
  'TTTTTTTTTTTTTTTT',
  'TTTtTTTTTTtTTTTT',
  'TTTTTTtTTTTTTTtT',
  'TtTTTTTTTtTTTTTT',
  'TTTTTtTTTTTTtTTT',
  'TTTTTTTTTTTTTTTT',
  'TTtTTTTTtTTTTTTt',
  'TTTTTTTTTTTTTTTT',
  'TTTTtTTTTTTtTTTT',
  'TtTTTTTtTTTTTTTT',
  'TTTTTTTTTTTTTtTT',
  'TTTTTTTTTTTTTTTT',
];
const TUILE_PIERRE = [
  'EEEEEEEeEEEEEEEe',
  'EEEEEEEeEEEEEEEe',
  'EEEEEEEeEEEEEEEe',
  'eeeeeeeeeeeeeeee',
  'EEEeEEEEEEEeEEEE',
  'EEEeEEEEEEEeEEEE',
  'EEEeEEEEEEEeEEEE',
  'eeeeeeeeeeeeeeee',
  'EEEEEEEeEEEEEEEe',
  'EEEEEEEeEEEEEEEe',
  'EEEEEEEeEEEEEEEe',
  'eeeeeeeeeeeeeeee',
  'EEEeEEEEEEEeEEEE',
  'EEEeEEEEEEEeEEEE',
  'EEEeEEEEEEEeEEEE',
  'eeeeeeeeeeeeeeee',
];
// Un pont en bois (fin : 8 pixels de haut)
const TUILE_PONT_BOIS = [
  'TTTTTTTtTTTTTTTt',
  'TtTTTTTtTTTTtTTt',
  'TTTTtTTtTTTTTTTt',
  'tttttttttttttttt',
  '.t....t....t...t',
  '.t....t....t...t',
  '.t....t....t...t',
  '.t....t....t...t',
];
// Un pont en pierre (solide, jamais fragile)
const TUILE_PONT_PIERRE = [
  'EEEEeEEEEEEEeEEE',
  'EEEEeEEEEEEEeEEE',
  'eeeeeeeeeeeeeeee',
  'EeEEEEEEeEEEEEEE',
  'EeEEEEEEeEEEEEEE',
  'eeeeeeeeeeeeeeee',
  'EEEEeEEEEEEEeEEE',
  'EEEEeEEEEEEEeEEE',
];

// Le drapeau de checkpoint (mi-parcours des niveaux 3 et 4)
const DRAPEAU = [
  'wYYYYYY.....',
  'wYYYYYYYY...',
  'wYYYYYY.....',
  'w...........',
  'w...........',
  'w...........',
  'w...........',
  'w...........',
  'w...........',
  'w...........',
  'w...........',
  'w...........',
  'w...........',
  'w...........',
  'w...........',
  'w...........',
];

/* ============================================================
   On fabrique toutes les images une seule fois, au démarrage
   ============================================================ */

function versDroiteEtGauche(matrice) {
  // Beaucoup de sprites regardent à droite : on prépare
  // aussi leur version miroir pour quand ils vont à gauche.
  const droite = creerSprite(matrice);
  return { droite, gauche: retourner(droite) };
}

export const SPRITES = {
  panpan: {
    idle: [
      panpan(OREILLES_1, TETE, CORPS_IDLE, JAMBES_DEBOUT),
      panpan(OREILLES_2, TETE, CORPS_IDLE, JAMBES_DEBOUT),
    ],
    course: [
      panpan(OREILLES_1, TETE, CORPS_IDLE, JAMBES_COURSE_1),
      panpan(OREILLES_2, TETE, CORPS_IDLE, JAMBES_COURSE_2),
      panpan(OREILLES_1, TETE, CORPS_IDLE, JAMBES_COURSE_3),
      panpan(OREILLES_2, TETE, CORPS_IDLE, JAMBES_COURSE_2),
    ],
    saut: panpan(OREILLES_2, TETE, CORPS_IDLE, JAMBES_SAUT),
    frappe: [
      panpan(OREILLES_1, TETE, CORPS_ARME, JAMBES_DEBOUT),
      panpan(OREILLES_1, TETE, CORPS_FRAPPE, JAMBES_DEBOUT),
    ],
    mort: panpan(OREILLES_2, TETE_KO, CORPS_IDLE, JAMBES_SAUT),
    teteHud: creerSprite(TETE_HUD),
  },
  loup: {
    idle: [
      creerSprite([...LOUP_TETE, ...LOUP_CORPS, ...LOUP_JAMBES_1]),
      creerSprite([...LOUP_TETE, ...LOUP_CORPS, ...LOUP_JAMBES_2]),
    ],
    menotte: creerSprite([...LOUP_TETE, ...LOUP_MENOTTE, ...LOUP_JAMBES_1]),
  },
  renard: [versDroiteEtGauche(RENARD_1), versDroiteEtGauche(RENARD_2)],
  chien: [versDroiteEtGauche(CHIEN_1), versDroiteEtGauche(CHIEN_2)],
  belette: [versDroiteEtGauche(BELETTE_1), versDroiteEtGauche(BELETTE_2)],
  etoile: creerSprite(ETOILE),
  carotte: creerSprite(CAROTTE),
  foin: creerSprite(FOIN),
  salade: creerSprite(SALADE),
  coeur: creerSprite(COEUR),
  tuiles: {
    herbe: creerSprite(TUILE_HERBE),
    pierre: creerSprite(TUILE_PIERRE),
    pontBois: creerSprite(TUILE_PONT_BOIS),
    pontPierre: creerSprite(TUILE_PONT_PIERRE),
  },
  drapeau: creerSprite(DRAPEAU),
};

// Les frames de Panpan qui regardent à gauche (miroir)
SPRITES.panpanGauche = {
  idle: SPRITES.panpan.idle.map(retourner),
  course: SPRITES.panpan.course.map(retourner),
  saut: retourner(SPRITES.panpan.saut),
  frappe: SPRITES.panpan.frappe.map(retourner),
  mort: retourner(SPRITES.panpan.mort),
};
// Les frames du loup qui regardent à gauche
SPRITES.loupGauche = {
  idle: SPRITES.loup.idle.map(retourner),
  menotte: retourner(SPRITES.loup.menotte),
};
