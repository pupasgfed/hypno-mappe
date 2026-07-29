# Carto Hypnose

Carte interactive des événements liés à l'hypnose en France (ateliers, sorties, spectacles). Application statique sans backend, administrée via Decap CMS.

## Stack

- **Frontend** : HTML/CSS/JS vanilla + Leaflet.js + Leaflet.markercluster
- **Tuiles** : OpenStreetMap (gratuit, pas de clé API)
- **Données** : un fichier JSON par événement dans `data/events/`, compilés en un seul `data/events.geojson` par un script de build
- **Admin** : Decap CMS sur `/admin/`, authentification via GitHub OAuth
- **CI/CD** : GitHub Actions (validation + build + déploiement GitHub Pages)
- **Hébergement** : GitHub Pages (gratuit)

## Structure du projet

```
/
├── index.html                  # Page principale (carte + liste)
├── admin/
│   ├── index.html              # Point de montage Decap CMS
│   └── config.yml              # Configuration Decap CMS
├── css/style.css               # Styles
├── js/
│   ├── main.js                 # Point d'entrée, orchestration
│   ├── data-loader.js          # Fetch + parse du events.geojson
│   ├── map.js                  # Initialisation Leaflet + clustering
│   └── filters.js              # Logique de filtrage catégorie/date
├── data/
│   ├── events/                 # Un fichier JSON par événement (édité par Decap)
│   ├── events.geojson          # Généré par le script de build (ne pas éditer)
│   └── schema.json             # JSON Schema de validation d'un événement
├── scripts/
│   └── build-geojson.js        # Agrège data/events/*.json → events.geojson
├── .github/workflows/
│   └── validate-and-deploy.yml # CI/CD
└── package.json
```

## Développement local

```bash
npm install
npm run dev
```

Le site est servi sur `http://localhost:5173`.

Pour régénérer le fichier `events.geojson` après avoir ajouté/modifié un fichier dans `data/events/` :

```bash
npm run build:geojson
```

## Ajouter un événement

### Via Decap CMS (recommandé)

1. Aller sur `/admin/`
2. Se connecter avec GitHub (voir configuration ci-dessous)
3. Cliquer sur "Nouvel événement"
4. Remplir le formulaire et publier

Decap CMS crée un commit Git avec le nouveau fichier JSON, ce qui déclenche automatiquement le build et le redéploiement.

### Manuellement

1. Créer un fichier `.json` dans `data/events/`
2. Suivre le schéma défini dans `data/schema.json`
3. Lancer `npm run build:geojson` pour régénérer le GeoJSON

## Configuration de l'authentification Decap CMS (GitHub OAuth)

Decap CMS utilise GitHub OAuth pour l'authentification. Voici les étapes à effectuer une fois le projet déployé sur GitHub :

### 1. Créer une GitHub OAuth App

1. Aller sur https://github.com/settings/applications/new
2. Remplir le formulaire :
   - **Application name** : Carto Hypnose Admin
   - **Homepage URL** : `https://<votre-username>.github.io/cartohypnose/`
   - **Authorization callback URL** : `https://api.decapaccess.com/callback`
3. Noter le **Client ID** et générer un **Client Secret**

### 2. Enregistrer l'app sur Decap Access

1. Aller sur https://decapaccess.com/add
2. Entrer le Client ID et Client Secret de votre OAuth App
3. Cela active le proxy OAuth pour Decap CMS

### 3. Mettre à jour la configuration

Dans `admin/config.yml`, remplacer :

```yaml
backend:
  name: github
  repo: owner/cartohypnose  # ← remplacer par votre repo
  branch: main
  app_id: ""  # ← remplacer par votre Client ID
```

### 4. Restreindre l'accès

L'accès est restreint aux collaborateurs du repo GitHub. Seules les personnes ajoutées comme collaborateurs sur le dépôt peuvent se connecter à Decap CMS et gérer les événements.

## Pipeline CI/CD

À chaque push sur `main` (y compris les commits créés par Decap CMS) :

1. **Validation** : chaque fichier `data/events/*.json` est validé contre `schema.json` (champs requis, types, enum, coordonnées valides, date_end > date_start)
2. **Build** : `scripts/build-geojson.js` régénère `data/events.geojson`
3. **Déploiement** : le site statique est déployé sur GitHub Pages

Si un fichier source est invalide, le déploiement est bloqué avec un message d'erreur clair.

## Schéma d'un événement

```json
{
  "id": "evt-001",
  "title": "Atelier d'initiation à l'hypnose",
  "category": "atelier",
  "date_start": "2026-08-15T14:00:00+02:00",
  "date_end": "2026-08-15T17:00:00+02:00",
  "lat": 48.8566,
  "lng": 2.3522,
  "city": "Paris",
  "description": "Description courte (max 280 caractères)",
  "link": "https://example.com/billetterie",
  "status": "published"
}
```

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | oui | Identifiant unique |
| `title` | string | oui | Titre (max 200 caractères) |
| `category` | enum | oui | `atelier`, `sortie`, `spectacle`, `autre` |
| `date_start` | ISO 8601 | oui | Date et heure de début |
| `date_end` | ISO 8601 \| null | non | Date et heure de fin |
| `lat` | number | oui | Latitude (-90 à 90) |
| `lng` | number | oui | Longitude (-180 à 180) |
| `city` | string | oui | Ville |
| `description` | string | oui | Description (max 280 caractères) |
| `link` | string \| null | non | Lien externe |
| `status` | enum | oui | `published` ou `draft` |
