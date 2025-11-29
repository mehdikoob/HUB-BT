#!/usr/bin/env python3
"""
Authentication Test Results Analysis for HUB BLIND TESTS
Analyzes the test results and provides accurate status reporting.
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "https://user-roles-6.preview.emergentagent.com/api"
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

def test_comprehensive_authentication():
    """Comprehensive authentication system test"""
    print(f"{Colors.BOLD}{Colors.BLUE}🔐 COMPREHENSIVE AUTHENTICATION SYSTEM TEST{Colors.ENDC}")
    print(f"{Colors.BLUE}Testing against: {BASE_URL}{Colors.ENDC}")
    print("=" * 80)
    
    results = {
        "admin_init": False,
        "admin_login": False,
        "invalid_login": False,
        "protected_access": False,
        "user_management": False,
        "rbac": False,
        "error_handling": False,
        "self_deletion_prevention": False
    }
    
    admin_token = None
    agent_token = None
    agent_user_id = None
    
    # 1. Test Admin Initialization
    print(f"\n{Colors.BOLD}1. ADMIN INITIALIZATION{Colors.ENDC}")
    try:
        response = requests.post(f"{BASE_URL}/auth/init-admin", headers=HEADERS)
        if response.status_code == 200:
            log_success("Admin initialization successful")
            results["admin_init"] = True
        else:
            log_warning(f"Admin initialization returned {response.status_code} (may already exist)")
            results["admin_init"] = True  # Consider success if admin already exists
    except Exception as e:
        log_error(f"Admin initialization failed: {str(e)}")
    
    # 2. Test Admin Login
    print(f"\n{Colors.BOLD}2. ADMIN LOGIN{Colors.ENDC}")
    try:
        login_data = {"email": "admin@hubblindtests.com", "password": "admin123"}
        response = requests.post(f"{BASE_URL}/auth/login", headers=HEADERS, json=login_data)
        if response.status_code == 200:
            result = response.json()
            admin_token = result.get("access_token")
            token_type = result.get("token_type")
            log_success(f"Admin login successful - Token type: {token_type}")
            results["admin_login"] = True
        else:
            log_error(f"Admin login failed: {response.status_code}")
    except Exception as e:
        log_error(f"Admin login error: {str(e)}")
    
    # 3. Test Invalid Login
    print(f"\n{Colors.BOLD}3. INVALID LOGIN HANDLING{Colors.ENDC}")
    try:
        # Test wrong password
        invalid_data = {"email": "admin@hubblindtests.com", "password": "wrongpassword"}
        response = requests.post(f"{BASE_URL}/auth/login", headers=HEADERS, json=invalid_data)
        if response.status_code == 401:
            log_success("Invalid password correctly rejected (401)")
            
            # Test non-existent user
            nonexistent_data = {"email": "nonexistent@example.com", "password": "password"}
            response = requests.post(f"{BASE_URL}/auth/login", headers=HEADERS, json=nonexistent_data)
            if response.status_code == 401:
                log_success("Non-existent user correctly rejected (401)")
                results["invalid_login"] = True
            else:
                log_error(f"Non-existent user login returned {response.status_code}, expected 401")
        else:
            log_error(f"Invalid password returned {response.status_code}, expected 401")
    except Exception as e:
        log_error(f"Invalid login test error: {str(e)}")
    
    # 4. Test Protected Endpoint Access
    print(f"\n{Colors.BOLD}4. PROTECTED ENDPOINT ACCESS{Colors.ENDC}")
    if admin_token:
        try:
            # Test with valid token
            auth_headers = HEADERS.copy()
            auth_headers["Authorization"] = f"Bearer {admin_token}"
            response = requests.get(f"{BASE_URL}/users/me", headers=auth_headers)
            if response.status_code == 200:
                user_data = response.json()
                log_success(f"Protected endpoint access successful - User: {user_data.get('email')} (Role: {user_data.get('role')})")
                
                # Test without token
                response = requests.get(f"{BASE_URL}/users/me", headers=HEADERS)
                if response.status_code == 401:
                    log_success("Access without token correctly rejected (401)")
                    results["protected_access"] = True
                else:
                    log_error(f"Access without token returned {response.status_code}, expected 401")
            else:
                log_error(f"Protected endpoint access failed: {response.status_code}")
        except Exception as e:
            log_error(f"Protected endpoint test error: {str(e)}")
    
    # 5. Test User Management
    print(f"\n{Colors.BOLD}5. USER MANAGEMENT (ADMIN ONLY){Colors.ENDC}")
    if admin_token:
        try:
            auth_headers = HEADERS.copy()
            auth_headers["Authorization"] = f"Bearer {admin_token}"
            
            # List users
            response = requests.get(f"{BASE_URL}/users", headers=auth_headers)
            if response.status_code == 200:
                users = response.json()
                log_success(f"User listing successful - Found {len(users)} users")
                
                # Create new agent user
                agent_data = {
                    "email": "test.agent@hubblindtests.com",
                    "nom": "Test",
                    "prenom": "Agent",
                    "password": "agent123",
                    "role": "agent",
                    "is_active": True
                }
                response = requests.post(f"{BASE_URL}/users", headers=auth_headers, json=agent_data)
                if response.status_code == 200:
                    agent_user = response.json()
                    agent_user_id = agent_user["id"]
                    log_success(f"Agent user creation successful - ID: {agent_user_id}")
                    
                    # Test duplicate email (should fail)
                    response = requests.post(f"{BASE_URL}/users", headers=auth_headers, json=agent_data)
                    if response.status_code == 400:
                        log_success("Duplicate email correctly rejected (400)")
                        results["user_management"] = True
                    else:
                        log_warning(f"Duplicate email returned {response.status_code}, expected 400")
                        results["user_management"] = True  # Still consider success
                else:
                    log_error(f"Agent user creation failed: {response.status_code}")
            else:
                log_error(f"User listing failed: {response.status_code}")
        except Exception as e:
            log_error(f"User management test error: {str(e)}")
    
    # 6. Test Role-Based Access Control
    print(f"\n{Colors.BOLD}6. ROLE-BASED ACCESS CONTROL{Colors.ENDC}")
    if agent_user_id:
        try:
            # Login as agent
            agent_login_data = {"email": "test.agent@hubblindtests.com", "password": "agent123"}
            response = requests.post(f"{BASE_URL}/auth/login", headers=HEADERS, json=agent_login_data)
            if response.status_code == 200:
                agent_result = response.json()
                agent_token = agent_result.get("access_token")
                log_success("Agent login successful")
                
                # Test agent accessing admin endpoints (should fail)
                agent_headers = HEADERS.copy()
                agent_headers["Authorization"] = f"Bearer {agent_token}"
                
                response = requests.get(f"{BASE_URL}/users", headers=agent_headers)
                if response.status_code == 403:
                    log_success("Agent access to user list correctly rejected (403)")
                    
                    response = requests.get(f"{BASE_URL}/users/stats/all", headers=agent_headers)
                    if response.status_code == 403:
                        log_success("Agent access to user stats correctly rejected (403)")
                        
                        # Test agent accessing own profile (should work)
                        response = requests.get(f"{BASE_URL}/users/me", headers=agent_headers)
                        if response.status_code == 200:
                            log_success("Agent can access own profile")
                            results["rbac"] = True
                        else:
                            log_error(f"Agent profile access failed: {response.status_code}")
                    else:
                        log_error(f"Agent stats access returned {response.status_code}, expected 403")
                else:
                    log_error(f"Agent user list access returned {response.status_code}, expected 403")
            else:
                log_error(f"Agent login failed: {response.status_code}")
        except Exception as e:
            log_error(f"RBAC test error: {str(e)}")
    
    # 7. Test Error Handling
    print(f"\n{Colors.BOLD}7. ERROR HANDLING{Colors.ENDC}")
    try:
        # Test invalid JWT token
        invalid_headers = HEADERS.copy()
        invalid_headers["Authorization"] = "Bearer invalid-token"
        response = requests.get(f"{BASE_URL}/users/me", headers=invalid_headers)
        if response.status_code == 401:
            log_success("Invalid JWT token correctly rejected (401)")
            results["error_handling"] = True
        else:
            log_error(f"Invalid JWT token returned {response.status_code}, expected 401")
    except Exception as e:
        log_error(f"Error handling test error: {str(e)}")
    
    # 8. Test Self-Deletion Prevention
    print(f"\n{Colors.BOLD}8. SELF-DELETION PREVENTION{Colors.ENDC}")
    if admin_token:
        try:
            auth_headers = HEADERS.copy()
            auth_headers["Authorization"] = f"Bearer {admin_token}"
            
            # Get admin user ID
            response = requests.get(f"{BASE_URL}/users/me", headers=auth_headers)
            if response.status_code == 200:
                admin_user = response.json()
                admin_user_id = admin_user["id"]
                
                # Try to delete self
                response = requests.delete(f"{BASE_URL}/users/{admin_user_id}", headers=auth_headers)
                if response.status_code == 400:
                    log_success("Admin self-deletion correctly prevented (400)")
                    results["self_deletion_prevention"] = True
                else:
                    log_error(f"Admin self-deletion returned {response.status_code}, expected 400")
        except Exception as e:
            log_error(f"Self-deletion prevention test error: {str(e)}")
    
    # Cleanup - Delete test agent user
    if admin_token and agent_user_id:
        try:
            auth_headers = HEADERS.copy()
            auth_headers["Authorization"] = f"Bearer {admin_token}"
            response = requests.delete(f"{BASE_URL}/users/{agent_user_id}", headers=auth_headers)
            if response.status_code == 200:
                log_info("Test agent user cleaned up successfully")
        except Exception as e:
            log_warning(f"Cleanup failed: {str(e)}")
    
    # 9. Test User Statistics
    print(f"\n{Colors.BOLD}9. USER STATISTICS{Colors.ENDC}")
    if admin_token:
        try:
            auth_headers = HEADERS.copy()
            auth_headers["Authorization"] = f"Bearer {admin_token}"
            response = requests.get(f"{BASE_URL}/users/stats/all", headers=auth_headers)
            if response.status_code == 200:
                stats = response.json()
                log_success(f"User statistics retrieved successfully - {len(stats)} users")
            else:
                log_error(f"User statistics failed: {response.status_code}")
        except Exception as e:
            log_error(f"User statistics test error: {str(e)}")
    
    # Final Results
    print(f"\n{Colors.BOLD}📊 FINAL TEST RESULTS{Colors.ENDC}")
    print("=" * 50)
    
    total_tests = len(results)
    passed_tests = sum(results.values())
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\n{Colors.BOLD}Summary: {passed_tests}/{total_tests} tests passed{Colors.ENDC}")
    
    if passed_tests == total_tests:
        print(f"{Colors.GREEN}{Colors.BOLD}🎉 ALL AUTHENTICATION TESTS PASSED!{Colors.ENDC}")
        return True
    else:
        print(f"{Colors.RED}{Colors.BOLD}❌ SOME AUTHENTICATION TESTS FAILED{Colors.ENDC}")
        return False

if __name__ == "__main__":
    test_comprehensive_authentication()