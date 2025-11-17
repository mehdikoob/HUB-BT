#!/usr/bin/env python3
"""
Backend API Testing for HUB BLIND TESTS - Messagerie System
Tests all email-related endpoints including templates, signatures, drafts, and sending.
"""

import requests
import json
import sys
from datetime import datetime, timezone
import uuid

# Configuration
BASE_URL = "https://qwertys-hub.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def log_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def log_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def log_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

def test_endpoint(method, endpoint, data=None, expected_status=200, description=""):
    """Generic test function for API endpoints"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=HEADERS)
        elif method.upper() == "POST":
            response = requests.post(url, headers=HEADERS, json=data)
        elif method.upper() == "PUT":
            response = requests.put(url, headers=HEADERS, json=data)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=HEADERS)
        else:
            log_error(f"Unsupported method: {method}")
            return None
        
        if response.status_code == expected_status:
            log_success(f"{method} {endpoint} - {description}")
            return response.json() if response.content else {}
        else:
            log_error(f"{method} {endpoint} - Expected {expected_status}, got {response.status_code}")
            if response.content:
                try:
                    error_detail = response.json()
                    log_error(f"Error details: {error_detail}")
                except:
                    log_error(f"Response: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        log_error(f"{method} {endpoint} - Connection error: {str(e)}")
        return None
    except Exception as e:
        log_error(f"{method} {endpoint} - Unexpected error: {str(e)}")
        return None

def create_test_data():
    """Create test programmes, partenaires, and incidents for email testing"""
    log_info("Creating test data for email testing...")
    
    # Create test programme
    programme_data = {
        "nom": "Programme Test Email",
        "description": "Programme de test pour les emails"
    }
    programme = test_endpoint("POST", "/programmes", programme_data, 200, "Create test programme")
    
    if not programme:
        log_error("Failed to create test programme")
        return None, None, None
    
    # Create test partenaire with email
    partenaire_data = {
        "nom": "Partenaire Test Email",
        "programmes_ids": [programme["id"]],
        "contact_email": "test.partenaire@example.com",
        "remise_minimum": 10.0
    }
    partenaire = test_endpoint("POST", "/partenaires", partenaire_data, 200, "Create test partenaire")
    
    if not partenaire:
        log_error("Failed to create test partenaire")
        return programme, None, None
    
    # Create test site to trigger incident
    test_site_data = {
        "programme_id": programme["id"],
        "partenaire_id": partenaire["id"],
        "date_test": datetime.now(timezone.utc).isoformat(),
        "application_remise": False,  # This will trigger an incident
        "prix_public": 100.0,
        "prix_remise": 100.0,  # No discount applied
        "cumul_codes": False,
        "commentaire": "Test pour génération automatique d'email"
    }
    test_site = test_endpoint("POST", "/tests-site", test_site_data, 200, "Create test site (should trigger incident)")
    
    return programme, partenaire, test_site

def test_email_templates():
    """Test Email Templates endpoints"""
    log_info("Testing Email Templates endpoints...")
    
    # Test GET /email-templates (should auto-create default if empty)
    templates = test_endpoint("GET", "/email-templates", None, 200, "Get email templates (auto-create default)")
    
    if templates is not None:
        log_info(f"Found {len(templates)} templates")
        if len(templates) > 0:
            log_info(f"Default template exists: {any(t.get('is_default', False) for t in templates)}")
    
    # Test POST /email-templates - Create new template
    new_template_data = {
        "name": "Template de Test",
        "subject_template": "Test - [Nom du programme] - [Nature du problème constaté]",
        "body_template": "Bonjour,\n\nNous avons détecté un problème:\n[Observation]\n\nCordialement,",
        "is_default": False
    }
    created_template = test_endpoint("POST", "/email-templates", new_template_data, 200, "Create new email template")
    
    if created_template:
        template_id = created_template["id"]
        
        # Test PUT /email-templates/{id} - Update template
        update_data = {
            "name": "Template de Test Modifié",
            "subject_template": new_template_data["subject_template"],
            "body_template": new_template_data["body_template"] + "\n\nModification de test",
            "is_default": False
        }
        test_endpoint("PUT", f"/email-templates/{template_id}", update_data, 200, "Update email template")
        
        # Test PUT /email-templates/{id}/set-default - Set as default
        test_endpoint("PUT", f"/email-templates/{template_id}/set-default", None, 200, "Set template as default")
        
        # Verify it's now default
        templates_after = test_endpoint("GET", "/email-templates", None, 200, "Verify default template set")
        if templates_after:
            default_template = next((t for t in templates_after if t["id"] == template_id), None)
            if default_template and default_template.get("is_default"):
                log_success("Template correctly set as default")
            else:
                log_error("Template not set as default")
        
        # Test DELETE /email-templates/{id} - Delete template
        test_endpoint("DELETE", f"/email-templates/{template_id}", None, 200, "Delete email template")
    
    return templates

def test_signatures():
    """Test User Signatures endpoints"""
    log_info("Testing User Signatures endpoints...")
    
    # Test GET /signatures
    signatures = test_endpoint("GET", "/signatures", None, 200, "Get user signatures")
    
    # Test POST /signatures - Create new signature
    new_signature_data = {
        "user_name": "Jean Dupont",
        "signature_text": "Jean Dupont\nResponsable Tests\nQWERTYS\nTél: 01 23 45 67 89\nemail: jean.dupont@qwertys.fr"
    }
    created_signature = test_endpoint("POST", "/signatures", new_signature_data, 200, "Create new signature")
    
    if created_signature:
        signature_id = created_signature["id"]
        
        # Test PUT /signatures/{id} - Update signature
        update_data = {
            "user_name": "Jean Dupont",
            "signature_text": new_signature_data["signature_text"] + "\n\n--- Signature mise à jour ---"
        }
        test_endpoint("PUT", f"/signatures/{signature_id}", update_data, 200, "Update signature")
        
        # Test DELETE /signatures/{id} - Delete signature
        test_endpoint("DELETE", f"/signatures/{signature_id}", None, 200, "Delete signature")
    
    return signatures

def test_email_drafts():
    """Test Email Drafts endpoints"""
    log_info("Testing Email Drafts endpoints...")
    
    # First, get incidents to find one for testing
    incidents = test_endpoint("GET", "/incidents", None, 200, "Get incidents for draft testing")
    
    if not incidents or len(incidents) == 0:
        log_warning("No incidents found, creating test data...")
        programme, partenaire, test_site = create_test_data()
        if not programme:
            log_error("Failed to create test data for drafts")
            return None
        
        # Get incidents again
        incidents = test_endpoint("GET", "/incidents", None, 200, "Get incidents after creating test data")
    
    # Test GET /email-drafts
    drafts = test_endpoint("GET", "/email-drafts", None, 200, "Get email drafts")
    
    if drafts is not None:
        log_info(f"Found {len(drafts)} drafts")
        
        # Check if auto-generated drafts exist
        if len(drafts) > 0:
            log_success("Auto-generated drafts found (incident creation working)")
            
            # Test GET /email-drafts/{id} - Get specific draft
            draft_id = drafts[0]["id"]
            specific_draft = test_endpoint("GET", f"/email-drafts/{draft_id}", None, 200, "Get specific draft")
            
            if specific_draft:
                # Test PUT /email-drafts/{id} - Update draft
                update_data = {
                    "incident_id": specific_draft["incident_id"],
                    "subject": specific_draft["subject"] + " - MODIFIÉ",
                    "body": specific_draft["body"] + "\n\nModification de test",
                    "recipient": specific_draft["recipient"],
                    "status": "draft"
                }
                test_endpoint("PUT", f"/email-drafts/{draft_id}", update_data, 200, "Update draft")
                
                # Test POST /email-drafts/{id}/send - Send email (will fail without SMTP password)
                send_data = {"signature_id": None}
                send_result = test_endpoint("POST", f"/email-drafts/{draft_id}/send", send_data, 200, "Send email (expected to fail gracefully)")
                
                if send_result is None:
                    # Try to get the actual response to see the error handling
                    try:
                        url = f"{BASE_URL}/email-drafts/{draft_id}/send"
                        response = requests.post(url, headers=HEADERS, json=send_data)
                        if response.status_code == 200:
                            result = response.json()
                            if result.get("status") == "error" and "SMTP configuration not available" in result.get("message", ""):
                                log_success("Email sending failed gracefully (SMTP not configured)")
                            else:
                                log_warning(f"Unexpected send result: {result}")
                        else:
                            log_warning(f"Send email returned status {response.status_code}")
                    except Exception as e:
                        log_error(f"Error testing email send: {str(e)}")
    
    # Test POST /email-drafts - Create new draft
    if incidents and len(incidents) > 0:
        new_draft_data = {
            "incident_id": incidents[0]["id"],
            "subject": "Test Draft Manual",
            "body": "Ceci est un brouillon de test créé manuellement.",
            "recipient": "test@example.com",
            "status": "draft"
        }
        created_draft = test_endpoint("POST", "/email-drafts", new_draft_data, 200, "Create new draft manually")
        
        if created_draft:
            # Test DELETE /email-drafts/{id} - Delete draft
            test_endpoint("DELETE", f"/email-drafts/{created_draft['id']}", None, 200, "Delete draft")
    
    return drafts

def test_email_history():
    """Test Email History endpoint"""
    log_info("Testing Email History endpoint...")
    
    # Test GET /email-history
    history = test_endpoint("GET", "/email-history", None, 200, "Get email history")
    
    if history is not None:
        log_info(f"Found {len(history)} email history entries")
    
    return history

def test_auto_draft_generation():
    """Test auto-draft generation on incident creation"""
    log_info("Testing auto-draft generation on incident creation...")
    
    # Get current draft count
    drafts_before = test_endpoint("GET", "/email-drafts", None, 200, "Get drafts before incident creation")
    initial_count = len(drafts_before) if drafts_before else 0
    
    # Create test data that will trigger incident
    programme, partenaire, test_site = create_test_data()
    
    if programme and partenaire and test_site:
        # Wait a moment and check drafts again
        import time
        time.sleep(1)
        
        drafts_after = test_endpoint("GET", "/email-drafts", None, 200, "Get drafts after incident creation")
        final_count = len(drafts_after) if drafts_after else 0
        
        if final_count > initial_count:
            log_success(f"Auto-draft generation working! Drafts increased from {initial_count} to {final_count}")
            
            # Check if the new draft has proper variable replacement
            new_drafts = [d for d in drafts_after if d not in (drafts_before or [])]
            if new_drafts:
                draft = new_drafts[0]
                if "[Nom du programme]" not in draft["subject"] and "[Nom du programme]" not in draft["body"]:
                    log_success("Template variable replacement working correctly")
                else:
                    log_warning("Template variables not replaced in auto-generated draft")
        else:
            log_warning("Auto-draft generation may not be working - no new drafts created")

def test_template_variable_replacement():
    """Test template variable replacement logic"""
    log_info("Testing template variable replacement...")
    
    # Get incidents to test variable replacement
    incidents = test_endpoint("GET", "/incidents/enriched", None, 200, "Get enriched incidents for variable testing")
    
    if incidents and len(incidents) > 0:
        incident = incidents[0]
        log_info(f"Testing with incident: {incident.get('description', 'N/A')}")
        
        # Check if incident has programme and partenaire info
        if incident.get('programme_nom') and incident.get('partenaire_nom'):
            log_success("Incident enrichment working - programme and partenaire data available")
        else:
            log_warning("Incident enrichment may have issues - missing programme/partenaire data")

def main():
    """Main test function"""
    print(f"{Colors.BOLD}{Colors.BLUE}🧪 HUB BLIND TESTS - Messagerie Backend API Testing{Colors.ENDC}")
    print(f"{Colors.BLUE}Testing against: {BASE_URL}{Colors.ENDC}")
    print("=" * 80)
    
    # Test basic connectivity
    root_response = test_endpoint("GET", "/", None, 200, "API connectivity check")
    if not root_response:
        log_error("Cannot connect to API. Aborting tests.")
        sys.exit(1)
    
    # Run all tests
    try:
        # Test Email Templates
        print(f"\n{Colors.BOLD}📧 EMAIL TEMPLATES{Colors.ENDC}")
        templates = test_email_templates()
        
        # Test Signatures
        print(f"\n{Colors.BOLD}✍️  USER SIGNATURES{Colors.ENDC}")
        signatures = test_signatures()
        
        # Test Email Drafts
        print(f"\n{Colors.BOLD}📝 EMAIL DRAFTS{Colors.ENDC}")
        drafts = test_email_drafts()
        
        # Test Email History
        print(f"\n{Colors.BOLD}📚 EMAIL HISTORY{Colors.ENDC}")
        history = test_email_history()
        
        # Test Auto-Draft Generation
        print(f"\n{Colors.BOLD}🤖 AUTO-DRAFT GENERATION{Colors.ENDC}")
        test_auto_draft_generation()
        
        # Test Template Variable Replacement
        print(f"\n{Colors.BOLD}🔄 TEMPLATE VARIABLE REPLACEMENT{Colors.ENDC}")
        test_template_variable_replacement()
        
        print(f"\n{Colors.BOLD}{Colors.GREEN}✅ All Messagerie API tests completed!{Colors.ENDC}")
        
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Tests interrupted by user{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        log_error(f"Unexpected error during testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()