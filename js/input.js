/* ============================================================
   input.js — Les contrôles du jeu
   ------------------------------------------------------------
   On écoute deux choses :
   1. Le clavier (pour jouer sur ordinateur)
   2. Les boutons tactiles à l'écran (pour jouer sur téléphone)
   Le reste du jeu regarde simplement l'objet "touches" pour
   savoir quels boutons sont enfoncés en ce moment.
   ============================================================ */

// L'état des boutons : true = enfoncé, false = relâché
export const touches = {
  gauche: false,
  droite: false,
  sauter: false,
  frapper: false,
};

// "vientDappuyer" : vrai seulement à l'instant où on appuie
// (utile pour le saut : rester appuyé ne fait pas re-sauter)
export const vientDappuyer = {
  sauter: false,
  frapper: false,
};

// À appeler à la fin de chaque image du jeu pour remettre à zéro
export function oublierAppuis() {
  vientDappuyer.sauter = false;
  vientDappuyer.frapper = false;
}

function presser(nom) {
  if (!touches[nom] && (nom === 'sauter' || nom === 'frapper')) {
    vientDappuyer[nom] = true;
  }
  touches[nom] = true;
}

function relacher(nom) {
  touches[nom] = false;
}

/* ---------- Le clavier (ordinateur) ---------- */

const CLAVIER = {
  'ArrowLeft': 'gauche',
  'ArrowRight': 'droite',
  'ArrowUp': 'sauter',
  ' ': 'sauter',
  'x': 'frapper',
  'X': 'frapper',
};

window.addEventListener('keydown', (e) => {
  const nom = CLAVIER[e.key];
  if (nom) {
    e.preventDefault();
    if (!e.repeat) presser(nom);
  }
});

window.addEventListener('keyup', (e) => {
  const nom = CLAVIER[e.key];
  if (nom) relacher(nom);
});

/* ---------- Les boutons tactiles (téléphone) ----------
   On utilise les évènements "pointer" : chaque doigt a son
   propre identifiant, donc on peut avancer ET sauter en
   même temps (multi-touch). */

function brancherBouton(idBouton, nom) {
  const bouton = document.getElementById(idBouton);
  // Combien de doigts sont posés sur CE bouton en ce moment
  let doigts = 0;

  bouton.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    doigts++;
    bouton.classList.add('presse');
    presser(nom);
  });

  const fin = (e) => {
    e.preventDefault();
    doigts = Math.max(0, doigts - 1);
    if (doigts === 0) {
      bouton.classList.remove('presse');
      relacher(nom);
    }
  };
  bouton.addEventListener('pointerup', fin);
  bouton.addEventListener('pointercancel', fin);
  bouton.addEventListener('pointerleave', fin);

  // On bloque le menu contextuel (appui long sur mobile)
  bouton.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function installerControles() {
  brancherBouton('btn-gauche', 'gauche');
  brancherBouton('btn-droite', 'droite');
  brancherBouton('btn-sauter', 'sauter');
  brancherBouton('btn-frapper', 'frapper');
}
