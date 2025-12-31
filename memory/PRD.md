# Hub Blind Tests QWERTYS - PRD

## Original Problem Statement
Application de gestion des "Tests Site" et "Tests Ligne" pour le suivi des partenaires. Permet de gérer les programmes, les tests, les alertes et de générer des rapports (PDF, Excel, PowerPoint).

## Core Features
- **Gestion des Partenaires** : CRUD complet avec programmes associés
- **Tests Site** : Tests de réservation en ligne avec vérification des remises
- **Tests Ligne** : Tests téléphoniques avec évaluation de l'accueil
- **Alertes** : Système d'alertes groupées avec points d'attention
- **Exports** : PDF (rapports d'incidents), Excel (bilans), PowerPoint (présentations)
- **Dashboard IA** : Insights générés par Gemini 2.5 Flash

## Technology Stack
- **Backend**: FastAPI + Motor (async MongoDB) + Python
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Database**: MongoDB
- **Exports**: ReportLab (PDF), openpyxl (Excel), python-pptx (PowerPoint)
- **AI**: Google Gemini 2.5 Flash (Insights)

---

## What's Been Implemented

### Session 31/12/2025

#### Bug Fixes Completed ✅
1. **PPTX Bilan Partenaire Multi-Programmes** (P0 - CRITICAL)
   - **Problème**: Le rapport PPTX ne générait que les slides du premier programme pour les partenaires avec plusieurs programmes
   - **Cause**: Erreur d'indentation dans `server.py` (lignes 4011-4136) - les blocs de création des slides 2 et 3 étaient incorrectement imbriqués
   - **Solution**: Correction de l'indentation pour que toutes les slides soient créées dans la boucle `for programme in programmes:`
   - **Validation**: Test avec Azureva (7 programmes) → 21 slides générées correctement

2. **PDF Text Overflow - Rapports d'Incidents** (P0)
   - **Problème**: Le texte long dans les points d'attention débordait des cellules du tableau PDF
   - **Solution**: Ajout d'un `cell_style` avec `wordWrap='CJK'` pour le retour à la ligne automatique
   - **Fichier**: `backend/server.py` lignes 1741-1751
   - **Validation**: PDF avec texte long s'affiche correctement sur 2 pages

#### Previously Completed Features ✅
- Alertes groupées (plusieurs points d'attention par alerte)
- Avertissement temps réel pour tests en double
- Export par Programme (en plus de Partenaire)
- Colonnes "Objet" et "% remise" dans l'export Excel
- Login insensible à la casse
- Migration CSV → Excel formaté (.xlsx)
- UI responsive pour InsightsIA
- Tables compactes pour TestsSite/TestsLigne

---

## Prioritized Backlog

### P0 (Critical) - Completed ✅
- [x] Fix PPTX multi-programmes
- [x] Fix PDF text overflow

### P1 (High Priority) - À faire
- [ ] **Validation stricte des doublons**: Ajouter blocage côté serveur sur `POST /tests-site` et `POST /tests-ligne` (retourner 409 si doublon)

### P2 (Medium Priority)
- [ ] **Pagination API**: Implémenter sur `/tests-site`, `/tests-ligne`, `/alertes`

### P3 (Low Priority)
- [ ] **Messagerie**: Envoi d'emails aux partenaires externes
- [ ] **Indicateur To-Do List**: Dans le formulaire de création de test

---

## Key API Endpoints
- `GET /api/export/bilan-partenaire-ppt` - Export PPTX (fixé)
- `GET /api/export-alerte-report/{test_id}` - Export PDF (fixé)
- `GET /api/check-duplicate-test` - Vérification doublons (réel-temps)
- `POST /api/tests-site`, `POST /api/tests-ligne` - Création de tests

## Test Credentials
- **Admin**: admin@hubblindtests.com / admin123
- **Agent**: test.agent@example.com / agent123

## Test Files
- `/app/tests/test_export_fixes.py` - Tests pour les corrections PPTX et PDF
