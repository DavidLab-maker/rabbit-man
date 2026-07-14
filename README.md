# 🐰 Rabbit Man — Panpan le policier lapin

Un jeu de plateforme pour mobile, créé d'après le dessin original de Panpan
(voir `reference-panpan.jpg`).

Panpan est un policier lapin. Quatre loups sont enfermés dans les cellules
de la prison… mais ils s'échappent ! Quand la sirène retentit dans la salle
de surveillance, touche l'écran qui clignote et pars à la poursuite du loup
à travers le parcours. Attrape les 4 loups pour gagner !

## 🎮 Comment jouer

- **Sur téléphone** (en paysage) : utilise les boutons à l'écran
  - ◀ ▶ pour reculer / avancer
  - ⬆ pour sauter
  - 💥 pour donner un coup de matraque
- **Sur ordinateur** : flèches pour bouger, `Espace` pour sauter, `X` pour frapper

### Les règles

- 🥕 Ramasse les carottes, le foin et les salades : **tous les 20 bonus, +1 vie !**
  (le compteur est gardé même si tu recommences le niveau)
- 🦊 Évite les renards, chiens et belettes… ou assomme-les à la matraque !
- 🌉 Attention : les **ponts en bois s'effritent** dès qu'on marche dessus, cours vite !
- 🕳️ Ne tombe pas dans les trous !
- 🐺 Touche le loup au bout du parcours pour lui passer les menottes.
- Les niveaux 3 et 4 ont un **drapeau de mi-parcours** (checkpoint).

## 🛠️ Technique

- HTML5 + Canvas + JavaScript vanilla, **aucun framework, aucun build**.
- Tous les sprites sont dessinés en pixel art dans le code (`js/sprites.js`),
  avec des grilles de lettres transformées en images.
- Musiques chiptune et bruitages générés avec la **Web Audio API** (`js/audio.js`).
- Trois enregistrements spéciaux (`assets/*.m4a`) pour l'écran titre,
  la victoire finale et le game over.
- Progression sauvegardée dans le navigateur (`localStorage`).

## 🚀 Lancer en local

Dans le dossier du projet :

```bash
npx serve
```

puis ouvrir l'adresse affichée (par ex. http://localhost:3000).

> Sans Node.js, n'importe quel serveur de fichiers statiques fait l'affaire
> (le jeu doit être servi en HTTP, pas ouvert en `file://`, à cause des
> modules JavaScript).

## ☁️ Déployer (GitHub + Vercel)

1. Créer le repo GitHub : `gh repo create rabbit-man --public --source . --push`
2. Déployer sur Vercel : `vercel --prod`
   (site statique pur : aucune configuration nécessaire)
3. Ouvrir l'URL fournie par Vercel sur le smartphone, en paysage,
   et éventuellement « Ajouter à l'écran d'accueil » (PWA).

## 📁 Les fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | La page : canvas, boutons tactiles, message d'orientation |
| `style.css` | Plein écran, boutons ≥ 64 px, blocage du zoom/scroll |
| `js/game.js` | La boucle du jeu, la physique, les écrans |
| `js/sprites.js` | Tout le pixel art (Panpan, loups, ennemis, décor) |
| `js/levels.js` | Les 4 parcours, décrits comme des recettes |
| `js/audio.js` | Musiques chiptune, bruitages, enregistrements m4a |
| `js/input.js` | Clavier + boutons tactiles multi-touch |
