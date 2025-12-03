# 🔔 Intégration Notifications Microsoft Teams

**Date** : 02/12/2025  
**Objectif** : Envoyer les alertes vers un canal Teams en plus des notifications in-app

---

## ✅ FAISABILITÉ

**Réponse** : ✅ **OUI, totalement faisable et simple !**

**Méthode** : Webhooks entrants Microsoft Teams  
**Complexité** : ⭐⭐ (Facile)  
**Temps d'implémentation** : 2-3h  
**Coût** : Gratuit (inclus dans Teams)

---

## 🎯 FONCTIONNEMENT

### Workflow proposé

```
Création d'alerte
      ↓
      ├─→ Notification in-app (existant)
      └─→ Message Teams (nouveau)
```

### Exemple de message Teams

```
🚨 Nouvelle alerte détectée

Programme : The Corner
Partenaire : VVF Villages
Type : Test Site

Description :
Prix remisé (150€) supérieur au prix public (100€)

Créé par : Mehdi KOOB
Date : 02/12/2025 16:45

[Voir dans l'application →]
```

---

## 🔧 IMPLÉMENTATION TECHNIQUE

### Étape 1 : Configuration Teams (5 min)

**Dans Microsoft Teams** :
1. Ouvrir le canal où recevoir les alertes
2. Cliquer sur `...` → `Connecteurs`
3. Chercher "Incoming Webhook"
4. Cliquer "Configurer"
5. Nommer le webhook : "Alertes QWERTYS"
6. (Optionnel) Uploader un logo
7. **Copier l'URL du webhook** (à garder secret !)

**URL reçue** :
```
https://qwertysfr.webhook.office.com/webhookb2/xxx-xxx-xxx/IncomingWebhook/yyy-yyy-yyy
```

### Étape 2 : Ajouter dans .env (1 min)

**backend/.env** :
```bash
# Microsoft Teams
TEAMS_WEBHOOK_URL=https://qwertysfr.webhook.office.com/webhookb2/xxx...
TEAMS_NOTIFICATIONS_ENABLED=true
```

### Étape 3 : Code Backend (2h)

**Ajouter fonction d'envoi Teams dans server.py** :

```python
import httpx
from typing import Optional

async def send_teams_notification(
    alerte_id: str,
    programme_nom: str,
    partenaire_nom: str,
    type_test: str,
    description: str,
    created_by_name: str
):
    """
    Envoyer une notification vers Microsoft Teams
    """
    webhook_url = os.getenv('TEAMS_WEBHOOK_URL')
    
    # Si webhook non configuré ou désactivé, skip
    if not webhook_url or os.getenv('TEAMS_NOTIFICATIONS_ENABLED') != 'true':
        return
    
    try:
        # Format Adaptive Card pour Teams
        card = {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "themeColor": "FF0000",  # Rouge pour alerte
            "summary": "Nouvelle alerte détectée",
            "sections": [
                {
                    "activityTitle": "🚨 Nouvelle alerte détectée",
                    "activitySubtitle": f"{programme_nom} - {partenaire_nom}",
                    "facts": [
                        {
                            "name": "Programme",
                            "value": programme_nom
                        },
                        {
                            "name": "Partenaire",
                            "value": partenaire_nom
                        },
                        {
                            "name": "Type de test",
                            "value": "Test Site" if type_test == "TS" else "Test Ligne"
                        },
                        {
                            "name": "Description",
                            "value": description
                        },
                        {
                            "name": "Créé par",
                            "value": created_by_name
                        }
                    ],
                    "markdown": True
                }
            ],
            "potentialAction": [
                {
                    "@type": "OpenUri",
                    "name": "Voir dans l'application",
                    "targets": [
                        {
                            "os": "default",
                            "uri": f"{os.getenv('FRONTEND_URL', 'https://votre-app.com')}/alertes?id={alerte_id}"
                        }
                    ]
                }
            ]
        }
        
        # Envoyer vers Teams
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook_url, json=card)
            
            if response.status_code == 200:
                print(f"✅ Notification Teams envoyée pour alerte {alerte_id}")
            else:
                print(f"⚠️ Erreur Teams: {response.status_code} - {response.text}")
                
    except Exception as e:
        # Ne pas bloquer si Teams échoue
        print(f"❌ Erreur envoi Teams: {str(e)}")
```

**Modifier la fonction check_and_create_alerte** :

```python
async def check_and_create_alerte(
    test_id: str, 
    type_test: TypeTest, 
    description: str, 
    programme_id: str = None, 
    partenaire_id: str = None, 
    user_id: str = None
):
    # ... code existant création alerte ...
    
    await db.alertes.insert_one(doc)
    
    # Créer email draft (existant)
    await create_email_draft_for_alerte(alerte.id)
    
    # Créer notifications in-app (existant)
    if programme_id:
        await create_notifications_for_chefs_projet(
            alerte.id, programme_id, partenaire_id, description
        )
    
    # NOUVEAU : Envoyer vers Teams
    if programme_id and partenaire_id:
        # Récupérer noms pour message
        programme = await db.programmes.find_one({"id": programme_id})
        partenaire = await db.partenaires.find_one({"id": partenaire_id})
        
        # Récupérer nom créateur
        created_by_name = "Système"
        if user_id:
            user = await db.users.find_one({"id": user_id})
            if user:
                created_by_name = f"{user.get('prenom')} {user.get('nom')}"
        
        await send_teams_notification(
            alerte_id=alerte.id,
            programme_nom=programme.get('nom', 'N/A'),
            partenaire_nom=partenaire.get('nom', 'N/A'),
            type_test=type_test.value,
            description=description,
            created_by_name=created_by_name
        )
```

### Étape 4 : Installer dépendance (1 min)

```bash
cd /app/backend
pip install httpx
pip freeze > requirements.txt
```

---

## 📱 RENDU DANS TEAMS

### Message standard (MessageCard)

```
┌──────────────────────────────────────────┐
│ 🚨 Nouvelle alerte détectée              │
│ The Corner - VVF Villages                │
├──────────────────────────────────────────┤
│ Programme       The Corner               │
│ Partenaire      VVF Villages             │
│ Type de test    Test Site                │
│ Description     Prix remisé supérieur... │
│ Créé par        Mehdi KOOB               │
├──────────────────────────────────────────┤
│ [Voir dans l'application →]              │
└──────────────────────────────────────────┘
```

### Option avancée : Adaptive Card (plus riche)

```
┌──────────────────────────────────────────┐
│ 🚨 ALERTE CRITIQUE                       │
│ ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●        │ Barre rouge
├──────────────────────────────────────────┤
│ 📋 The Corner                            │
│ 🏢 VVF Villages                          │
│ 📅 02/12/2025 16:45                      │
├──────────────────────────────────────────┤
│ Prix remisé (150€) supérieur au prix    │
│ public (100€)                            │
├──────────────────────────────────────────┤
│ 👤 Mehdi KOOB                            │
├──────────────────────────────────────────┤
│ [✅ Marquer résolu] [🔗 Voir détails]    │
└──────────────────────────────────────────┘
```

---

## 🎨 VARIANTES POSSIBLES

### Variante 1 : Un canal par programme

**Configuration** :
```bash
# .env
TEAMS_WEBHOOK_THE_CORNER=https://...
TEAMS_WEBHOOK_LES_COLLECTIONNEURS=https://...
TEAMS_WEBHOOK_DEFAULT=https://...
```

**Code** :
```python
def get_teams_webhook_for_programme(programme_nom: str) -> str:
    """Retourner le webhook Teams spécifique au programme"""
    webhook_key = f"TEAMS_WEBHOOK_{programme_nom.upper().replace(' ', '_')}"
    return os.getenv(webhook_key, os.getenv('TEAMS_WEBHOOK_DEFAULT'))
```

### Variante 2 : Filtrer par type d'alerte

```python
# Ne notifier que certains types d'alertes
CRITICAL_ALERTS = [
    "Prix remisé supérieur au prix public",
    "Remise non appliquée"
]

if any(keyword in description for keyword in CRITICAL_ALERTS):
    await send_teams_notification(...)  # Seulement pour alertes critiques
```

### Variante 3 : Notification groupée

```python
# Envoyer un résumé toutes les heures au lieu de chaque alerte
async def send_hourly_summary_to_teams():
    """
    Envoyer un résumé horaire des alertes
    """
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    
    alertes = await db.alertes.find({
        'created_at': {'$gte': one_hour_ago.isoformat()},
        'statut': 'ouvert'
    }).to_list(100)
    
    if alertes:
        message = f"📊 {len(alertes)} nouvelle(s) alerte(s) dans la dernière heure"
        # ... envoyer résumé
```

---

## ⚡ OPTIONS AVANCÉES

### Option 1 : Actions interactives (Adaptive Cards)

**Permet de** :
- Marquer une alerte comme résolue depuis Teams
- Assigner à un chef de projet
- Ajouter un commentaire

**Complexité** : +4h (nécessite endpoints supplémentaires)

### Option 2 : Bot Teams personnalisé

**Permet de** :
- Conversations bidirectionnelles
- Commandes : `/alertes list`, `/alertes resolve 123`
- Notifications personnalisées par utilisateur

**Complexité** : +10-15h (création bot Teams)

### Option 3 : Power Automate (no-code)

**Alternative** : 
- Webhook générique → Power Automate → Teams
- Configuration visuelle dans Power Automate
- Pas de code à écrire

**Complexité** : 1h (configuration)

---

## 🔒 SÉCURITÉ

### Bonnes pratiques

1. **URL webhook secrète** :
   - Ne JAMAIS commiter dans Git
   - Stocker dans .env
   - Régénérer si compromise

2. **Rate limiting** :
   ```python
   from datetime import datetime, timedelta
   
   # Éviter spam Teams (max 1 message/minute par alerte)
   last_teams_notification = {}
   
   def can_send_teams_notification(alerte_id: str) -> bool:
       now = datetime.now()
       last = last_teams_notification.get(alerte_id)
       
       if not last or (now - last).seconds > 60:
           last_teams_notification[alerte_id] = now
           return True
       return False
   ```

3. **Fallback gracieux** :
   - Ne jamais bloquer la création d'alerte si Teams échoue
   - Logger les erreurs Teams
   - Continuer le workflow normal

---

## 📊 AVANTAGES vs INCONVÉNIENTS

### ✅ Avantages

**Notification instantanée** :
- ⚡ Push temps réel vers mobile/desktop
- 📱 Accessible partout (app Teams mobile)
- 🔔 Notifications même si l'app web est fermée

**Collaboration** :
- 💬 Discussion directe dans Teams
- 👥 Mention des personnes concernées
- 📌 Épingler les alertes importantes

**Historique centralisé** :
- 📜 Toutes les alertes dans un canal
- 🔍 Recherche facile
- 📊 Vision globale de l'activité

### ⚠️ Inconvénients

**Dépendance externe** :
- Si Teams down, notifications perdues
- Webhook peut être révoqué

**Spam potentiel** :
- Avec 3000 tests/an, beaucoup d'alertes
- Nécessite filtrage intelligent

**Configuration initiale** :
- Chaque équipe doit configurer son webhook
- Formation utilisateurs

---

## 🎯 RECOMMANDATIONS

### Pour votre cas (3000 tests/an)

**Je recommande** :

1. **Canal Teams unique** pour toutes les alertes
   - Simple à gérer
   - Vue centralisée

2. **Notification immédiate** (pas de groupement)
   - Volume raisonnable (~250/mois)
   - Réactivité importante

3. **Filtre optionnel** sur alertes critiques
   - Configurable dans .env
   - Évite le bruit si trop d'alertes

4. **Lien vers l'app** dans chaque message
   - Un clic pour voir détails
   - Workflow fluide

### Configuration proposée

```bash
# backend/.env
TEAMS_WEBHOOK_URL=https://...
TEAMS_NOTIFICATIONS_ENABLED=true
TEAMS_ONLY_CRITICAL=false  # true pour filtrer
```

---

## 📅 PLANNING D'IMPLÉMENTATION

### Option A : Version simple (2-3h)

**Fonctionnalités** :
- ✅ Message Teams basique (MessageCard)
- ✅ Toutes les alertes
- ✅ Lien vers l'application
- ✅ Fallback gracieux

**Timeline** :
- Configuration Teams : 5 min
- Code backend : 1h30
- Tests : 30 min
- Documentation : 30 min

### Option B : Version complète (5-6h)

**Fonctionnalités** :
- ✅ Adaptive Card enrichie
- ✅ Filtres configurables
- ✅ Multi-canaux par programme
- ✅ Rate limiting
- ✅ Statistiques d'envoi

**Timeline** :
- Configuration : 15 min
- Code backend : 3h
- Tests : 1h
- Documentation : 1h

---

## 💰 COÛT

**Gratuit !** ✅

- Webhooks Teams inclus dans Office 365
- Pas de coût supplémentaire
- Illimité (avec rate limits raisonnables)

---

## 🧪 TEST SIMPLE (sans coder)

Pour tester immédiatement, vous pouvez utiliser **curl** :

```bash
# 1. Configurer un webhook dans Teams
# 2. Tester avec curl :

curl -X POST "VOTRE_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    "summary": "Test notification QWERTYS",
    "themeColor": "FF0000",
    "title": "🚨 Test alerte",
    "text": "Ceci est un test de notification Teams depuis QWERTYS"
  }'
```

Si vous voyez le message dans Teams → ✅ Ça marche !

---

## ✅ CONCLUSION

### Réponse courte
**Oui, c'est possible et même recommandé !**

### Bénéfices
- ✅ Notifications push temps réel
- ✅ Accessibilité mobile
- ✅ Collaboration facilitée
- ✅ Gratuit et facile à implémenter

### Temps d'implémentation
- **Version simple** : 2-3h
- **Version complète** : 5-6h

### Recommandation
Je recommande la **version simple** pour commencer, puis ajouter des fonctionnalités selon les besoins.

---

## 🚀 PROCHAINES ÉTAPES

**Voulez-vous que je l'implémente ?**

Si oui :
1. Vous configurez le webhook Teams (5 min)
2. Vous me donnez l'URL
3. J'implémente le code (2-3h)
4. On teste ensemble
5. Vous ajustez filtres/format selon besoins

**Ou préférez-vous d'abord tester avec curl pour voir le rendu ?** 📱
