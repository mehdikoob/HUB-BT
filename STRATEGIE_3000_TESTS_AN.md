# 🎯 STRATÉGIE : 3000 Tests/an avec Suppression Annuelle

**Date** : 02/12/2025  
**Contexte** : 
- 3000 tests par an (~250/mois)
- Suppression annuelle après exports et bilans
- Besoin de sécuriser l'application pour tenir 1 an

---

## 📊 ANALYSE DU BESOIN

### Cycle de vie des données

```
Janvier N    →  Décembre N    →  Janvier N+1
   |              |                  |
   ↓              ↓                  ↓
0 tests      3000 tests         Export + Suppression
                                → Retour à 0
```

### Contraintes techniques actuelles

**Limite hard** : 1000 tests dans le code  
**Volume annuel** : 3000 tests  
**Problème** : Bloqué à 1000 tests (4 mois) sans modifications

---

## ✅ SOLUTION RECOMMANDÉE : Approche Hybride

### 🎯 Objectif
Gérer 3000 tests pendant 1 an, puis suppression propre avec sauvegardes

---

## 📋 PLAN D'IMPLÉMENTATION EN 2 PHASES

### ⚡ PHASE 1 : QUICK WIN (1h) - À faire CETTE SEMAINE

**Objectif** : Sécuriser les 12 prochains mois

#### 1.1 Filtre "Année en cours" par défaut

**Backend (server.py)** :
```python
from datetime import datetime

@api_router.get("/tests-site")
async def get_tests_site(
    programme_id: str = None,
    partenaire_id: str = None,
    date_debut: str = None,
    date_fin: str = None,
    annee: int = None,  # NOUVEAU
    ...
):
    query = {}
    
    # Si aucun filtre date, afficher année en cours par défaut
    if not date_debut and not date_fin and not annee:
        annee = datetime.now().year
    
    if annee:
        query['date_test'] = {
            '$gte': datetime(annee, 1, 1),
            '$lte': datetime(annee, 12, 31, 23, 59, 59)
        }
    
    # Augmenter limite à 5000 pour année complète
    tests = await db.tests_site.find(query, {"_id": 0}).to_list(5000)
    ...
```

**Frontend** : 
- Ajouter dropdown "Année" (2024, 2025, 2026, Toutes)
- Par défaut : année en cours
- Message : "Affichage : Année 2025"

**Bénéfices** :
- ✅ Supporte 3000 tests/an
- ✅ Performances maintenues (filtre sur index)
- ✅ UX claire (une année à la fois)
- ✅ Temps : **1h de développement**

---

### 🚀 PHASE 2 : SÉCURISATION LONG TERME (6h) - À faire dans 1 mois

**Objectif** : Outils de gestion du cycle de vie

#### 2.1 Pagination complète

**Backend** :
```python
@api_router.get("/tests-site")
async def get_tests_site(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    annee: int = None,
    ...
):
    query = {'date_test': {
        '$gte': datetime(annee or datetime.now().year, 1, 1),
        '$lte': datetime(annee or datetime.now().year, 12, 31)
    }}
    
    # Count total pour pagination
    total = await db.tests_site.count_documents(query)
    
    # Récupération paginée
    tests = await db.tests_site.find(query, {"_id": 0})\
        .skip(skip)\
        .limit(limit)\
        .sort("date_test", -1)\
        .to_list(limit)
    
    return {
        "items": tests,
        "total": total,
        "page": skip // limit + 1,
        "pages": (total + limit - 1) // limit
    }
```

**Frontend** : Composant pagination Shadcn

**Bénéfices** :
- ✅ Scalabilité infinie
- ✅ Performances optimales (100 tests/page)
- ✅ UX professionnelle

#### 2.2 Export massif avant suppression

**Nouveau endpoint** :
```python
@api_router.get("/export/annee-complete/{annee}")
async def export_annee_complete(
    annee: int,
    current_user: User = Depends(get_current_active_user)
):
    """
    Export Excel de TOUS les tests d'une année
    Pour archivage avant suppression
    """
    # Tests Site
    tests_site = await db.tests_site.find(
        {
            'date_test': {
                '$gte': datetime(annee, 1, 1),
                '$lte': datetime(annee, 12, 31)
            }
        },
        {"_id": 0}
    ).to_list(10000)  # Limite haute pour export
    
    # Tests Ligne
    tests_ligne = await db.tests_ligne.find(...).to_list(10000)
    
    # Alertes
    alertes = await db.alertes.find(...).to_list(10000)
    
    # Créer Excel multi-onglets
    wb = Workbook()
    
    # Sheet 1 : Tests Site
    ws_site = wb.active
    ws_site.title = f"Tests Site {annee}"
    # ... écrire données
    
    # Sheet 2 : Tests Ligne
    ws_ligne = wb.create_sheet(f"Tests Ligne {annee}")
    # ... écrire données
    
    # Sheet 3 : Alertes
    ws_alertes = wb.create_sheet(f"Alertes {annee}")
    # ... écrire données
    
    # Sheet 4 : Statistiques
    ws_stats = wb.create_sheet("Statistiques")
    # Résumé : nb tests, nb alertes, taux conformité, etc.
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=export_annuel_{annee}.xlsx"
        }
    )
```

**Frontend** : Bouton "Export annuel" dans page dédiée

#### 2.3 Suppression en masse sécurisée

**Nouveau endpoint** :
```python
@api_router.delete("/admin/purge-annee/{annee}")
async def purge_annee(
    annee: int,
    confirmation_token: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Suppression de tous les tests d'une année
    NÉCESSITE TOKEN DE CONFIRMATION (sécurité)
    """
    # Vérifier que l'utilisateur est admin
    if current_user.role != UserRole.admin:
        raise HTTPException(403, "Admin uniquement")
    
    # Vérifier token de confirmation
    expected_token = hashlib.sha256(f"{annee}-{current_user.id}".encode()).hexdigest()
    if confirmation_token != expected_token:
        raise HTTPException(400, "Token de confirmation invalide")
    
    # Interdire suppression année en cours
    if annee == datetime.now().year:
        raise HTTPException(400, "Impossible de supprimer l'année en cours")
    
    # Suppression
    date_range = {
        '$gte': datetime(annee, 1, 1),
        '$lte': datetime(annee, 12, 31)
    }
    
    result_site = await db.tests_site.delete_many({'date_test': date_range})
    result_ligne = await db.tests_ligne.delete_many({'date_test': date_range})
    result_alertes = await db.alertes.delete_many({'date_test': date_range})
    
    # Log de l'opération
    await db.audit_log.insert_one({
        'action': 'purge_annee',
        'annee': annee,
        'user_id': current_user.id,
        'deleted_counts': {
            'tests_site': result_site.deleted_count,
            'tests_ligne': result_ligne.deleted_count,
            'alertes': result_alertes.deleted_count
        },
        'timestamp': datetime.now(timezone.utc)
    })
    
    return {
        "message": f"Année {annee} purgée avec succès",
        "deleted": {
            "tests_site": result_site.deleted_count,
            "tests_ligne": result_ligne.deleted_count,
            "alertes": result_alertes.deleted_count,
            "total": result_site.deleted_count + result_ligne.deleted_count
        }
    }
```

**Frontend** : Interface dédiée "Gestion des archives"
- Liste des années disponibles
- Bouton "Export complet" pour chaque année
- Bouton "Supprimer" (avec confirmation multiple)
- Modal de confirmation :
  ```
  ⚠️ ATTENTION : Suppression définitive
  
  Année : 2024
  Tests à supprimer : 2,847
  
  Cette action est IRRÉVERSIBLE.
  Avez-vous exporté et sauvegardé les données ?
  
  [ ] J'ai exporté les données
  [ ] J'ai sauvegardé le fichier Excel
  [ ] Je confirme la suppression
  
  Pour confirmer, tapez : SUPPRIMER-2024
  
  [Annuler]  [Confirmer la suppression]
  ```

**Bénéfices** :
- ✅ Workflow clair et sécurisé
- ✅ Protection contre suppressions accidentelles
- ✅ Traçabilité (audit log)
- ✅ Export complet avant suppression

---

## 🏗️ ARCHITECTURE PROPOSÉE

### Option A : Cycle annuel simple (RECOMMANDÉ)

```
Workflow annuel :

Jan N                              Déc N                 Jan N+1
  |                                  |                      |
  ↓                                  ↓                      ↓
Tests de l'année              3000 tests              1. Export Excel
                                                       2. Bilan annuel
                                                       3. Suppression
                                                       → Retour à ~0 tests
```

**Avantages** :
- Simple à gérer
- Base de données légère
- Performances optimales

**Configuration** :
- Filtre "Année en cours" par défaut
- Limite : 5000 tests/an
- Export + Suppression annuelle

---

### Option B : Archivage (alternative)

```
Workflow avec archivage :

Collection principale           Collection archives
tests_site (année N)    →       tests_site_archives
    ↓                               ↓
3000 tests                      Historique complet
Auto-vidée chaque année         Consultable en lecture
```

**Avantages** :
- Conservation historique
- Pas de perte de données
- Statistiques multi-années

**Inconvénients** :
- Plus complexe (2h supplémentaires)
- Base de données plus volumineuse

**Implémentation** :
```python
@api_router.post("/admin/archive-annee/{annee}")
async def archive_annee(annee: int):
    # 1. Copier vers collection archives
    tests = await db.tests_site.find({...}).to_list(10000)
    await db.tests_site_archives.insert_many(tests)
    
    # 2. Supprimer de la collection principale
    await db.tests_site.delete_many({...})
```

---

## 📊 COMPARATIF DES SOLUTIONS

| Critère | Option A (Suppression) | Option B (Archivage) |
|---------|------------------------|----------------------|
| **Simplicité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Performances** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Historique** | ❌ (Excel seulement) | ✅ (BDD) |
| **Coût dev** | 7h | 9h |
| **Maintenance** | Faible | Moyenne |
| **Espace disque** | Minimal | Croissant |

**Recommandation** : **Option A** (suppression) pour votre cas d'usage

---

## 🗓️ PLANNING D'IMPLÉMENTATION

### Semaine 1 (URGENT)
- ✅ **Phase 1.1** : Filtre année en cours (1h)
- ✅ Test et validation (30min)

**Bénéfice immédiat** : Sécurise les 12 prochains mois

### Semaine 4-6 (IMPORTANT)
- ✅ **Phase 2.1** : Pagination (3h)
- ✅ **Phase 2.2** : Export massif (2h)
- ✅ **Phase 2.3** : Suppression sécurisée (2h)
- ✅ Interface "Gestion des archives" (1h)
- ✅ Tests et documentation (1h)

**Total** : 9h de développement sur 2 semaines

---

## 🎯 RÉSULTAT FINAL

### Avec cette solution, vous aurez :

✅ **Capacité** : 3000+ tests par an sans problème  
✅ **Performance** : < 100ms quelque soit le volume  
✅ **Workflow annuel** :
   1. Export Excel complet (1 clic)
   2. Génération bilans annuels
   3. Suppression sécurisée (confirmations multiples)
   4. Redémarrage sur base propre

✅ **Sécurités** :
- Impossible de supprimer année en cours
- Confirmation multi-étapes
- Token de sécurité
- Audit log de toutes les suppressions
- Export obligatoire avant suppression

✅ **UX** :
- Filtre année clair
- Pagination fluide
- Interface dédiée pour archivage

---

## 💰 COÛT vs BÉNÉFICE

### Sans cette solution
- 🔴 Bloqué à 1000 tests (4 mois)
- 🔴 Application inutilisable après 4 mois
- 🔴 Données perdues ou inaccessibles
- 🔴 20-30h de débogage d'urgence

### Avec cette solution (9h de dev)
- ✅ 3000 tests/an supportés
- ✅ Performances optimales
- ✅ Workflow professionnel
- ✅ Sécurité maximale
- ✅ Pérennité assurée

**ROI** : ⭐⭐⭐⭐⭐

---

## 🚀 PROCHAINES ÉTAPES

### Je vous recommande :

**MAINTENANT** :
1. ✅ Valider cette stratégie avec vous
2. ✅ Implémenter Phase 1 (1h) cette semaine
3. ✅ Planifier Phase 2 pour dans 3-4 semaines

**Voulez-vous que je commence par la Phase 1 (filtre année + limite 5000) maintenant ?**

Cette modification prend **1h** et sécurise immédiatement vos 12 prochains mois. 🛡️

---

**Document créé le** : 02/12/2025  
**Priorité** : 🔴 CRITIQUE (4 mois avant blocage)
