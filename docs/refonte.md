# MagicStatsUpgrade — structuration de la refonte

L’app actuelle est une **refonte**. On reconstruit l’expérience (menu Magic, écrans), on ne porte pas l’ancienne base de code.

## Principes

- **Ne pas réutiliser** l’ancienne app sauf ce qui est vraiment structurant.
- **Structurant = le format d’export JSON actuel.** L’import doit accepter un fichier du même type que `magicstats-export-*.json` (`app`, `formatVersion`, `schemaVersion`, `players`, `decks`, `games` + `participants`).
- Le fichier `magicstats-export-2026-08-19.json` n’est qu’un **exemple** (5 joueurs, 8 decks, 1 partie). L’import ne doit **pas** être câblé dessus : n’importe quel export valide du même format doit passer.
- **BMAD : interdit.** Aucun dossier `_bmad`, `_bmad-output`, agent, epic BMAD ou process associé dans ce projet.

## Cible produit

Petit groupe (3–5), Commander FFA, offline-first, saisie d’une partie en ≤ 2 minutes.

## Contrat d’import (seul héritage structurant)

Un fichier valide ressemble à :

```json
{
  "app": "MagicStats",
  "formatVersion": 1,
  "schemaVersion": 3,
  "exportedAt": "ISO-8601",
  "players": [{ "id": 1, "name": "...", "createdAt": "..." }],
  "decks": [{ "id": 1, "commanderName": "...", "commanderImageUrl": "...", "playerId": 1, "createdAt": "..." }],
  "games": [{
    "id": 1,
    "datePlayed": "YYYY-MM-DD",
    "winnerPlayerId": 1,
    "createdAt": "...",
    "participants": [{ "id": 1, "gameId": 1, "playerId": 1, "deckId": 1 }]
  }]
}
```

À l’import, **préserver les IDs** du fichier (sinon joueurs / decks / parties se décrochent).

Règles métier à réimplémenter (pas à copier depuis l’ancien code) :

- Partie : 3 à 5 joueurs
- Un deck par joueur dans une partie
- Le gagnant est l’un des participants

## Navigation

Menu actuel : Statistiques, Joueurs, Decks, Import/Export.

**À ajouter : Parties** (historique + saisie). Sans ça, on ne peut plus enregistrer de soirées.

| Écran | Rôle |
|-------|------|
| Import/Export | Lire / écrire le format JSON ci-dessus |
| Joueurs | Liste + CRUD |
| Decks | Liste (image commander, propriétaire) |
| Parties | Historique + formulaire |
| Statistiques | W / L / Total / Winrate (decks et joueurs), portrait + web |

## Ce qu’on écrit from scratch

- Persistence, services, stores, UI
- Écrans, navigation menu
- Import / export autour du contrat JSON
- Scryfall plus tard, si besoin, **réécrit** ici (pas un copier-coller)

**On ne copie pas :** Paper, lock paysage, tabs Home/Players/Decks/History, stores Zustand de l’ancienne app, services SQLite d’origine, BMAD.

## Ordre d’implémentation

1. Persistence maison + **import** d’un JSON `formatVersion: 1` (preuve : un fichier exemple s’affiche)
2. CRUD Joueurs
3. CRUD Decks
4. Parties (saisie + historique)
5. Statistiques
6. Export dans le **même** format

## Hors projet

- BMAD (toute la chaîne)
- Cloud / sync
- Stores publics
- Nouveau schéma JSON tant que `formatVersion: 1` suffit
