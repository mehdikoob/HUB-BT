"""
Script pour générer des données de test sur 12 mois
- ~3000 tests (1500 TS + 1500 TL)
- Répartis sur 12 mois en arrière
- 1 test par mois par partenaire/programme (avec variation)
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from uuid import uuid4
import random

# Configuration MongoDB
MONGO_URL = "mongodb://localhost:27017"

async def generate_test_data():
    print("🚀 Génération de données de test...")
    print(f"📅 Période: 12 derniers mois")
    
    # Connexion MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client['test_database']
    
    # Récupérer programmes et partenaires
    programmes = await db.programmes.find({}, {"_id": 0}).to_list(100)
    partenaires = await db.partenaires.find({}, {"_id": 0}).to_list(1000)
    users = await db.users.find({}, {"_id": 0}).to_list(100)
    
    print(f"📊 {len(programmes)} programmes")
    print(f"👥 {len(partenaires)} partenaires")
    print(f"👤 {len(users)} utilisateurs")
    
    # Préparer les données
    programmes_ids = [p['id'] for p in programmes]
    partenaires_data = {}
    
    # Associer partenaires et programmes
    for part in partenaires:
        part_id = part['id']
        contacts = part.get('contacts_programmes', [])
        partenaires_data[part_id] = {
            'nom': part['nom'],
            'programmes': []
        }
        for contact in contacts:
            prog_id = contact.get('programme_id')
            if prog_id:
                partenaires_data[part_id]['programmes'].append({
                    'programme_id': prog_id,
                    'test_site_requis': contact.get('test_site_requis', True),
                    'test_ligne_requis': contact.get('test_ligne_requis', True)
                })
    
    # Utilisateurs pour créations
    user_ids = [u['email'] for u in users if u.get('role') in ['admin', 'agent']]
    if not user_ids:
        user_ids = ['admin@hubblindtests.com']
    
    # Période de 12 mois
    now = datetime.now(timezone.utc)
    
    tests_site_generated = 0
    tests_ligne_generated = 0
    
    print("\n🔄 Génération en cours...")
    
    # Pour chaque partenaire
    for part_id, part_info in partenaires_data.items():
        for prog_assoc in part_info['programmes']:
            prog_id = prog_assoc['programme_id']
            
            # Générer 1-2 tests par mois sur 12 mois (avec variation)
            for month_offset in range(12):
                # Date du test (entre le 1er et le 28 du mois)
                date_test = now - timedelta(days=30 * month_offset + random.randint(1, 28))
                created_at = date_test - timedelta(hours=random.randint(1, 48))
                
                # Probabilité de faire le test (95% chance)
                if random.random() > 0.95:
                    continue
                
                # Test Site si requis
                if prog_assoc['test_site_requis'] and random.random() > 0.05:
                    test_site = {
                        "id": str(uuid4()),
                        "date_test": date_test.isoformat(),
                        "programme_id": prog_id,
                        "partenaire_id": part_id,
                        "type_commande": random.choice(["web", "tel", "web"]),
                        "date_commande": date_test.isoformat(),
                        "montant_commande": round(random.uniform(50, 500), 2),
                        "remise_attendue": round(random.uniform(5, 50), 2),
                        "application_remise": random.choice([True, True, True, False]),  # 75% succès
                        "commentaires": random.choice([
                            "Test effectué sans problème",
                            "Remise appliquée correctement",
                            "Problème lors de l'application de la remise",
                            "Commande validée",
                            ""
                        ]),
                        "user_id": random.choice(user_ids),
                        "created_at": created_at.isoformat(),
                        "updated_at": created_at.isoformat()
                    }
                    await db.tests_site.insert_one(test_site)
                    tests_site_generated += 1
                
                # Test Ligne si requis
                if prog_assoc['test_ligne_requis'] and random.random() > 0.1:
                    test_ligne = {
                        "id": str(uuid4()),
                        "date_test": date_test.isoformat(),
                        "programme_id": prog_id,
                        "partenaire_id": part_id,
                        "offre_testee": random.choice([
                            "Offre vacances",
                            "Offre spéciale",
                            "Promotion été",
                            "Offre partenaire"
                        ]),
                        "application_offre": random.choice([True, True, True, False]),  # 75% succès
                        "commentaires": random.choice([
                            "Offre appliquée correctement",
                            "Test réussi",
                            "Problème détecté",
                            "Validation OK",
                            ""
                        ]),
                        "user_id": random.choice(user_ids),
                        "created_at": created_at.isoformat(),
                        "updated_at": created_at.isoformat()
                    }
                    await db.tests_ligne.insert_one(test_ligne)
                    tests_ligne_generated += 1
                
                # Progression
                if (tests_site_generated + tests_ligne_generated) % 500 == 0:
                    print(f"  ⏳ {tests_site_generated + tests_ligne_generated} tests générés...")
    
    print(f"\n✅ Génération terminée !")
    print(f"📊 Tests Site générés: {tests_site_generated}")
    print(f"📞 Tests Ligne générés: {tests_ligne_generated}")
    print(f"📈 Total: {tests_site_generated + tests_ligne_generated}")
    
    # Générer quelques alertes
    print(f"\n🔔 Génération d'alertes...")
    alertes_generated = 0
    
    # Récupérer des tests avec problèmes
    tests_problemes_site = await db.tests_site.find(
        {"application_remise": False},
        {"_id": 0}
    ).to_list(50)
    
    tests_problemes_ligne = await db.tests_ligne.find(
        {"application_offre": False},
        {"_id": 0}
    ).to_list(50)
    
    # Créer alertes pour certains tests problématiques
    for test in tests_problemes_site[:30]:
        if random.random() > 0.5:
            alerte = {
                "id": str(uuid4()),
                "programme_id": test['programme_id'],
                "partenaire_id": test['partenaire_id'],
                "type_test": "TS",
                "test_id": test['id'],
                "description": "Remise non appliquée lors du test",
                "statut": random.choice(["ouvert", "resolu"]),
                "created_at": test['created_at'],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.alertes.insert_one(alerte)
            alertes_generated += 1
    
    for test in tests_problemes_ligne[:30]:
        if random.random() > 0.5:
            alerte = {
                "id": str(uuid4()),
                "programme_id": test['programme_id'],
                "partenaire_id": test['partenaire_id'],
                "type_test": "TL",
                "test_id": test['id'],
                "description": "Offre non appliquée lors du test",
                "statut": random.choice(["ouvert", "resolu"]),
                "created_at": test['created_at'],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.alertes.insert_one(alerte)
            alertes_generated += 1
    
    print(f"✅ {alertes_generated} alertes générées")
    
    # Fermer connexion
    client.close()
    
    print(f"\n🎉 TERMINÉ ! Données de test générées avec succès")

if __name__ == "__main__":
    asyncio.run(generate_test_data())
