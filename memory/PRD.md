# Hub Blind Tests QWERTYS - PRD

## Original Problem Statement
Application de gestion des "Tests Site" et "Tests Ligne" pour le suivi des partenaires. Permet de gérer les programmes, les tests, les alertes et de générer des rapports (PDF, Excel, PowerPoint).

## Core Features
- **Gestion des Partenaires** : CRUD complet avec programmes associés
- **Tests Site** : Tests de réservation en ligne avec vérification des remises
- **Tests Ligne** : Tests téléphoniques avec évaluation de l'accueil
- **Alertes** : Système d'alertes groupées avec points d'attention + Configuration marge d'erreur
- **Exports** : PDF (rapports d'incidents), Excel (bilans), PowerPoint (présentations)
- **Dashboard IA** : Insights générés par Gemini 2.5 Flash
- **Identifiants Mystère** : Gestion des profils de "mystery shoppers"

## Technology Stack
- **Backend**: FastAPI + Motor (async MongoDB) + Python
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Database**: MongoDB
- **Exports**: ReportLab (PDF), openpyxl (Excel), python-pptx (PowerPoint)
- **AI**: Google Gemini 2.5 Flash (Insights)

---

## What's Been Implemented

### Session 16/01/2026

#### Features Completed ✅
1. **Configuration Marge d'Erreur sur page Alertes (P0)**
   - UI avec bouton "Configuration" et popover sur la page Alertes
   - Champ pour modifier la marge de tolérance (0-100%)
   - Explication contextuelle intégrée
   - API `/api/settings` GET/PUT fonctionnelle

2. **Backend API Pagination** (P1 - Backend Complete)
   - Endpoints `/partenaires`, `/tests-site`, `/tests-ligne`, `/alertes` supportent pagination
   - Paramètres: `?paginate=true&page={page}&limit={limit}`
   - Compatible avec les appels existants (backward compatible)

#### Previously Completed ✅
- Rôle Super Admin et permissions corrigés
- Dashboard agent amélioré (progression mensuelle + messages motivants)
- Fonctionnalité "Identifiants Mystère" complète
- Validation stricte des doublons de tests (erreur 409)
- Champ "Remarques importantes" dans les tests et exports
- Indicateur de remise attendue dans les formulaires

### Session 31/12/2025

#### Bug Fixes Completed ✅
1. **PPTX Bilan Partenaire Multi-Programmes**
2. **PDF Text Overflow - Rapports d'Incidents**
3. **Export Excel formaté (.xlsx)**

---

## Prioritized Backlog

### P0 (Critical) - Completed ✅
- [x] Fix PPTX multi-programmes
- [x] Fix PDF text overflow
- [x] Configuration marge d'erreur sur page Alertes

### P1 (High Priority) - En cours
- [x] Validation stricte des doublons (côté serveur)
- [x] Backend API pagination
- [x] **Frontend Pagination TestsSite et TestsLigne** - Implémenté avec composant TablePagination réutilisable

### P2 (Medium Priority)
- [ ] **Frontend Pagination Alertes et Partenaires** - À implémenter
- [ ] **Cache côté client**: React Query ou Context pour données peu changeantes

### P3 (Low Priority)
- [ ] **Messagerie**: Envoi d'emails aux partenaires externes
- [ ] **Indicateur To-Do List**: Dans le formulaire de création de test

---

## Key API Endpoints
- `GET, PUT /api/settings` - Configuration globale (marge alerte remise)
- `GET, POST, PUT, DELETE /api/identifiants` - Profils mystery shoppers
- `GET /api/partenaires?paginate=true&page=1&limit=20` - Pagination partenaires
- `GET /api/tests-site?paginate=true&page=1&limit=20` - Pagination tests site
- `GET /api/tests-ligne?paginate=true&page=1&limit=20` - Pagination tests ligne
- `GET /api/alertes?paginate=true&page=1&limit=20` - Pagination alertes
- `POST /api/tests-site`, `POST /api/tests-ligne` - Création avec validation doublons (409)

## Test Credentials
- **Super Admin**: mkoob@qwertys.fr / admin123
- **Admin**: admin@hubblindtests.com / admin123
- **Agent**: test.agent@example.com / agent123

## Test Files
- `/app/tests/test_export_fixes.py` - Tests pour les corrections PPTX et PDF
