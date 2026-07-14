/* ============================================================
   game.js — Le cœur du jeu Rabbit Man !
   ------------------------------------------------------------
   C'est ici que tout se passe : la boucle du jeu (60 images
   par seconde), la physique (gravité, sauts), les collisions,
   la salle de surveillance, et les écrans de victoire.
   ============================================================ */

import { SPRITES } from './sprites.js';
import { touches, vientDappuyer, oublierAppuis, installerControles } from './input.js';
import {
  debloquerAudio, jouerM4a, arreterM4a, estMute, basculerMute,
  sons, jouerMusique, arreterMusique,
} from './audio.js';
import { NIVEAUX, SOL_Y, TUILE, HAUTEUR_JEU } from './levels.js';

/* ---------- Le canvas et sa mise à l'échelle ---------- */

const LARGEUR = 480;  // taille "virtuelle" du jeu en pixels
const HAUTEUR = 270;

const canvas = document.getElementById('jeu');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // pixels nets !

// Le canvas s'agrandit pour remplir l'écran en gardant son ratio
function ajusterTaille() {
  const echelle = Math.min(window.innerWidth / LARGEUR, window.innerHeight / HAUTEUR);
  canvas.style.width = Math.floor(LARGEUR * echelle) + 'px';
  canvas.style.height = Math.floor(HAUTEUR * echelle) + 'px';
}
window.addEventListener('resize', ajusterTaille);
ajusterTaille();

/* ---------- La sauvegarde (localStorage) ---------- */

function chargerSauvegarde() {
  try {
    const brut = localStorage.getItem('rabbitman.save');
    if (brut) return JSON.parse(brut);
  } catch (e) { /* sauvegarde illisible : on repart de zéro */ }
  return { faits: [false, false, false, false], bonus: [0, 0, 0, 0] };
}
function sauvegarder() {
  localStorage.setItem('rabbitman.save', JSON.stringify(save));
}
let save = chargerSauvegarde();

/* ---------- Les réglages de la physique ---------- */

const GRAVITE = 1000;       // à quelle vitesse on retombe
const VITESSE = 120;        // vitesse de course de Panpan
const SAUT = 330;           // force du saut (hauteur fixe)
const VITESSE_ENNEMI = { chien: 30, renard: 55, belette: 85 };

/* ---------- L'état général du jeu ---------- */

// Dans quel "écran" on se trouve
let etat = 'titre'; // 'titre' | 'surveillance' | 'jeu' | 'gameover' | 'final'
let tempsEtat = 0;  // depuis combien de temps on est dans cet écran

// Variables du niveau en cours
let numNiveau = 0;        // 0 à 3 (affiché 1 à 4)
let plateformes = [];     // copies "vivantes" des plateformes
let ennemis = [];
let bonusActifs = [];
let joueur = null;
let cameraX = 0;
let vies = 3;
let checkpointPris = false;
let messagesFlottants = []; // les petits "+1 ♥" qui montent

// Variables de la salle de surveillance
let loupEchappe = -1;     // quel loup vient de s'évader (0 à 3)
let rectanglesMoniteurs = []; // où sont les écrans (pour le tactile)

// Confettis de la victoire finale
let confettis = [];

/* ============================================================
   DÉMARRER UN NIVEAU
   ============================================================ */

function demarrerNiveau(n) {
  numNiveau = n;
  const modele = NIVEAUX[n];

  // On copie les données du niveau pour pouvoir les modifier
  // (les ponts cassés, les ennemis assommés…) sans abîmer le modèle
  plateformes = modele.plateformes.map(p => ({
    ...p,
    etatFragile: 'intact', // 'intact' → 'tremble' → 'tombe'
    minuterie: 0,
    chuteY: 0,
  }));
  ennemis = modele.ennemis.map(e => ({
    ...e,
    y: SOL_Y - hauteurEnnemi(e.type),
    dir: 1,
    vivant: true,
    koTimer: 0,
    anim: Math.random() * 10, // pour que tous ne marchent pas en rythme
  }));
  bonusActifs = modele.bonus.map(b => ({ ...b, pris: false }));

  vies = 3;
  checkpointPris = false;
  messagesFlottants = [];
  faireApparaitreJoueur();
  changerEtat('jeu');
}

function hauteurEnnemi(type) {
  return SPRITES[type][0].droite.height;
}

function faireApparaitreJoueur() {
  const xDepart = (checkpointPris && NIVEAUX[numNiveau].checkpointX)
    ? NIVEAUX[numNiveau].checkpointX
    : 30;
  joueur = {
    x: xDepart, y: SOL_Y - 24,
    vx: 0, vy: 0,
    largeur: 12, hauteur: 24,
    auSol: true,
    direction: 1,          // 1 = droite, -1 = gauche
    anim: 0,               // compteur pour les animations
    frappe: 0,             // temps restant du coup de matraque
    mode: 'normal',        // 'normal' | 'mort' | 'victoire'
    minuterie: 0,
    rotation: 0,           // pour l'animation de mort
  };
  // On remet les plateformes fragiles et les ennemis en place
  for (const p of plateformes) {
    p.etatFragile = 'intact';
    p.minuterie = 0;
    p.chuteY = 0;
  }
  for (const e of ennemis) {
    e.vivant = true;
    e.koTimer = 0;
    e.x = (e.xMin + e.xMax) / 2;
    e.dir = 1;
  }
  // Les bonus réapparaissent aussi (mais le compteur, lui, est gardé !)
  for (const b of bonusActifs) b.pris = false;
}

function changerEtat(nouveau) {
  etat = nouveau;
  tempsEtat = 0;
}

/* ============================================================
   MISE À JOUR : la logique du jeu, appelée 60 fois par seconde
   ============================================================ */

function mettreAJour(dt) {
  tempsEtat += dt;

  if (etat === 'jeu') mettreAJourJeu(dt);
  else if (etat === 'surveillance') mettreAJourSurveillance(dt);
  else if (etat === 'final') mettreAJourConfettis(dt);
  else if (etat === 'gameover' && tempsEtat > 6) allerSurveillance();
}

function mettreAJourJeu(dt) {
  // La bonne musique selon le niveau (le niveau 4 a la sienne !)
  if (joueur.mode === 'normal') {
    jouerMusique(numNiveau === 3 ? 'niveau4' : 'niveau');
  }

  mettreAJourJoueur(dt);
  mettreAJourEnnemis(dt);
  mettreAJourPlateformes(dt);
  mettreAJourMessages(dt);

  // La caméra suit Panpan (sans sortir du niveau)
  const longueur = NIVEAUX[numNiveau].longueur;
  cameraX = Math.max(0, Math.min(joueur.x - 180, longueur - LARGEUR));
}

function mettreAJourJoueur(dt) {
  const j = joueur;

  // --- Animation de mort : Panpan tourne et tombe ---
  if (j.mode === 'mort') {
    j.minuterie += dt;
    j.vy += GRAVITE * dt;
    j.y += j.vy * dt;
    j.rotation += 10 * dt;
    if (j.minuterie > 1.3) {
      vies--;
      if (vies > 0) {
        faireApparaitreJoueur();
      } else {
        arreterMusique();
        jouerM4a('gameOver');
        changerEtat('gameover');
      }
    }
    return;
  }

  // --- Animation de victoire : le loup est menotté ! ---
  if (j.mode === 'victoire') {
    j.minuterie += dt;
    if (j.minuterie > 3) {
      save.faits[numNiveau] = true;
      sauvegarder();
      if (save.faits.every(f => f)) {
        // Les 4 loups sont attrapés : grande victoire !
        arreterMusique();
        jouerM4a('winner');
        preparerConfettis();
        changerEtat('final');
      } else {
        allerSurveillance();
      }
    }
    return;
  }

  // --- Déplacements gauche / droite ---
  j.vx = 0;
  if (touches.gauche) { j.vx = -VITESSE; j.direction = -1; }
  if (touches.droite) { j.vx = VITESSE; j.direction = 1; }
  j.x += j.vx * dt;
  // On ne peut pas sortir du niveau
  j.x = Math.max(4, Math.min(j.x, NIVEAUX[numNiveau].longueur - j.largeur - 4));

  // --- Saut (hauteur fixe) ---
  if (vientDappuyer.sauter && j.auSol) {
    j.vy = -SAUT;
    j.auSol = false;
    sons.saut();
  }

  // --- Coup de matraque ---
  if (vientDappuyer.frapper && j.frappe <= 0) {
    j.frappe = 0.3;
    sons.matraque();
  }
  if (j.frappe > 0) j.frappe -= dt;

  // --- Gravité et atterrissage sur les plateformes ---
  const piedsAvant = j.y + j.hauteur;
  j.vy += GRAVITE * dt;
  j.y += j.vy * dt;
  j.auSol = false;

  if (j.vy >= 0) {
    for (const p of plateformes) {
      if (p.etatFragile === 'tombe') continue; // plus de sol ici !
      const piedsApres = j.y + j.hauteur;
      const surLaLargeur = j.x + j.largeur > p.x && j.x < p.x + p.w;
      // On atterrit seulement si on vient d'en haut
      if (surLaLargeur && piedsAvant <= p.y + 6 && piedsApres >= p.y) {
        j.y = p.y - j.hauteur;
        j.vy = 0;
        j.auSol = true;
        // Une plateforme fragile commence à trembler dès qu'on y pose le pied
        if (p.fragile && p.etatFragile === 'intact') {
          p.etatFragile = 'tremble';
          p.minuterie = 0.6;
          sons.craquement();
        }
      }
    }
  }

  // --- Tombé dans un trou ? ---
  if (j.y > HAUTEUR_JEU + 30) {
    tuerJoueur(true);
    return;
  }

  // --- Checkpoint atteint ? ---
  const cp = NIVEAUX[numNiveau].checkpointX;
  if (cp && !checkpointPris && j.x > cp) {
    checkpointPris = true;
    sons.clic();
    messagesFlottants.push({ texte: 'Checkpoint !', x: j.x, y: j.y - 10, vie: 1.5 });
  }

  // --- Ramassage des bonus ---
  for (const b of bonusActifs) {
    if (b.pris) continue;
    const dx = (j.x + j.largeur / 2) - b.x;
    const dy = (j.y + j.hauteur / 2) - b.y;
    if (Math.abs(dx) < 14 && Math.abs(dy) < 18) {
      b.pris = true;
      save.bonus[numNiveau]++;
      sons.bonus();
      // Tous les 20 bonus : une vie en plus !
      if (save.bonus[numNiveau] % 20 === 0) {
        vies++;
        sons.vie();
        messagesFlottants.push({ texte: '+1 ♥', x: j.x, y: j.y - 14, vie: 2 });
      }
      sauvegarder();
    }
  }

  // --- Le loup en fuite : l'attraper = gagner ! ---
  const loupX = NIVEAUX[numNiveau].loupX;
  if (Math.abs(j.x - loupX) < 16 && j.y + j.hauteur > SOL_Y - 26) {
    j.mode = 'victoire';
    j.minuterie = 0;
    j.vx = 0;
    arreterMusique();
    sons.fanfare();
  }

  // --- Compteur d'animation (pour faire bouger les oreilles) ---
  j.anim += dt * (j.vx !== 0 ? 10 : 3);
}

function tuerJoueur(tombeDansTrou = false) {
  if (joueur.mode !== 'normal') return;
  joueur.mode = 'mort';
  joueur.minuterie = 0;
  joueur.vy = tombeDansTrou ? 100 : -260; // petit bond en l'air, puis chute
  arreterMusique();
  sons.mort();
}

function mettreAJourEnnemis(dt) {
  const j = joueur;
  for (const e of ennemis) {
    if (!e.vivant) {
      // L'ennemi est KO : les étoiles tournent, puis il disparaît
      e.koTimer -= dt;
      continue;
    }
    // Patrouille en aller-retour
    e.x += e.dir * VITESSE_ENNEMI[e.type] * dt;
    if (e.x < e.xMin) { e.x = e.xMin; e.dir = 1; }
    if (e.x > e.xMax) { e.x = e.xMax; e.dir = -1; }
    e.anim += dt * 8;

    if (j.mode !== 'normal') continue;

    const largeurE = SPRITES[e.type][0].droite.width - 4;
    const hauteurE = hauteurEnnemi(e.type);

    // Coup de matraque ? (une petite zone devant Panpan)
    if (j.frappe > 0.1) {
      const zoneX = j.direction === 1 ? j.x + j.largeur : j.x - 20;
      if (e.x + largeurE > zoneX && e.x < zoneX + 20 &&
          e.y + hauteurE > j.y && e.y < j.y + j.hauteur) {
        e.vivant = false;
        e.koTimer = 1.0;
        sons.assomme();
        continue;
      }
    }

    // Sinon, toucher un ennemi = perdre une vie
    if (j.x + j.largeur > e.x + 2 && j.x < e.x + largeurE - 2 &&
        j.y + j.hauteur > e.y + 2 && j.y < e.y + hauteurE) {
      tuerJoueur();
    }
  }
  // On enlève les ennemis KO dont le temps est écoulé
  ennemis = ennemis.filter(e => e.vivant || e.koTimer > 0);
}

function mettreAJourPlateformes(dt) {
  for (const p of plateformes) {
    if (p.etatFragile === 'tremble') {
      p.minuterie -= dt;
      if (p.minuterie <= 0) {
        p.etatFragile = 'tombe';
        p.vitesseChute = 0;
      }
    } else if (p.etatFragile === 'tombe') {
      // La tuile tombe dans le vide
      p.vitesseChute = (p.vitesseChute || 0) + GRAVITE * dt;
      p.chuteY += p.vitesseChute * dt;
    }
  }
}

function mettreAJourMessages(dt) {
  for (const m of messagesFlottants) {
    m.y -= 20 * dt;
    m.vie -= dt;
  }
  messagesFlottants = messagesFlottants.filter(m => m.vie > 0);
}

/* ============================================================
   LA SALLE DE SURVEILLANCE
   ============================================================ */

function allerSurveillance() {
  arreterM4a();
  arreterMusique();
  changerEtat('surveillance');
  // Un loup s'échappe au hasard parmi les cellules pas encore réussies
  const restants = [0, 1, 2, 3].filter(i => !save.faits[i]);
  loupEchappe = restants.length > 0
    ? restants[Math.floor(Math.random() * restants.length)]
    : -1;
  if (loupEchappe >= 0) sons.sirene(2.4);
}

function mettreAJourSurveillance(dt) {
  // La petite musique calme démarre après la sirène
  if (tempsEtat > 2.5) jouerMusique('surveillance');
}

// Quand on touche l'écran dans la salle de surveillance
function toucherSurveillance(x, y) {
  for (let i = 0; i < rectanglesMoniteurs.length; i++) {
    const r = rectanglesMoniteurs[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      // On peut lancer le niveau du loup évadé, ou rejouer un niveau réussi
      if (i === loupEchappe || save.faits[i]) {
        sons.clic();
        arreterMusique();
        demarrerNiveau(i);
      }
      return;
    }
  }
}

/* ============================================================
   LES CONFETTIS de la victoire finale
   ============================================================ */

function preparerConfettis() {
  confettis = [];
  const couleurs = ['#e03131', '#ffd530', '#7bc850', '#2b5bd7', '#ff9eb4'];
  for (let i = 0; i < 120; i++) {
    confettis.push({
      x: Math.random() * LARGEUR,
      y: -Math.random() * HAUTEUR,
      vy: 30 + Math.random() * 50,
      vx: (Math.random() - 0.5) * 30,
      taille: 2 + Math.random() * 3,
      couleur: couleurs[i % couleurs.length],
    });
  }
}

function mettreAJourConfettis(dt) {
  for (const c of confettis) {
    c.y += c.vy * dt;
    c.x += c.vx * dt + Math.sin(c.y / 10) * 0.5;
    if (c.y > HAUTEUR) { c.y = -5; c.x = Math.random() * LARGEUR; }
  }
}

/* ============================================================
   DESSIN : tout ce qu'on voit à l'écran
   ============================================================ */

function dessiner() {
  ctx.clearRect(0, 0, LARGEUR, HAUTEUR);
  if (etat === 'titre') dessinerTitre();
  else if (etat === 'surveillance') dessinerSurveillance();
  else if (etat === 'jeu') dessinerJeu();
  else if (etat === 'gameover') dessinerGameOver();
  else if (etat === 'final') dessinerVictoireFinale();
}

// Petit raccourci pour écrire du texte centré avec une ombre
function texte(msg, x, y, taille = 10, couleur = '#ffffff', centre = true) {
  ctx.font = `bold ${taille}px monospace`;
  ctx.textAlign = centre ? 'center' : 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(msg, x + 1, y + 1);
  ctx.fillStyle = couleur;
  ctx.fillText(msg, x, y);
}

/* ---------- L'écran titre ---------- */

function dessinerTitre() {
  dessinerCiel();
  dessinerCollines(0);
  // Le sol
  for (let tx = 0; tx < LARGEUR; tx += TUILE) {
    ctx.drawImage(SPRITES.tuiles.herbe, tx, SOL_Y);
    ctx.drawImage(SPRITES.tuiles.herbe, tx, SOL_Y + 16);
    ctx.drawImage(SPRITES.tuiles.herbe, tx, SOL_Y + 32);
  }
  // Le grand titre
  texte('RABBIT MAN', LARGEUR / 2, 70, 34, '#ffd530');
  texte('Panpan le policier lapin', LARGEUR / 2, 95, 12, '#ffffff');

  // Panpan en grand, qui gigote (à gauche du bouton JOUER)
  const frame = SPRITES.panpan.idle[Math.floor(tempsEtat * 2) % 2];
  ctx.drawImage(frame, LARGEUR / 2 - 140, SOL_Y - 96, 64, 96);

  // Le bouton JOUER (qui clignote doucement)
  const clignote = Math.sin(tempsEtat * 4) > -0.5;
  if (clignote) {
    ctx.fillStyle = 'rgba(22, 50, 125, 0.85)';
    ctx.fillRect(LARGEUR / 2 - 60, 190, 120, 32);
    ctx.strokeStyle = '#ffd530';
    ctx.lineWidth = 2;
    ctx.strokeRect(LARGEUR / 2 - 60, 190, 120, 32);
    texte('▶ JOUER', LARGEUR / 2, 212, 16, '#ffd530');
  }

  // Si le jeu a déjà été fini, on propose de tout recommencer
  if (save.faits.some(f => f)) {
    texte('(appui long ici : tout recommencer)', LARGEUR / 2, 250, 7, 'rgba(255,255,255,0.7)');
  }
}

/* ---------- La salle de surveillance ---------- */

function dessinerSurveillance() {
  // Le fond sombre de la salle de contrôle
  ctx.fillStyle = '#1a2340';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  ctx.fillStyle = '#232f57';
  ctx.fillRect(0, HAUTEUR - 50, LARGEUR, 50); // le bureau

  texte('SALLE DE SURVEILLANCE', LARGEUR / 2, 28, 16, '#ffd530');

  // Les 4 écrans de caméras
  rectanglesMoniteurs = [];
  const largeurM = 96, hauteurM = 68, espace = 14;
  const totale = 4 * largeurM + 3 * espace;
  const departX = (LARGEUR - totale) / 2;
  const departY = 70;

  for (let i = 0; i < 4; i++) {
    const mx = departX + i * (largeurM + espace);
    const my = departY;
    rectanglesMoniteurs.push({ x: mx - 4, y: my - 4, w: largeurM + 8, h: hauteurM + 30 });

    const estEvade = i === loupEchappe;
    const clignoteRouge = estEvade && Math.floor(tempsEtat * 4) % 2 === 0;

    // Le cadre de l'écran
    ctx.fillStyle = '#4f4f5c';
    ctx.fillRect(mx - 4, my - 4, largeurM + 8, hauteurM + 8);
    // L'image de la caméra : la cellule
    ctx.fillStyle = clignoteRouge ? '#5c1a1a' : '#25321f';
    ctx.fillRect(mx, my, largeurM, hauteurM);

    // Le mur de pierre au fond de la cellule
    ctx.globalAlpha = 0.4;
    for (let tx = 0; tx < largeurM; tx += 16) {
      ctx.drawImage(SPRITES.tuiles.pierre, mx + tx, my, 16, 16);
    }
    ctx.globalAlpha = 1;

    // Le loup dans sa cellule (sauf s'il s'est évadé !)
    if (estEvade) {
      // Petite animation : le loup sort de l'écran vers la droite
      const sortie = Math.min(tempsEtat * 30, largeurM + 10);
      const frame = SPRITES.loup.idle[Math.floor(tempsEtat * 6) % 2];
      ctx.save();
      ctx.beginPath();
      ctx.rect(mx, my, largeurM, hauteurM);
      ctx.clip();
      ctx.drawImage(frame, mx + 30 + sortie, my + hauteurM - 26, 16, 22);
      ctx.restore();
    } else if (!save.faits[i]) {
      const frame = SPRITES.loup.idle[Math.floor((tempsEtat + i) * 2) % 2];
      ctx.drawImage(frame, mx + 38, my + hauteurM - 26, 16, 22);
    } else {
      // Cellule d'un loup déjà rattrapé : il est là, menotté
      ctx.drawImage(SPRITES.loup.menotte, mx + 38, my + hauteurM - 26, 16, 22);
    }

    // Les barreaux devant
    ctx.fillStyle = 'rgba(200, 200, 214, 0.85)';
    for (let bx = mx + 8; bx < mx + largeurM; bx += 14) {
      ctx.fillRect(bx, my + 6, 3, hauteurM - 12);
    }

    // Le numéro de la cellule
    texte(String(i + 1), mx + largeurM / 2, my + hauteurM + 20, 16, '#ffffff');

    // La coche verte des niveaux réussis
    if (save.faits[i]) {
      texte('✓', mx + largeurM - 8, my + 16, 16, '#7bc850');
    }
    // Le panneau "ÉVADÉ !" qui clignote
    if (estEvade && clignoteRouge) {
      texte('ÉVADÉ !', mx + largeurM / 2, my + 14, 10, '#ff5555');
    }
  }

  // Les instructions en bas
  if (loupEchappe >= 0) {
    if (Math.floor(tempsEtat * 2) % 2 === 0) {
      texte('Touche l’écran qui clignote pour poursuivre le loup !',
        LARGEUR / 2, HAUTEUR - 20, 10, '#ffd530');
    }
  } else {
    texte('Tous les loups sont en cellule. Touche un écran pour rejouer !',
      LARGEUR / 2, HAUTEUR - 20, 9, '#ffffff');
  }
}

/* ---------- Le jeu (les parcours) ---------- */

function dessinerJeu() {
  dessinerCiel();
  dessinerNuages();
  dessinerCollines(cameraX);

  ctx.save();
  ctx.translate(-Math.round(cameraX), 0); // la caméra !

  dessinerPrison();
  dessinerPlateformes();
  dessinerCheckpoint();
  dessinerBonus();
  dessinerEnnemis();
  dessinerLoupFinal();
  dessinerJoueur();
  dessinerMessagesFlottants();

  ctx.restore();

  dessinerHUD();

  // Les grands messages au centre de l'écran
  if (joueur.mode === 'victoire') {
    texte('LOUP ATTRAPÉ !', LARGEUR / 2, 100, 24, '#ffd530');
    texte('Clic ! Menottes !', LARGEUR / 2, 125, 12, '#ffffff');
  }
  if (tempsEtat < 2 && joueur.mode === 'normal') {
    texte(`Rattrape le loup n°${numNiveau + 1} !`, LARGEUR / 2, 80, 14, '#ffffff');
  }
}

function dessinerCiel() {
  const degrade = ctx.createLinearGradient(0, 0, 0, HAUTEUR);
  degrade.addColorStop(0, '#66b7ff');
  degrade.addColorStop(1, '#a8d8ff');
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
}

function dessinerNuages() {
  // Les nuages défilent moins vite que le sol : effet de profondeur
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const decalage = (cameraX * 0.25) % 300;
  for (let i = -1; i < 3; i++) {
    const nx = i * 300 - decalage + 60;
    ctx.fillRect(nx, 40, 40, 10);
    ctx.fillRect(nx + 8, 32, 24, 10);
    ctx.fillRect(nx + 150, 70, 48, 10);
    ctx.fillRect(nx + 160, 62, 28, 10);
  }
}

function dessinerCollines(camX) {
  ctx.fillStyle = '#5cb85c';
  const decalage = (camX * 0.5) % 240;
  for (let i = -1; i < 4; i++) {
    const cx = i * 240 - decalage + 80;
    ctx.beginPath();
    ctx.arc(cx, SOL_Y + 30, 70, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 130, SOL_Y + 40, 50, Math.PI, 0);
    ctx.fill();
  }
}

function dessinerPrison() {
  // La prison au début du niveau : c'est de là que le loup s'est enfui !
  for (let ty = SOL_Y - 80; ty < SOL_Y; ty += 16) {
    for (let tx = -80; tx < 20; tx += 16) {
      ctx.drawImage(SPRITES.tuiles.pierre, tx, ty);
    }
  }
  // Le toit
  ctx.fillStyle = '#4f4f5c';
  ctx.fillRect(-84, SOL_Y - 88, 108, 8);
  // La porte ouverte (toute noire : le loup est parti par là)
  ctx.fillStyle = '#1a1a24';
  ctx.fillRect(-4, SOL_Y - 40, 20, 40);
  // La fenêtre à barreaux
  ctx.fillStyle = '#1a1a24';
  ctx.fillRect(-60, SOL_Y - 64, 24, 18);
  ctx.fillStyle = '#c9c9d6';
  for (let bx = -56; bx < -38; bx += 7) ctx.fillRect(bx, SOL_Y - 64, 2, 18);
}

function dessinerPlateformes() {
  for (const p of plateformes) {
    // On ne dessine que ce qui est visible à l'écran
    if (p.x + p.w < cameraX - 20 || p.x > cameraX + LARGEUR + 20) continue;

    let dx = 0, dy = 0;
    if (p.etatFragile === 'tremble') {
      // La plateforme tremble avant de tomber !
      dx = Math.round(Math.sin(p.minuterie * 60) * 1.5);
    } else if (p.etatFragile === 'tombe') {
      dy = p.chuteY;
      if (dy > HAUTEUR) continue; // elle est tombée trop bas
    }

    const sprite = SPRITES.tuiles[p.tuile];
    if (p.tuile === 'herbe') {
      // Le sol : on empile des tuiles d'herbe jusqu'en bas
      for (let tx = 0; tx < p.w; tx += TUILE) {
        for (let ty = 0; ty < p.h + 16; ty += TUILE) {
          ctx.drawImage(sprite, p.x + tx + dx, p.y + ty + dy);
        }
      }
    } else {
      for (let tx = 0; tx < p.w; tx += TUILE) {
        ctx.drawImage(sprite, p.x + tx + dx, p.y + dy);
      }
    }
  }
}

function dessinerCheckpoint() {
  const cp = NIVEAUX[numNiveau].checkpointX;
  if (!cp) return;
  ctx.drawImage(SPRITES.drapeau, cp, SOL_Y - 16);
  if (checkpointPris) {
    // Le drapeau devient vert une fois passé
    ctx.fillStyle = '#7bc850';
    ctx.fillRect(cp + 1, SOL_Y - 16, 6, 3);
  }
}

function dessinerBonus() {
  for (const b of bonusActifs) {
    if (b.pris) continue;
    if (b.x < cameraX - 20 || b.x > cameraX + LARGEUR + 20) continue;
    const sprite = SPRITES[b.type];
    // Les bonus flottent doucement de haut en bas
    const flotte = Math.sin(performance.now() / 300 + b.x) * 2;
    ctx.drawImage(sprite, b.x - sprite.width / 2, b.y - sprite.height / 2 + flotte);
  }
}

function dessinerEnnemis() {
  for (const e of ennemis) {
    if (e.x < cameraX - 30 || e.x > cameraX + LARGEUR + 30) continue;
    const paire = SPRITES[e.type][Math.floor(e.anim) % 2];
    const sprite = e.dir === 1 ? paire.droite : paire.gauche;

    if (e.vivant) {
      ctx.drawImage(sprite, Math.round(e.x), Math.round(e.y));
    } else {
      // KO : l'ennemi est couché, des étoiles tournent au-dessus
      ctx.save();
      ctx.translate(Math.round(e.x) + sprite.width / 2, Math.round(e.y) + sprite.height);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(sprite, -sprite.width / 2, -sprite.height);
      ctx.restore();
      const t = performance.now() / 200;
      for (let s = 0; s < 3; s++) {
        const angle = t + s * (Math.PI * 2 / 3);
        const ex = e.x + sprite.width / 2 + Math.cos(angle) * 10;
        const ey = e.y - 6 + Math.sin(angle) * 3;
        ctx.drawImage(SPRITES.etoile, Math.round(ex), Math.round(ey));
      }
    }
  }
}

function dessinerLoupFinal() {
  const loupX = NIVEAUX[numNiveau].loupX;
  const capture = joueur.mode === 'victoire';
  const frame = capture
    ? SPRITES.loupGauche.menotte
    : SPRITES.loupGauche.idle[Math.floor(performance.now() / 250) % 2];
  ctx.drawImage(frame, Math.round(loupX - 8), SOL_Y - 22);
  if (!capture) {
    // Un point d'exclamation au-dessus du fuyard
    texte('!', loupX, SOL_Y - 30, 12, '#e03131');
  }
}

function dessinerJoueur() {
  const j = joueur;
  const versLaDroite = j.direction === 1;
  const jeu = versLaDroite ? SPRITES.panpan : SPRITES.panpanGauche;

  let sprite;
  if (j.mode === 'mort') {
    sprite = jeu.mort;
  } else if (j.frappe > 0) {
    sprite = jeu.frappe[j.frappe > 0.15 ? 0 : 1];
  } else if (!j.auSol) {
    sprite = jeu.saut;
  } else if (j.vx !== 0) {
    sprite = jeu.course[Math.floor(j.anim) % 4];
  } else {
    sprite = jeu.idle[Math.floor(j.anim) % 2];
  }

  ctx.save();
  ctx.translate(Math.round(j.x + j.largeur / 2), Math.round(j.y + j.hauteur / 2));
  if (j.mode === 'mort') ctx.rotate(j.rotation); // il tournoie !
  ctx.drawImage(sprite, -8, -12);
  ctx.restore();
}

function dessinerMessagesFlottants() {
  for (const m of messagesFlottants) {
    texte(m.texte, m.x, m.y, 10, '#ffd530');
  }
}

/* ---------- Le HUD : les informations en haut de l'écran ---------- */

function dessinerHUD() {
  // Un petit bandeau sombre pour bien lire
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 0, LARGEUR, 22);

  // Le numéro du niveau
  texte(`Niveau ${numNiveau + 1}`, 8, 15, 10, '#ffffff', false);

  // Les vies : des petites têtes de Panpan
  for (let v = 0; v < vies; v++) {
    ctx.drawImage(SPRITES.panpan.teteHud, 70 + v * 11, 6);
  }

  // Le compteur de bonus : progression vers la prochaine vie
  ctx.drawImage(SPRITES.carotte, 150, 6);
  texte(`${save.bonus[numNiveau] % 20}/20`, 160, 15, 10, '#ffd530', false);

  // La distance restante jusqu'au loup
  const distance = Math.max(0, Math.round((NIVEAUX[numNiveau].loupX - joueur.x) / 16));
  texte(`Loup → ${distance} m`, LARGEUR - 75, 15, 10, '#ffffff');
}

/* ---------- Game over et victoire finale ---------- */

function dessinerGameOver() {
  ctx.fillStyle = '#1a1a24';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  texte('GAME OVER', LARGEUR / 2, 110, 30, '#e03131');
  texte('Le loup s’est enfui… mais Panpan ne lâche rien !',
    LARGEUR / 2, 145, 10, '#ffffff');
  ctx.drawImage(SPRITES.panpan.mort, LARGEUR / 2 - 16, 160, 32, 48);
  if (tempsEtat > 1.5) {
    texte('Touche l’écran pour retourner à la salle de surveillance',
      LARGEUR / 2, 245, 8, '#ffd530');
  }
}

function dessinerVictoireFinale() {
  dessinerCiel();
  // Le sol
  for (let tx = 0; tx < LARGEUR; tx += TUILE) {
    ctx.drawImage(SPRITES.tuiles.herbe, tx, SOL_Y);
    ctx.drawImage(SPRITES.tuiles.herbe, tx, SOL_Y + 16);
    ctx.drawImage(SPRITES.tuiles.herbe, tx, SOL_Y + 32);
  }

  texte('BRAVO !', LARGEUR / 2, 60, 30, '#ffd530');
  texte('Les 4 loups sont de retour en prison !', LARGEUR / 2, 85, 12, '#ffffff');

  // La grande cellule avec les 4 loups
  const cx = LARGEUR / 2 - 70, cy = SOL_Y - 70;
  ctx.fillStyle = '#4f4f5c';
  ctx.fillRect(cx - 6, cy - 6, 152, 76);
  ctx.fillStyle = '#25321f';
  ctx.fillRect(cx, cy, 140, 70);
  for (let i = 0; i < 4; i++) {
    const frame = SPRITES.loup.menotte;
    ctx.drawImage(frame, cx + 12 + i * 32, cy + 44, 16, 22);
  }
  // Les barreaux
  ctx.fillStyle = '#c9c9d6';
  for (let bx = cx + 6; bx < cx + 140; bx += 13) {
    ctx.fillRect(bx, cy + 3, 3, 64);
  }

  // Panpan qui salue (il saute de joie !)
  const saut = Math.abs(Math.sin(tempsEtat * 3)) * 12;
  const frame = SPRITES.panpan.idle[Math.floor(tempsEtat * 4) % 2];
  ctx.drawImage(frame, LARGEUR / 2 + 100, SOL_Y - 48 - saut, 32, 48);

  // Les confettis par-dessus tout !
  for (const c of confettis) {
    ctx.fillStyle = c.couleur;
    ctx.fillRect(Math.round(c.x), Math.round(c.y), c.taille, c.taille);
  }

  if (tempsEtat > 3) {
    texte('Touche l’écran pour revenir au titre', LARGEUR / 2, 250, 9, '#ffffff');
  }
}

/* ============================================================
   LES TOUCHERS SUR L'ÉCRAN (menus)
   ============================================================ */

// Transforme une position de doigt/souris en position dans le jeu
function positionDansLeJeu(evenement) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evenement.clientX - rect.left) / rect.width * LARGEUR,
    y: (evenement.clientY - rect.top) / rect.height * HAUTEUR,
  };
}

let appuiLongTimer = null;

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  debloquerAudio(); // le son a le droit de démarrer dès le premier toucher
  const pos = positionDansLeJeu(e);

  if (etat === 'titre') {
    const surJouer = pos.x > LARGEUR / 2 - 60 && pos.x < LARGEUR / 2 + 60 &&
                     pos.y > 185 && pos.y < 227;
    if (surJouer) {
      sons.clic();
      arreterM4a();
      allerSurveillance();
    } else {
      // Toucher ailleurs : on écoute la chanson du jeu !
      jouerM4a('rabbitMan');
      // Appui long en bas de l'écran : efface la sauvegarde
      if (pos.y > 235 && save.faits.some(f => f)) {
        appuiLongTimer = setTimeout(() => {
          save = { faits: [false, false, false, false], bonus: [0, 0, 0, 0] };
          sauvegarder();
          sons.vie();
        }, 1200);
      }
    }
  } else if (etat === 'surveillance') {
    toucherSurveillance(pos.x, pos.y);
  } else if (etat === 'gameover' && tempsEtat > 1.5) {
    arreterM4a();
    allerSurveillance();
  } else if (etat === 'final' && tempsEtat > 3) {
    arreterM4a();
    changerEtat('titre');
  }
});

canvas.addEventListener('pointerup', () => {
  if (appuiLongTimer) { clearTimeout(appuiLongTimer); appuiLongTimer = null; }
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Sur ordinateur, le clavier débloque aussi le son
window.addEventListener('keydown', debloquerAudio, { once: true });

/* ---------- Le bouton mute ---------- */

const boutonMute = document.getElementById('btn-mute');
boutonMute.textContent = estMute() ? '\u{1F507}' : '\u{1F50A}';
boutonMute.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  debloquerAudio();
  boutonMute.textContent = basculerMute() ? '\u{1F507}' : '\u{1F50A}';
});

/* ============================================================
   LA BOUCLE DU JEU : 60 fois par seconde,
   on met à jour puis on dessine. C'est le cœur qui bat !
   ============================================================ */

installerControles();

let dernierTemps = performance.now();

function boucle(maintenant) {
  // dt = le temps écoulé depuis la dernière image (en secondes)
  let dt = (maintenant - dernierTemps) / 1000;
  dernierTemps = maintenant;
  // Si l'onglet a été mis en pause, on évite un dt géant (ou négatif)
  if (dt > 0.05) dt = 0.05;
  if (dt < 0) dt = 0;

  mettreAJour(dt);
  dessiner();
  oublierAppuis();

  requestAnimationFrame(boucle);
}

requestAnimationFrame(boucle);

// Pour les tests automatiques : permet d'avancer le jeu image par
// image même quand l'onglet est caché (ne gêne pas le jeu normal).
window.__tick = boucle;
window.__etat = () => ({
  etat, tempsEtat, vies,
  joueur: joueur ? { x: joueur.x, y: joueur.y, mode: joueur.mode, auSol: joueur.auSol } : null,
  cameraX,
  ennemis: ennemis.map(e => ({ type: e.type, x: Math.round(e.x), vivant: e.vivant })),
});
window.__va = (x) => { if (joueur) { joueur.x = x; joueur.y = 150; joueur.vy = 0; } };
