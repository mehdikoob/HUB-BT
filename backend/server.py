from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import csv
import io
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class StatutIncident(str, Enum):
    ouvert = "ouvert"
    resolu = "resolu"

class TypeTest(str, Enum):
    TS = "TS"
    TL = "TL"

class EvaluationAccueil(str, Enum):
    excellent = "Excellent"
    bien = "Bien"
    moyen = "Moyen"
    mediocre = "Médiocre"

# Models - Programme
class ProgrammeBase(BaseModel):
    nom: str
    description: Optional[str] = None
    logo_url: Optional[str] = None

class ProgrammeCreate(ProgrammeBase):
    pass

class Programme(ProgrammeBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Models - Partenaire
class ProgrammeContact(BaseModel):
    programme_id: str
    url_site: Optional[str] = None
    numero_telephone: Optional[str] = None

class PartenaireBase(BaseModel):
    nom: str
    programmes_ids: List[str] = []
    contacts_programmes: List[ProgrammeContact] = []  # URLs et téléphones par programme
    naming_attendu: Optional[str] = None
    remise_minimum: Optional[float] = None  # Remise minimum attendue en %
    logo_url: Optional[str] = None
    contact_email: Optional[str] = None  # Email du contact principal

class PartenaireCreate(PartenaireBase):
    pass

class Partenaire(PartenaireBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Models - Test Site
class TestSiteBase(BaseModel):
    programme_id: str
    partenaire_id: str
    date_test: datetime
    application_remise: bool
    prix_public: float
    prix_remise: float
    naming_constate: Optional[str] = None
    cumul_codes: bool
    commentaire: Optional[str] = None

class TestSiteCreate(TestSiteBase):
    pass

class TestSite(TestSiteBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pct_remise_calcule: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Models - Test Ligne
class TestLigneBase(BaseModel):
    programme_id: str
    partenaire_id: str
    date_test: datetime
    numero_telephone: str
    messagerie_vocale_dediee: bool
    decroche_dedie: bool
    delai_attente: str  # Format mm:ss
    nom_conseiller: Optional[str] = "NC"
    evaluation_accueil: EvaluationAccueil
    application_offre: bool
    commentaire: Optional[str] = None

    @field_validator('delai_attente')
    def validate_delai(cls, v):
        parts = v.split(':')
        if len(parts) != 2:
            raise ValueError('Format invalide, attendu mm:ss')
        try:
            minutes = int(parts[0])
            seconds = int(parts[1])
            if minutes < 0 or seconds < 0 or seconds > 59:
                raise ValueError('Valeurs invalides')
            if minutes >= 10:
                raise ValueError('Délai d\'attente trop long (>= 10 min)')
        except ValueError as e:
            raise ValueError(f'Format de délai invalide: {e}')
        return v

class TestLigneCreate(TestLigneBase):
    pass

class TestLigne(TestLigneBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Models - Incident
class IncidentBase(BaseModel):
    test_id: str
    type_test: TypeTest
    description: str
    statut: StatutIncident = StatutIncident.ouvert
    programme_id: Optional[str] = None
    partenaire_id: Optional[str] = None

class IncidentCreate(IncidentBase):
    pass

class Incident(IncidentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None

# Helper functions
def calculate_remise_percentage(prix_public: float, prix_remise: float) -> float:
    if prix_public <= 0:
        return 0.0
    return round((1 - prix_remise / prix_public) * 100, 2)

async def check_and_create_incident(test_id: str, type_test: TypeTest, description: str, programme_id: str = None, partenaire_id: str = None):
    incident = Incident(
        test_id=test_id,
        type_test=type_test,
        description=description,
        statut=StatutIncident.ouvert,
        programme_id=programme_id,
        partenaire_id=partenaire_id
    )
    doc = incident.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.incidents.insert_one(doc)

# Routes - Root
@api_router.get("/")
async def root():
    return {"message": "API QWERTYS Blind Tests"}

# Routes - Programmes
@api_router.post("/programmes", response_model=Programme)
async def create_programme(input: ProgrammeCreate):
    programme = Programme(**input.model_dump())
    doc = programme.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.programmes.insert_one(doc)
    return programme

@api_router.get("/programmes", response_model=List[Programme])
async def get_programmes():
    programmes = await db.programmes.find({}, {"_id": 0}).to_list(1000)
    for p in programmes:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return programmes

@api_router.get("/programmes/{programme_id}", response_model=Programme)
async def get_programme(programme_id: str):
    programme = await db.programmes.find_one({"id": programme_id}, {"_id": 0})
    if not programme:
        raise HTTPException(status_code=404, detail="Programme non trouvé")
    if isinstance(programme.get('created_at'), str):
        programme['created_at'] = datetime.fromisoformat(programme['created_at'])
    return programme

@api_router.put("/programmes/{programme_id}", response_model=Programme)
async def update_programme(programme_id: str, input: ProgrammeCreate):
    existing = await db.programmes.find_one({"id": programme_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Programme non trouvé")
    
    update_data = input.model_dump()
    await db.programmes.update_one({"id": programme_id}, {"$set": update_data})
    
    updated = await db.programmes.find_one({"id": programme_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/programmes/{programme_id}")
async def delete_programme(programme_id: str):
    result = await db.programmes.delete_one({"id": programme_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Programme non trouvé")
    return {"message": "Programme supprimé"}

# Routes - Partenaires
@api_router.post("/partenaires", response_model=Partenaire)
async def create_partenaire(input: PartenaireCreate):
    partenaire = Partenaire(**input.model_dump())
    doc = partenaire.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.partenaires.insert_one(doc)
    return partenaire

@api_router.get("/partenaires", response_model=List[Partenaire])
async def get_partenaires():
    partenaires = await db.partenaires.find({}, {"_id": 0}).to_list(1000)
    for p in partenaires:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return partenaires

@api_router.get("/contacts/all")
async def get_all_contacts():
    """Get all partenaire contacts with their associated programmes"""
    partenaires = await db.partenaires.find({}, {"_id": 0}).to_list(1000)
    programmes = await db.programmes.find({}, {"_id": 0}).to_list(1000)
    
    # Create a map for quick programme lookup
    programmes_map = {p['id']: p['nom'] for p in programmes}
    
    contacts = []
    for partenaire in partenaires:
        # Get all programmes for this partenaire
        programme_names = [programmes_map.get(pid, 'Unknown') for pid in partenaire.get('programmes_ids', [])]
        
        contacts.append({
            'partenaire_id': partenaire['id'],
            'partenaire_nom': partenaire['nom'],
            'contact_email': partenaire.get('contact_email'),
            'programmes': ', '.join(programme_names) if programme_names else 'Aucun'
        })
    
    return contacts

@api_router.get("/partenaires/{partenaire_id}", response_model=Partenaire)
async def get_partenaire(partenaire_id: str):
    partenaire = await db.partenaires.find_one({"id": partenaire_id}, {"_id": 0})
    if not partenaire:
        raise HTTPException(status_code=404, detail="Partenaire non trouvé")
    if isinstance(partenaire.get('created_at'), str):
        partenaire['created_at'] = datetime.fromisoformat(partenaire['created_at'])
    return partenaire

@api_router.put("/partenaires/{partenaire_id}", response_model=Partenaire)
async def update_partenaire(partenaire_id: str, input: PartenaireCreate):
    existing = await db.partenaires.find_one({"id": partenaire_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Partenaire non trouvé")
    
    update_data = input.model_dump()
    await db.partenaires.update_one({"id": partenaire_id}, {"$set": update_data})
    
    updated = await db.partenaires.find_one({"id": partenaire_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/partenaires/{partenaire_id}")
async def delete_partenaire(partenaire_id: str):
    result = await db.partenaires.delete_one({"id": partenaire_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partenaire non trouvé")
    return {"message": "Partenaire supprimé"}

# Route pour vérifier la remise par rapport à la remise minimum attendue
@api_router.get("/partenaires/{partenaire_id}/verify-remise")
async def verify_remise(partenaire_id: str, remise_calculee: float):
    partenaire = await db.partenaires.find_one({"id": partenaire_id}, {"_id": 0})
    if not partenaire:
        raise HTTPException(status_code=404, detail="Partenaire non trouvé")
    
    remise_minimum = partenaire.get('remise_minimum')
    if remise_minimum is None:
        return {"conforme": True, "message": "Aucune remise minimum définie"}
    
    if remise_calculee < remise_minimum:
        return {
            "conforme": False,
            "message": f"Remise insuffisante: {remise_calculee}% < {remise_minimum}% attendu",
            "ecart": remise_minimum - remise_calculee
        }
    
    return {"conforme": True, "message": "Remise conforme"}

# Routes - Tests Site
@api_router.post("/tests-site", response_model=TestSite)
async def create_test_site(input: TestSiteCreate):
    # Calculate remise percentage
    pct_remise = calculate_remise_percentage(input.prix_public, input.prix_remise)
    
    test_data = input.model_dump()
    test = TestSite(**test_data, pct_remise_calcule=pct_remise)
    
    # Récupérer le partenaire pour vérifier la remise minimum
    partenaire = await db.partenaires.find_one({"id": input.partenaire_id}, {"_id": 0})
    
    # Validations et création d'incidents
    if input.prix_remise > input.prix_public:
        await check_and_create_incident(
            test.id,
            TypeTest.TS,
            f"Prix remisé ({input.prix_remise}€) supérieur au prix public ({input.prix_public}€)",
            input.programme_id,
            input.partenaire_id
        )
    
    if not input.application_remise:
        await check_and_create_incident(
            test.id,
            TypeTest.TS,
            "Remise non appliquée",
            input.programme_id,
            input.partenaire_id
        )
    
    # Vérifier la remise minimum si définie
    if partenaire and partenaire.get('remise_minimum'):
        remise_minimum = partenaire['remise_minimum']
        if pct_remise < remise_minimum:
            await check_and_create_incident(
                test.id,
                TypeTest.TS,
                f"Remise insuffisante: {pct_remise}% appliquée, {remise_minimum}% attendue (écart: {remise_minimum - pct_remise}%)",
                input.programme_id,
                input.partenaire_id
            )
    
    # Save test
    doc = test.model_dump()
    doc['date_test'] = doc['date_test'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.tests_site.insert_one(doc)
    
    return test

@api_router.get("/tests-site", response_model=List[TestSite])
async def get_tests_site(
    programme_id: Optional[str] = Query(None),
    partenaire_id: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None)
):
    query = {}
    if programme_id:
        query['programme_id'] = programme_id
    if partenaire_id:
        query['partenaire_id'] = partenaire_id
    if date_debut or date_fin:
        query['date_test'] = {}
        if date_debut:
            query['date_test']['$gte'] = date_debut
        if date_fin:
            query['date_test']['$lte'] = date_fin
    
    tests = await db.tests_site.find(query, {"_id": 0}).to_list(1000)
    for t in tests:
        if isinstance(t.get('date_test'), str):
            t['date_test'] = datetime.fromisoformat(t['date_test'])
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    return tests

@api_router.get("/tests-site/{test_id}", response_model=TestSite)
async def get_test_site(test_id: str):
    test = await db.tests_site.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test non trouvé")
    if isinstance(test.get('date_test'), str):
        test['date_test'] = datetime.fromisoformat(test['date_test'])
    if isinstance(test.get('created_at'), str):
        test['created_at'] = datetime.fromisoformat(test['created_at'])
    return test

@api_router.delete("/tests-site/{test_id}")
async def delete_test_site(test_id: str):
    result = await db.tests_site.delete_one({"id": test_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Test non trouvé")
    return {"message": "Test supprimé"}

# Routes - Tests Ligne
@api_router.post("/tests-ligne", response_model=TestLigne)
async def create_test_ligne(input: TestLigneCreate):
    test = TestLigne(**input.model_dump())
    
    # Validations et création d'incidents
    if not input.application_offre:
        await check_and_create_incident(
            test.id,
            TypeTest.TL,
            "Offre non appliquée",
            input.programme_id,
            input.partenaire_id
        )
    
    if not input.messagerie_vocale_dediee and not input.decroche_dedie:
        await check_and_create_incident(
            test.id,
            TypeTest.TL,
            "Ni messagerie dédiée ni décroche dédié détecté",
            input.programme_id,
            input.partenaire_id
        )
    
    # Save test
    doc = test.model_dump()
    doc['date_test'] = doc['date_test'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.tests_ligne.insert_one(doc)
    
    return test

@api_router.get("/tests-ligne", response_model=List[TestLigne])
async def get_tests_ligne(
    programme_id: Optional[str] = Query(None),
    partenaire_id: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None)
):
    query = {}
    if programme_id:
        query['programme_id'] = programme_id
    if partenaire_id:
        query['partenaire_id'] = partenaire_id
    if date_debut or date_fin:
        query['date_test'] = {}
        if date_debut:
            query['date_test']['$gte'] = date_debut
        if date_fin:
            query['date_test']['$lte'] = date_fin
    
    tests = await db.tests_ligne.find(query, {"_id": 0}).to_list(1000)
    for t in tests:
        if isinstance(t.get('date_test'), str):
            t['date_test'] = datetime.fromisoformat(t['date_test'])
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    return tests

@api_router.get("/tests-ligne/{test_id}", response_model=TestLigne)
async def get_test_ligne(test_id: str):
    test = await db.tests_ligne.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test non trouvé")
    if isinstance(test.get('date_test'), str):
        test['date_test'] = datetime.fromisoformat(test['date_test'])
    if isinstance(test.get('created_at'), str):
        test['created_at'] = datetime.fromisoformat(test['created_at'])
    return test

@api_router.delete("/tests-ligne/{test_id}")
async def delete_test_ligne(test_id: str):
    result = await db.tests_ligne.delete_one({"id": test_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Test non trouvé")
    return {"message": "Test supprimé"}

# Routes - Incidents
@api_router.get("/incidents", response_model=List[Incident])
async def get_incidents(statut: Optional[StatutIncident] = Query(None)):
    query = {}
    if statut:
        query['statut'] = statut
    
    incidents = await db.incidents.find(query, {"_id": 0}).to_list(1000)
    for i in incidents:
        if isinstance(i.get('created_at'), str):
            i['created_at'] = datetime.fromisoformat(i['created_at'])
        if i.get('resolved_at') and isinstance(i['resolved_at'], str):
            i['resolved_at'] = datetime.fromisoformat(i['resolved_at'])
    return incidents

@api_router.get("/incidents/enriched")
async def get_incidents_enriched(statut: Optional[StatutIncident] = Query(None)):
    """Get incidents with programme and partenaire details"""
    query = {}
    if statut:
        query['statut'] = statut
    
    incidents = await db.incidents.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with programme and partenaire data
    for incident in incidents:
        if isinstance(incident.get('created_at'), str):
            incident['created_at'] = datetime.fromisoformat(incident['created_at'])
        if incident.get('resolved_at') and isinstance(incident['resolved_at'], str):
            incident['resolved_at'] = datetime.fromisoformat(incident['resolved_at'])
        
        # Get programme details
        if incident.get('programme_id'):
            programme = await db.programmes.find_one({"id": incident['programme_id']}, {"_id": 0})
            incident['programme_nom'] = programme['nom'] if programme else None
        
        # Get partenaire details
        if incident.get('partenaire_id'):
            partenaire = await db.partenaires.find_one({"id": incident['partenaire_id']}, {"_id": 0})
            if partenaire:
                incident['partenaire_nom'] = partenaire['nom']
                incident['partenaire_contact_email'] = partenaire.get('contact_email')
    
    return incidents

@api_router.put("/incidents/{incident_id}", response_model=Incident)
async def resolve_incident(incident_id: str):
    existing = await db.incidents.find_one({"id": incident_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    
    resolved_at = datetime.now(timezone.utc).isoformat()
    await db.incidents.update_one(
        {"id": incident_id},
        {"$set": {"statut": StatutIncident.resolu, "resolved_at": resolved_at}}
    )
    
    updated = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if updated.get('resolved_at') and isinstance(updated['resolved_at'], str):
        updated['resolved_at'] = datetime.fromisoformat(updated['resolved_at'])
    return updated

# Routes - Stats & Dashboard
@api_router.get("/stats/dashboard")
async def get_dashboard_stats():
    from datetime import datetime, timezone
    import calendar
    
    total_programmes = await db.programmes.count_documents({})
    total_partenaires = await db.partenaires.count_documents({})
    total_incidents_ouverts = await db.incidents.count_documents({"statut": "ouvert"})
    
    # Calculer les dates du mois en cours
    now = datetime.now(timezone.utc)
    year = now.year
    month = now.month
    first_day = datetime(year, month, 1, tzinfo=timezone.utc).isoformat()
    last_day_num = calendar.monthrange(year, month)[1]
    last_day = datetime(year, month, last_day_num, 23, 59, 59, tzinfo=timezone.utc).isoformat()
    
    # Calculer J-5
    days_until_end = last_day_num - now.day
    is_j5_alert = days_until_end <= 5
    
    # Récupérer tous les partenaires
    partenaires = await db.partenaires.find({}, {"_id": 0}).to_list(1000)
    
    # Pour chaque partenaire, vérifier s'il a été testé ce mois
    tests_manquants = []
    tests_manquants_j5 = 0
    
    for partenaire in partenaires:
        part_id = partenaire['id']
        part_nom = partenaire['nom']
        
        # Vérifier test site ce mois
        test_site_count = await db.tests_site.count_documents({
            "partenaire_id": part_id,
            "date_test": {"$gte": first_day, "$lte": last_day}
        })
        
        # Vérifier test ligne ce mois
        test_ligne_count = await db.tests_ligne.count_documents({
            "partenaire_id": part_id,
            "date_test": {"$gte": first_day, "$lte": last_day}
        })
        
        manquants = []
        if test_site_count == 0:
            manquants.append("Site")
        if test_ligne_count == 0:
            manquants.append("Ligne")
        
        if manquants:
            tests_manquants.append({
                "partenaire_id": part_id,
                "partenaire_nom": part_nom,
                "types_manquants": manquants
            })
    
    # Si on est à J-5, compter les tests manquants comme critiques
    if is_j5_alert:
        tests_manquants_j5 = len(tests_manquants)
    
    # Taux de réussite TS (sur le mois)
    total_tests_site_mois = await db.tests_site.count_documents({
        "date_test": {"$gte": first_day, "$lte": last_day}
    })
    tests_site_reussis = await db.tests_site.count_documents({
        "date_test": {"$gte": first_day, "$lte": last_day},
        "application_remise": True
    })
    taux_reussite_ts = (tests_site_reussis / total_tests_site_mois * 100) if total_tests_site_mois > 0 else 0
    
    # Taux de réussite TL (sur le mois)
    total_tests_ligne_mois = await db.tests_ligne.count_documents({
        "date_test": {"$gte": first_day, "$lte": last_day}
    })
    tests_ligne_reussis = await db.tests_ligne.count_documents({
        "date_test": {"$gte": first_day, "$lte": last_day},
        "application_offre": True
    })
    taux_reussite_tl = (tests_ligne_reussis / total_tests_ligne_mois * 100) if total_tests_ligne_mois > 0 else 0
    
    return {
        "total_programmes": total_programmes,
        "total_partenaires": total_partenaires,
        "total_incidents_ouverts": total_incidents_ouverts,
        "taux_reussite_ts": round(taux_reussite_ts, 2),
        "taux_reussite_tl": round(taux_reussite_tl, 2),
        "tests_manquants": tests_manquants,
        "tests_manquants_count": len(tests_manquants),
        "tests_manquants_j5": tests_manquants_j5,
        "is_j5_alert": is_j5_alert,
        "days_until_end": days_until_end,
        "current_month": month,
        "current_year": year
    }

# Routes - Export Bilan Partenaire
@api_router.get("/export/bilan-partenaire")
async def export_bilan_partenaire(
    partenaire_id: str = Query(...),
    date_debut: str = Query(...),
    date_fin: str = Query(...)
):
    # Récupérer le partenaire
    partenaire = await db.partenaires.find_one({"id": partenaire_id}, {"_id": 0})
    if not partenaire:
        raise HTTPException(status_code=404, detail="Partenaire non trouvé")
    
    # Récupérer tous les programmes
    programmes = await db.programmes.find({}, {"_id": 0}).to_list(1000)
    programmes_dict = {p['id']: p['nom'] for p in programmes}
    
    # Query pour tous les tests du partenaire dans la période (tous programmes)
    query = {
        'partenaire_id': partenaire_id,
        'date_test': {
            '$gte': date_debut,
            '$lte': date_fin
        }
    }
    
    # Récupérer les tests site et ligne
    tests_site = await db.tests_site.find(query, {"_id": 0}).to_list(10000)
    tests_ligne = await db.tests_ligne.find(query, {"_id": 0}).to_list(10000)
    
    # Create CSV with both test types
    output = io.StringIO()
    
    # Header
    output.write(f"BILAN PARTENAIRE: {partenaire['nom']}\n")
    output.write(f"Période: du {date_debut} au {date_fin}\n")
    output.write(f"Remise minimum attendue: {partenaire.get('remise_minimum', 'Non définie')}%\n")
    output.write("\n")
    
    # Tests Site
    output.write("=== TESTS SITE ===\n")
    if tests_site:
        fieldnames_site = ['Date', 'Programme', 'Application remise', 'Prix public', 'Prix remisé', 
                          '% Remise', 'Naming', 'Cumul codes', 'Commentaire']
        writer = csv.DictWriter(output, fieldnames=fieldnames_site)
        writer.writeheader()
        
        for test in tests_site:
            date_str = test['date_test'] if isinstance(test['date_test'], str) else test['date_test'].isoformat()
            programme_nom = programmes_dict.get(test['programme_id'], test['programme_id'])
            
            writer.writerow({
                'Date': date_str,
                'Programme': programme_nom,
                'Application remise': 'OUI' if test['application_remise'] else 'NON',
                'Prix public': f"{test['prix_public']}€",
                'Prix remisé': f"{test['prix_remise']}€",
                '% Remise': f"{test['pct_remise_calcule']}%",
                'Naming': test.get('naming_constate', ''),
                'Cumul codes': 'OUI' if test['cumul_codes'] else 'NON',
                'Commentaire': test.get('commentaire', '')
            })
    else:
        output.write("Aucun test site sur cette période\n")
    
    output.write("\n\n")
    
    # Tests Ligne
    output.write("=== TESTS LIGNE ===\n")
    if tests_ligne:
        fieldnames_ligne = ['Date', 'Programme', 'Téléphone', 'Messagerie dédiée', 'Décroche dédié',
                           'Délai attente', 'Conseiller', 'Évaluation', 'Offre appliquée', 'Commentaire']
        writer = csv.DictWriter(output, fieldnames=fieldnames_ligne)
        writer.writeheader()
        
        for test in tests_ligne:
            date_str = test['date_test'] if isinstance(test['date_test'], str) else test['date_test'].isoformat()
            programme_nom = programmes_dict.get(test['programme_id'], test['programme_id'])
            
            writer.writerow({
                'Date': date_str,
                'Programme': programme_nom,
                'Téléphone': test['numero_telephone'],
                'Messagerie dédiée': 'OUI' if test['messagerie_vocale_dediee'] else 'NON',
                'Décroche dédié': 'OUI' if test['decroche_dedie'] else 'NON',
                'Délai attente': test['delai_attente'],
                'Conseiller': test.get('nom_conseiller', 'NC'),
                'Évaluation': test['evaluation_accueil'],
                'Offre appliquée': 'OUI' if test['application_offre'] else 'NON',
                'Commentaire': test.get('commentaire', '')
            })
    else:
        output.write("Aucun test ligne sur cette période\n")
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=bilan_{partenaire['nom']}_{date_debut}_{date_fin}.csv"}
    )

# Routes - Export Bilan Excel Tests Site
@api_router.get("/export/bilan-site-excel")
async def export_bilan_site_excel(
    partenaire_id: str = Query(...),
    date_debut: str = Query(...),
    date_fin: str = Query(...)
):
    from datetime import datetime as dt
    
    # Récupérer le partenaire
    partenaire = await db.partenaires.find_one({"id": partenaire_id}, {"_id": 0})
    if not partenaire:
        raise HTTPException(status_code=404, detail="Partenaire non trouvé")
    
    # Récupérer tous les programmes
    programmes = await db.programmes.find({}, {"_id": 0}).to_list(1000)
    programmes_dict = {p['id']: p['nom'] for p in programmes}
    
    # Query pour tous les tests site du partenaire dans la période
    query = {
        'partenaire_id': partenaire_id,
        'date_test': {
            '$gte': date_debut,
            '$lte': date_fin
        }
    }
    
    tests_site = await db.tests_site.find(query, {"_id": 0}).to_list(10000)
    
    # Créer le workbook Excel
    wb = Workbook()
    ws = wb.active
    ws.title = "Tests site"
    
    # Styles
    header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='C00000', end_color='C00000', fill_type='solid')
    header_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    
    title_font = Font(name='Calibri', size=14, bold=True, color='C00000')
    title_alignment = Alignment(horizontal='center', vertical='center')
    
    cell_alignment_center = Alignment(horizontal='center', vertical='center')
    cell_alignment_left = Alignment(horizontal='left', vertical='center')
    
    border_style = Border(
        left=Side(style='thin', color='000000'),
        right=Side(style='thin', color='000000'),
        top=Side(style='thin', color='000000'),
        bottom=Side(style='thin', color='000000')
    )
    
    # Titre principal (ligne 1 fusionnée)
    ws.merge_cells('A1:I1')
    title_cell = ws['A1']
    today = dt.now().strftime('%d/%m/%Y')
    title_cell.value = f"BILAN TESTS SITE – {partenaire['nom']}"
    title_cell.font = title_font
    title_cell.alignment = title_alignment
    ws.row_dimensions[1].height = 25
    
    # En-têtes (ligne 2)
    headers = ['Date', 'Programme', 'Application remise', 'Prix public', 'Prix remisé', 
               '% Remise', 'Naming', 'Cumul codes', 'Commentaire']
    
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=2, column=col_num)
        cell.value = header
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = border_style
    
    ws.row_dimensions[2].height = 30
    
    # Données
    for row_num, test in enumerate(tests_site, 3):
        # Date
        date_str = test['date_test'] if isinstance(test['date_test'], str) else test['date_test'].isoformat()
        try:
            date_obj = dt.fromisoformat(date_str.replace('Z', '+00:00'))
            date_formatted = date_obj.strftime('%d/%m/%Y %H:%M')
        except:
            date_formatted = date_str
        
        programme_nom = programmes_dict.get(test['programme_id'], test['programme_id'])
        
        row_data = [
            date_formatted,
            programme_nom,
            'OUI' if test['application_remise'] else 'NON',
            test['prix_public'],
            test['prix_remise'],
            test['pct_remise_calcule'],
            test.get('naming_constate', ''),
            'OUI' if test['cumul_codes'] else 'NON',
            test.get('commentaire', '')
        ]
        
        for col_num, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_num, column=col_num)
            cell.value = value
            cell.border = border_style
            
            # Alignement
            if col_num == 9:  # Commentaire
                cell.alignment = cell_alignment_left
            else:
                cell.alignment = cell_alignment_center
            
            # Format monétaire pour prix
            if col_num in [4, 5]:  # Prix public et Prix remisé
                cell.number_format = '#,##0.00 "€"'
            
            # Format pourcentage
            if col_num == 6:  # % Remise
                cell.number_format = '0.00"%"'
    
    # Ajuster largeurs de colonnes
    column_widths = {
        'A': 18,  # Date
        'B': 20,  # Programme
        'C': 18,  # Application remise
        'D': 15,  # Prix public
        'E': 15,  # Prix remisé
        'F': 12,  # % Remise
        'G': 30,  # Naming
        'H': 15,  # Cumul codes
        'I': 40   # Commentaire
    }
    
    for col_letter, width in column_widths.items():
        ws.column_dimensions[col_letter].width = width
    
    # Sauvegarder dans un buffer
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    # Nom du fichier
    filename = f"Bilan_Site_{partenaire['nom']}_{today.replace('/', '-')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Routes - Export Bilan Excel Tests Ligne
@api_router.get("/export/bilan-ligne-excel")
async def export_bilan_ligne_excel(
    partenaire_id: str = Query(...),
    date_debut: str = Query(...),
    date_fin: str = Query(...)
):
    from datetime import datetime as dt
    
    # Récupérer le partenaire
    partenaire = await db.partenaires.find_one({"id": partenaire_id}, {"_id": 0})
    if not partenaire:
        raise HTTPException(status_code=404, detail="Partenaire non trouvé")
    
    # Récupérer tous les programmes
    programmes = await db.programmes.find({}, {"_id": 0}).to_list(1000)
    programmes_dict = {p['id']: p['nom'] for p in programmes}
    
    # Query pour tous les tests ligne du partenaire dans la période
    query = {
        'partenaire_id': partenaire_id,
        'date_test': {
            '$gte': date_debut,
            '$lte': date_fin
        }
    }
    
    tests_ligne = await db.tests_ligne.find(query, {"_id": 0}).to_list(10000)
    
    # Créer le workbook Excel
    wb = Workbook()
    ws = wb.active
    ws.title = "Tests ligne"
    
    # Styles
    header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='C00000', end_color='C00000', fill_type='solid')
    header_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    
    title_font = Font(name='Calibri', size=14, bold=True, color='C00000')
    title_alignment = Alignment(horizontal='center', vertical='center')
    
    cell_alignment_center = Alignment(horizontal='center', vertical='center')
    cell_alignment_left = Alignment(horizontal='left', vertical='center')
    
    border_style = Border(
        left=Side(style='thin', color='000000'),
        right=Side(style='thin', color='000000'),
        top=Side(style='thin', color='000000'),
        bottom=Side(style='thin', color='000000')
    )
    
    # Titre principal (ligne 1 fusionnée)
    ws.merge_cells('A1:K1')
    title_cell = ws['A1']
    today = dt.now().strftime('%d/%m/%Y')
    title_cell.value = f"BILAN TESTS LIGNE – {partenaire['nom']}"
    title_cell.font = title_font
    title_cell.alignment = title_alignment
    ws.row_dimensions[1].height = 25
    
    # En-têtes (ligne 2)
    headers = ['Date', 'Programme', 'Partenaire', 'N° de tél', 'Messagerie vocale dédiée', 
               'Délai d\'attente', 'Nom du conseiller', 'Décroche dédiée', 
               'Évaluation de l\'accueil', 'Application de l\'offre', 'Commentaire']
    
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=2, column=col_num)
        cell.value = header
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = border_style
    
    ws.row_dimensions[2].height = 30
    
    # Données
    for row_num, test in enumerate(tests_ligne, 3):
        # Date
        date_str = test['date_test'] if isinstance(test['date_test'], str) else test['date_test'].isoformat()
        try:
            date_obj = dt.fromisoformat(date_str.replace('Z', '+00:00'))
            date_formatted = date_obj.strftime('%d/%m/%Y %H:%M')
        except:
            date_formatted = date_str
        
        programme_nom = programmes_dict.get(test['programme_id'], test['programme_id'])
        
        # Récupérer le nom du partenaire
        part = await db.partenaires.find_one({"id": test['partenaire_id']}, {"_id": 0})
        partenaire_nom = part['nom'] if part else test['partenaire_id']
        
        row_data = [
            date_formatted,
            programme_nom,
            partenaire_nom,
            test['numero_telephone'],
            'OUI' if test['messagerie_vocale_dediee'] else 'NON',
            test['delai_attente'],
            test.get('nom_conseiller', 'NC'),
            'OUI' if test['decroche_dedie'] else 'NON',
            test['evaluation_accueil'],
            'OUI' if test['application_offre'] else 'NON',
            test.get('commentaire', '')
        ]
        
        for col_num, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_num, column=col_num)
            cell.value = value
            cell.border = border_style
            
            # Alignement
            if col_num == 11:  # Commentaire
                cell.alignment = cell_alignment_left
            else:
                cell.alignment = cell_alignment_center
    
    # Ajuster largeurs de colonnes
    column_widths = {
        'A': 18,  # Date
        'B': 20,  # Programme
        'C': 20,  # Partenaire
        'D': 18,  # N° de tél
        'E': 20,  # Messagerie vocale dédiée
        'F': 15,  # Délai d'attente
        'G': 20,  # Nom du conseiller
        'H': 15,  # Décroche dédiée
        'I': 20,  # Évaluation de l'accueil
        'J': 18,  # Application de l'offre
        'K': 40   # Commentaire
    }
    
    for col_letter, width in column_widths.items():
        ws.column_dimensions[col_letter].width = width
    
    # Sauvegarder dans un buffer
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    # Nom du fichier
    filename = f"Bilan_Ligne_{partenaire['nom']}_{today.replace('/', '-')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Routes - Export CSV (legacy)
@api_router.get("/export/tests-site")
async def export_tests_site_csv(
    programme_id: Optional[str] = Query(None),
    partenaire_id: Optional[str] = Query(None)
):
    query = {}
    if programme_id:
        query['programme_id'] = programme_id
    if partenaire_id:
        query['partenaire_id'] = partenaire_id
    
    tests = await db.tests_site.find(query, {"_id": 0}).to_list(10000)
    
    # Create CSV
    output = io.StringIO()
    if tests:
        fieldnames = ['id', 'programme_id', 'partenaire_id', 'date_test', 'application_remise',
                     'prix_public', 'prix_remise', 'pct_remise_calcule', 'naming_constate',
                     'cumul_codes', 'commentaire']
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for test in tests:
            # Convert datetime to string
            if 'date_test' in test and not isinstance(test['date_test'], str):
                test['date_test'] = test['date_test'].isoformat() if hasattr(test['date_test'], 'isoformat') else str(test['date_test'])
            # Remove created_at from export
            test.pop('created_at', None)
            writer.writerow({k: test.get(k, '') for k in fieldnames})
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tests_site.csv"}
    )

@api_router.get("/export/tests-ligne")
async def export_tests_ligne_csv(
    programme_id: Optional[str] = Query(None),
    partenaire_id: Optional[str] = Query(None)
):
    query = {}
    if programme_id:
        query['programme_id'] = programme_id
    if partenaire_id:
        query['partenaire_id'] = partenaire_id
    
    tests = await db.tests_ligne.find(query, {"_id": 0}).to_list(10000)
    
    # Create CSV
    output = io.StringIO()
    if tests:
        fieldnames = ['id', 'programme_id', 'partenaire_id', 'date_test', 'numero_telephone',
                     'messagerie_vocale_dediee', 'decroche_dedie', 'delai_attente', 'nom_conseiller',
                     'evaluation_accueil', 'application_offre', 'commentaire']
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for test in tests:
            # Convert datetime to string
            if 'date_test' in test and not isinstance(test['date_test'], str):
                test['date_test'] = test['date_test'].isoformat() if hasattr(test['date_test'], 'isoformat') else str(test['date_test'])
            # Remove created_at from export
            test.pop('created_at', None)
            writer.writerow({k: test.get(k, '') for k in fieldnames})
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tests_ligne.csv"}
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()