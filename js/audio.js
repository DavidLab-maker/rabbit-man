/* ============================================================
   audio.js — Tous les sons du jeu
   ------------------------------------------------------------
   Deux sortes de sons :
   1. Les sons "fabriqués" par l'ordinateur avec la Web Audio
      API : musiques chiptune, sirène, bruitages…
   2. Trois enregistrements spéciaux (fichiers .m4a) pour les
      grands moments : le titre, la victoire finale, le game over.
   ============================================================ */

let ctx = null;          // le "moteur audio" du navigateur
let gainMaitre = null;   // volume général (0 quand on coupe le son)
let gainMusique = null;  // volume de la musique
let gainSons = null;     // volume des bruitages
let gainVoix = null;     // volume des enregistrements m4a

let mute = localStorage.getItem('rabbitman.mute') === 'oui';

// Les enregistrements décodés, prêts à jouer
const m4a = {};          // { rabbitMan, gameOver, winner }
let sourceM4a = null;    // l'enregistrement en train de jouer
let m4aEnAttente = null; // demandé avant la fin du chargement

/* ---------- Démarrage ----------
   Sur mobile, le son ne peut démarrer qu'après un premier
   toucher de l'écran : on appelle debloquerAudio() à ce moment-là. */

export function debloquerAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  ctx = new (window.AudioContext || window.webkitAudioContext)();

  gainMaitre = ctx.createGain();
  gainMaitre.gain.value = mute ? 0 : 1;
  gainMaitre.connect(ctx.destination);

  gainMusique = ctx.createGain();
  gainMusique.gain.value = 0.32;
  gainMusique.connect(gainMaitre);

  gainSons = ctx.createGain();
  gainSons.gain.value = 0.5;
  gainSons.connect(gainMaitre);

  gainVoix = ctx.createGain();
  gainVoix.gain.value = 0.9;
  gainVoix.connect(gainMaitre);

  chargerM4a();
}

// Télécharge et décode les 3 enregistrements
async function chargerM4a() {
  const fichiers = {
    rabbitMan: 'assets/rabbit-man.m4a',
    gameOver: 'assets/game-over.m4a',
    winner: 'assets/you-are-the-winner.m4a',
  };
  for (const [nom, url] of Object.entries(fichiers)) {
    try {
      const reponse = await fetch(url);
      const donnees = await reponse.arrayBuffer();
      m4a[nom] = await ctx.decodeAudioData(donnees);
      // Si quelqu'un attendait ce son, on le joue maintenant !
      if (m4aEnAttente && m4aEnAttente.nom === nom) {
        const attente = m4aEnAttente;
        m4aEnAttente = null;
        jouerM4a(attente.nom, attente.enBoucle);
      }
    } catch (erreur) {
      console.warn('Impossible de charger ' + url, erreur);
    }
  }
}

// Joue un des enregistrements (et coupe la musique pendant ce temps)
export function jouerM4a(nom, enBoucle = false) {
  if (!ctx) return;
  if (!m4a[nom]) {
    // Pas encore chargé : on le jouera dès qu'il sera prêt
    m4aEnAttente = { nom, enBoucle };
    return;
  }
  arreterM4a();
  arreterMusique();
  sourceM4a = ctx.createBufferSource();
  sourceM4a.buffer = m4a[nom];
  sourceM4a.loop = enBoucle;
  sourceM4a.connect(gainVoix);
  sourceM4a.start();
}

export function arreterM4a() {
  m4aEnAttente = null;
  if (sourceM4a) {
    try { sourceM4a.stop(); } catch (e) { /* déjà arrêté */ }
    sourceM4a = null;
  }
}

/* ---------- Le bouton mute ---------- */

export function estMute() { return mute; }

export function basculerMute() {
  mute = !mute;
  localStorage.setItem('rabbitman.mute', mute ? 'oui' : 'non');
  if (gainMaitre) gainMaitre.gain.value = mute ? 0 : 1;
  return mute;
}

/* ---------- Petite aide : jouer une note ----------
   Une note = un oscillateur (la forme de l'onde donne le timbre :
   "square" = son de Game Boy) + une enveloppe de volume. */

function note(frequence, depart, duree, forme = 'square', volume = 0.3, glisseVers = null, sortie = null) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = forme;
  osc.frequency.setValueAtTime(frequence, depart);
  if (glisseVers) osc.frequency.exponentialRampToValueAtTime(glisseVers, depart + duree);
  gain.gain.setValueAtTime(volume, depart);
  gain.gain.exponentialRampToValueAtTime(0.001, depart + duree);
  osc.connect(gain);
  gain.connect(sortie || gainSons);
  osc.start(depart);
  osc.stop(depart + duree + 0.02);
}

// Un "pchhh" de bruit blanc (percussions, craquements, coups)
function bruit(depart, duree, volume = 0.3, frequenceFiltre = 2000, sortie = null) {
  if (!ctx) return;
  const taille = Math.max(1, Math.floor(ctx.sampleRate * duree));
  const tampon = ctx.createBuffer(1, taille, ctx.sampleRate);
  const donnees = tampon.getChannelData(0);
  for (let i = 0; i < taille; i++) donnees[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = tampon;
  const filtre = ctx.createBiquadFilter();
  filtre.type = 'lowpass';
  filtre.frequency.value = frequenceFiltre;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, depart);
  gain.gain.exponentialRampToValueAtTime(0.001, depart + duree);
  source.connect(filtre);
  filtre.connect(gain);
  gain.connect(sortie || gainSons);
  source.start(depart);
}

// Transforme un numéro de note (comme sur un piano) en fréquence
function freq(numeroMidi) {
  return 440 * Math.pow(2, (numeroMidi - 69) / 12);
}

/* ---------- Les bruitages du jeu ---------- */

export const sons = {
  // Petit blip quand Panpan saute
  saut() {
    if (!ctx) return;
    note(300, ctx.currentTime, 0.12, 'square', 0.25, 650);
  },
  // Petit son joyeux qui monte quand on ramasse un bonus
  bonus() {
    if (!ctx) return;
    const t = ctx.currentTime;
    note(freq(76), t, 0.07, 'square', 0.22);
    note(freq(83), t + 0.07, 0.12, 'square', 0.22);
  },
  // Jingle quand on gagne une vie (+1 ♥)
  vie() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [72, 76, 79, 84].forEach((n, i) => note(freq(n), t + i * 0.09, 0.15, 'square', 0.28));
  },
  // "Thwack" du coup de matraque
  matraque() {
    if (!ctx) return;
    const t = ctx.currentTime;
    bruit(t, 0.08, 0.4, 1200);
    note(150, t, 0.09, 'square', 0.3, 60);
  },
  // L'ennemi est assommé (petit son qui tourne)
  assomme() {
    if (!ctx) return;
    const t = ctx.currentTime;
    note(freq(79), t, 0.08, 'triangle', 0.3);
    note(freq(76), t + 0.08, 0.08, 'triangle', 0.3);
    note(freq(72), t + 0.16, 0.16, 'triangle', 0.3);
  },
  // Son descendant quand Panpan meurt
  mort() {
    if (!ctx) return;
    note(500, ctx.currentTime, 0.7, 'sawtooth', 0.3, 60);
  },
  // Craquement d'une plateforme qui casse
  craquement() {
    if (!ctx) return;
    const t = ctx.currentTime;
    bruit(t, 0.15, 0.35, 800);
    bruit(t + 0.1, 0.25, 0.3, 400);
  },
  // Petite fanfare de fin de niveau
  fanfare() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [72, 72, 72, 76, 79, 84];
    const durees = [0.12, 0.12, 0.12, 0.24, 0.24, 0.5];
    let depart = t;
    notes.forEach((n, i) => {
      note(freq(n), depart, durees[i], 'square', 0.3);
      note(freq(n - 12), depart, durees[i], 'triangle', 0.25);
      depart += durees[i];
    });
  },
  // La sirène d'alarme : deux tons qui alternent, comme la police
  sirene(duree = 2.4) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const periode = 0.4; // durée d'un ton
    for (let d = 0; d < duree; d += periode) {
      const haut = Math.round(d / periode) % 2 === 0;
      note(haut ? 660 : 440, t + d, periode, 'square', 0.16);
    }
  },
  // Petit clic pour les menus
  clic() {
    if (!ctx) return;
    note(880, ctx.currentTime, 0.05, 'square', 0.2);
  },
};

/* ---------- Les musiques chiptune ----------
   Une musique = une grille de pas (comme une boîte à rythme).
   À chaque pas on peut jouer : une note de mélodie, une note
   de basse, et un coup de percussion. 0 = silence. ---------- */

const MUSIQUES = {
  // Musique joyeuse des niveaux 1 à 3
  niveau: {
    bpm: 132,
    melodie: [76, 0, 79, 0, 84, 0, 79, 0, 76, 0, 79, 0, 81, 79, 76, 0,
              74, 0, 77, 0, 81, 0, 77, 0, 76, 0, 74, 0, 72, 0, 0, 0],
    basse:   [48, 0, 48, 0, 52, 0, 52, 0, 45, 0, 45, 0, 48, 0, 48, 0,
              50, 0, 50, 0, 53, 0, 53, 0, 43, 0, 43, 0, 48, 0, 48, 0],
    batterie:[1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 2,
              1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 2, 2, 2],
  },
  // Version plus rapide et inquiétante pour le niveau 4
  niveau4: {
    bpm: 160,
    melodie: [76, 0, 76, 0, 77, 0, 76, 0, 74, 0, 74, 0, 76, 0, 72, 0,
              71, 0, 71, 0, 74, 0, 71, 0, 69, 0, 71, 0, 72, 74, 76, 0],
    basse:   [45, 0, 45, 45, 45, 0, 45, 0, 43, 0, 43, 43, 43, 0, 43, 0,
              41, 0, 41, 41, 41, 0, 41, 0, 40, 0, 40, 0, 40, 40, 40, 0],
    batterie:[1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 2,
              1, 0, 2, 0, 1, 0, 2, 0, 1, 2, 1, 2, 1, 2, 2, 2],
  },
  // Musique calme de la salle de surveillance
  surveillance: {
    bpm: 84,
    melodie: [72, 0, 0, 0, 76, 0, 0, 0, 79, 0, 0, 0, 76, 0, 0, 0,
              74, 0, 0, 0, 77, 0, 0, 0, 72, 0, 0, 0, 0, 0, 0, 0],
    basse:   [48, 0, 0, 0, 0, 0, 0, 0, 52, 0, 0, 0, 0, 0, 0, 0,
              50, 0, 0, 0, 0, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0],
    batterie:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
};

let musiqueActuelle = null; // nom de la musique en cours
let minuteur = null;        // le petit réveil qui planifie les notes
let pas = 0;                // à quel pas de la grille on est
let tempsDuPas = 0;         // quand jouer le prochain pas

export function jouerMusique(nom) {
  if (!ctx || musiqueActuelle === nom) return;
  arreterMusique();
  musiqueActuelle = nom;
  pas = 0;
  tempsDuPas = ctx.currentTime + 0.1;
  // Toutes les 25 ms, on planifie les notes des 150 prochaines ms :
  // comme ça la musique ne saccade jamais.
  minuteur = setInterval(() => {
    const musique = MUSIQUES[musiqueActuelle];
    if (!musique) return;
    const dureePas = 60 / musique.bpm / 2; // un pas = une croche
    while (tempsDuPas < ctx.currentTime + 0.15) {
      const i = pas % musique.melodie.length;
      if (musique.melodie[i]) {
        note(freq(musique.melodie[i]), tempsDuPas, dureePas * 0.9, 'square', 0.16, null, gainMusique);
      }
      if (musique.basse[i]) {
        note(freq(musique.basse[i]), tempsDuPas, dureePas * 0.95, 'triangle', 0.3, null, gainMusique);
      }
      if (musique.batterie[i] === 1) {
        bruit(tempsDuPas, 0.05, 0.35, 300, gainMusique);   // grosse caisse
      } else if (musique.batterie[i] === 2) {
        bruit(tempsDuPas, 0.03, 0.15, 6000, gainMusique);  // petit "tss"
      }
      tempsDuPas += dureePas;
      pas++;
    }
  }, 25);
}

export function arreterMusique() {
  if (minuteur) clearInterval(minuteur);
  minuteur = null;
  musiqueActuelle = null;
}
