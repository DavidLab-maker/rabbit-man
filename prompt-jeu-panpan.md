# Prompt à coller dans Claude Code

---

Crée un jeu de plateforme mobile complet appelé **« Rabbit Man »**, en français, jouable sur smartphone via navigateur, déployé sur GitHub + Vercel. Le héros est un policier lapin nommé **Panpan**.

## Stack technique (imposée)

- **HTML5 + Canvas + JavaScript vanilla**, sans framework ni étape de build. Un site statique pur, directement déployable sur Vercel.
- Fichiers : `index.html`, `style.css`, `game.js` (découpe en modules ES si nécessaire : `sprites.js`, `levels.js`, `audio.js`).
- **Aucun asset externe** (pas d'images ni de fichiers audio à télécharger) : tous les sprites sont dessinés en pixel art via des matrices de pixels rendues sur canvas, tous les sons sont générés avec la **Web Audio API**.
- Progression sauvegardée en `localStorage` (niveaux réussis).
- Un fichier de référence `reference-panpan.jpg` est présent dans le dossier : c'est le dessin original du personnage, inspire-toi de sa silhouette.

## Concept du jeu

Panpan est un policier lapin. Des prisonniers (des **loups**) sont enfermés dans 4 cellules numérotées de 1 à 4. Quand un loup s'échappe, une **sirène d'alarme retentit** et Panpan doit parcourir le chemin portant le même numéro que la cellule pour rattraper le loup au bout du parcours.

## Écran d'accueil : la salle de surveillance

- Décor : une salle de contrôle avec **4 écrans de caméras de surveillance**, chacun montrant une cellule numérotée (1 à 4) avec un loup à l'intérieur.
- Au lancement (ou après un niveau), un loup s'échappe d'une cellule **au hasard parmi les niveaux non encore réussis** : son écran clignote en rouge, on voit le loup sortir de la cellule (petite animation), et la sirène retentit (son de sirène de police en Web Audio API, deux tons alternés).
- Le joueur touche l'écran qui clignote pour lancer le parcours correspondant. Les niveaux déjà réussis affichent une coche verte et restent rejouables.
- Titre du jeu en pixel art + bouton « Jouer ».

## Gameplay des parcours (niveaux 1 à 4)

Side-scroller linéaire type Mario Bros, défilement horizontal, physique simple (gravité + saut à hauteur fixe).

**Contrôles tactiles** (boutons à l'écran, gros et espacés, minimum 64 px) :
- ◀ **Reculer** (bas gauche)
- ▶ **Avancer** (bas gauche, à côté)
- ⬆ **Sauter** (bas droite)
- 💥 **Frapper** (bas droite, à côté de sauter) : coup de matraque
Support aussi du clavier (flèches + espace + X) pour tester sur desktop. Multi-touch obligatoire (avancer + sauter ou frapper simultanément).

**Éléments de parcours :**
- **Trous** : tomber dedans = mort.
- **Bonus à ramasser** : des **carottes**, du **foin** et des **salades** disséminés sur le parcours (au sol, sur les plateformes, parfois en hauteur pour récompenser les sauts risqués). **Tous les 20 bonus ramassés, Panpan gagne une vie supplémentaire** (jingle + « +1 ♥ » qui s'affiche). Le compteur de bonus persiste entre les tentatives d'un même niveau.
- **Ennemis mobiles** : **renards, chiens, belettes** qui patrouillent en aller-retour. Contact = mort. Chaque type a une apparence et une vitesse différentes. **Panpan peut les assommer d'un coup de matraque** à courte portée (bouton Frapper) : l'ennemi tombe KO avec des étoiles qui tournent au-dessus de la tête, puis disparaît. Animation de swing courte — il faut oser s'approcher, sauter par-dessus reste souvent plus sûr.
- **Ponts en bois** et **ponts en pierre** à traverser au-dessus de vides.
- **Mécanique clé — le chemin se casse !** : sur certaines sections (notamment les ponts en bois), les plateformes s'effritent et tombent ~0,6 s après que Panpan a marché dessus. Il faut donc aller vite. Effet visuel de tremblement avant la chute.
- **Fin de niveau** : le loup en fuite est visible au bout du parcours ; le toucher = victoire (animation : Panpan lui passe les menottes), retour à la salle de surveillance.

**Vies et mort :** 3 vies par tentative. Mort = petite animation (Panpan tourne et tombe) + son descendant, respawn au début du niveau (ou au checkpoint de mi-parcours pour les niveaux 3 et 4). Plus de vies = retour à la salle de surveillance.

**Difficulté progressive :** niveau 1 court et facile (peu d'ennemis, pas de chemin qui casse), jusqu'au niveau 4 long et tendu (ennemis rapides, longues sections de ponts qui s'effondrent, trous larges).

**Fin du jeu :** quand les 4 loups sont rattrapés, écran de victoire festif (confettis pixel art, les 4 loups derrière les barreaux, Panpan qui salue).

## Le personnage Panpan (pixel art, fidèle au dessin de référence)

- Lapin blanc, **deux longues oreilles droites** qui dépassent de sa **casquette de policier bleue**.
- **Uniforme bleu** (chemise + pantalon), **badge/étoile** sur la poitrine, ceinture.
- Il tient une **matraque** (batte) dans une main.
- Sprite d'environ 16×24 pixels, agrandi sans lissage (`imageSmoothingEnabled = false`) pour un rendu pixel art net.
- Animations : idle (2 frames), course (4 frames, oreilles qui bougent), saut (1 frame), mort (1 frame).
- Les loups : pixel art gris, tenue de prisonnier rayée noir et blanc. Renards (roux), chiens (marron), belettes (beige, petites et rapides).

## Direction artistique

- Pixel art coloré et lisible, ambiance cartoon gaie (c'est un jeu pour enfant) : ciel bleu, collines vertes, prison en pierre grise au début de chaque niveau.
- Palette limitée (~16 couleurs) cohérente sur tout le jeu.
- HUD : numéro du niveau, vies restantes (petites têtes de Panpan), compteur de bonus (icône carotte, progression vers la prochaine vie : « 13/20 »), distance restante jusqu'au loup.

## Sons et musique (Web Audio API uniquement)

- **Musique de fond chiptune 8-bit en boucle** pendant les niveaux, générée en Web Audio (mélodie simple + basse carrée + percussion bruit blanc). Une variation plus tendue pour le niveau 4. Musique calme différente dans la salle de surveillance.
- Bruitages : sirène d'alarme (évasion), saut (blip court), bonus ramassé (petit son joyeux montant), vie gagnée (jingle), coup de matraque (« thwack »), ennemi assommé, mort (son descendant), plateforme qui casse (craquement), victoire de niveau (petite fanfare), victoire finale.
- Bouton mute visible en jeu (coupe musique et bruitages).

## Contraintes mobile

- **Orientation paysage** : si le téléphone est en portrait, afficher un message « Tourne ton téléphone 🔄 » en plein écran.
- Canvas responsive plein écran, ratio préservé, `requestAnimationFrame`, cible 60 fps.
- Bloquer le scroll, le zoom pinch, le double-tap zoom et la sélection de texte (`touch-action: none`, meta viewport adaptée).
- `manifest.json` minimal pour pouvoir ajouter le jeu à l'écran d'accueil.

## Déploiement

1. Initialise un repo git, crée un `README.md` (description du jeu, comment jouer, comment lancer en local avec `npx serve`).
2. Crée le repo GitHub avec `gh repo create` (demande-moi le nom souhaité et public/privé avant).
3. Déploie sur Vercel avec `vercel --prod` (demande-moi confirmation avant chaque déploiement).
4. Donne-moi l'URL finale à ouvrir sur mon smartphone.

## Méthode de travail

- Commence par me montrer un plan rapide (structure des fichiers + découpage des étapes), puis développe.
- Fais des commits atomiques à chaque étape fonctionnelle.
- Teste le rendu localement avant de déployer.
- Le code doit être commenté simplement : ce projet servira aussi à montrer à un enfant comment un jeu est fabriqué.

---
