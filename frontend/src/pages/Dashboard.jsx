import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileText, Users, AlertCircle, TrendingUp, Clock, AlertTriangle, BarChart3, CheckCircle2, ListTodo, ChevronDown, ChevronRight, Building2, Phone, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import InsightsIA from '../components/InsightsIA';
import LoadingSpinner from '../components/LoadingSpinner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getAuthHeader } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/stats/dashboard`, {
        headers: getAuthHeader()
      });
      setStats(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Chargement du tableau de bord..." />;
  }

  // Si l'utilisateur est un agent, afficher le dashboard simplifié
  if (stats?.role === 'agent') {
    return <AgentDashboard stats={stats} />;
  }

  // Group tests by programme
  const groupTestsByProgramme = (tests) => {
    if (!tests || tests.length === 0) return [];
    
    const grouped = {};
    tests.forEach(test => {
      const progId = test.programme_id;
      const progNom = test.programme_nom;
      
      if (!grouped[progId]) {
        grouped[progId] = {
          programme_id: progId,
          programme_nom: progNom,
          partenaires: []
        };
      }
      
      grouped[progId].partenaires.push({
        partenaire_nom: test.partenaire_nom,
        types_manquants: test.types_manquants
      });
    });
    
    return Object.values(grouped);
  };

  const statCards = [
    {
      title: 'Programmes enregistrés',
      value: stats?.total_programmes || 0,
      icon: FileText,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Partenaires enregistrés',
      value: stats?.total_partenaires || 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Tests manquants ce mois',
      value: stats?.tests_manquants_reel || 0,
      icon: Clock,
      // Couleur dynamique basée sur l'indicateur backend
      color: stats?.indicateur_couleur === 'green' ? 'text-green-600' : 
             stats?.indicateur_couleur === 'yellow' ? 'text-yellow-600' : 
             'text-red-600',
      bg: stats?.indicateur_couleur === 'green' ? 'bg-green-50' : 
          stats?.indicateur_couleur === 'yellow' ? 'bg-yellow-50' : 
          'bg-red-50',
      badge: stats?.indicateur_statut,
      alert: stats?.indicateur_couleur === 'red',
    },
    {
      title: 'Alertes Ouverts',
      value: stats?.total_incidents_ouverts || 0,
      icon: AlertCircle,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Tests non réalisables',
      value: stats?.tests_non_realisables || 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Moyenne tests / jour',
      value: stats?.moyenne_tests_par_jour || 0,
      icon: BarChart3,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      suffix: ' tests/j',
    },
  ];

  return (
    <div data-testid="dashboard">
      <div className="mb-8 animate-slide-down">
        <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Work Sans' }}>
          Tableau de bord
        </h1>
        <p className="text-gray-600">Vue d&apos;ensemble des blind tests QWERTYS</p>
      </div>

      {/* AI Insights - Visible pour Admin, Super Admin et Chef de projet uniquement */}
      {(stats?.role === 'admin' || stats?.role === 'super_admin' || stats?.role === 'chef_projet') && (
        <div className="mb-8 animate-slide-up animation-delay-100">
          <InsightsIA />
        </div>
      )}

      {/* Stats Cards - VERSION COMPACTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const delays = ['animation-delay-200', 'animation-delay-300', 'animation-delay-400', 'animation-delay-500'];
          return (
            <Card 
              key={index} 
              className={`border-0 shadow-sm hover-lift animate-slide-up ${delays[index % 4]} ${
                stat.alert ? 'ring-2 ring-red-500 animate-pulse' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <Icon className={stat.color} size={20} />
                  </div>
                  {stat.alert && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                      URGENT
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.alert ? 'text-red-600' : 'text-gray-900'}`}>
                    {stat.value}{stat.suffix || ''}
                  </p>
                  {stat.badge && (
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded ${
                      stat.color === 'text-green-600' ? 'bg-green-100 text-green-700' :
                      stat.color === 'text-yellow-600' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {stat.badge}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Indicateur de tests mensuels */}
      {stats?.tests_attendus > 0 && (
        <Card className="mb-4 border-0 shadow-sm hover-lift animate-fade-in animation-delay-300">
          <CardContent className="p-4">
            {/* Progression globale */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <TrendingUp className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Progression mensuelle globale</p>
                  <p className="text-lg font-bold text-gray-900">
                    <span className="text-blue-600">{stats.tests_effectues}</span> / {stats.tests_attendus} tests
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((stats.tests_effectues / stats.tests_attendus) * 100)}%
                </div>
                <p className="text-xs text-gray-500">Complétion</p>
              </div>
            </div>
            {/* Progress bar globale */}
            <div className="mb-4 bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-600 rounded-full h-1.5 transition-all duration-300"
                style={{ width: `${Math.min((stats.tests_effectues / stats.tests_attendus) * 100, 100)}%` }}
              ></div>
            </div>
            
            {/* Progression séparée Site / Ligne */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
              {/* Tests Site */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-red-700">🌐 Tests Site</span>
                  <span className="text-xs font-bold text-red-600">
                    {stats.tests_site_effectues || 0} / {stats.tests_site_attendus || 0}
                  </span>
                </div>
                <div className="bg-red-100 rounded-full h-2">
                  <div 
                    className="bg-red-500 rounded-full h-2 transition-all duration-300"
                    style={{ width: `${stats.tests_site_attendus > 0 ? Math.min((stats.tests_site_effectues / stats.tests_site_attendus) * 100, 100) : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.tests_site_attendus > 0 
                    ? `${Math.round((stats.tests_site_effectues / stats.tests_site_attendus) * 100)}% • Reste ${stats.tests_site_attendus - stats.tests_site_effectues}`
                    : 'Aucun test requis'}
                </p>
              </div>
              
              {/* Tests Ligne */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-purple-700">📞 Tests Ligne</span>
                  <span className="text-xs font-bold text-purple-600">
                    {stats.tests_ligne_effectues || 0} / {stats.tests_ligne_attendus || 0}
                  </span>
                </div>
                <div className="bg-purple-100 rounded-full h-2">
                  <div 
                    className="bg-purple-500 rounded-full h-2 transition-all duration-300"
                    style={{ width: `${stats.tests_ligne_attendus > 0 ? Math.min((stats.tests_ligne_effectues / stats.tests_ligne_attendus) * 100, 100) : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.tests_ligne_attendus > 0 
                    ? `${Math.round((stats.tests_ligne_effectues / stats.tests_ligne_attendus) * 100)}% • Reste ${stats.tests_ligne_attendus - stats.tests_ligne_effectues}`
                    : 'Aucun test requis'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Rates - VERSION COMPACTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card className="border-0 shadow-sm hover-lift animate-slide-up animation-delay-400">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="text-red-600" size={18} />
              Taux de réussite Tests Site
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold text-red-600">
                {stats?.taux_reussite_ts || 0}%
              </div>
              <div className="text-xs text-gray-600">
                Tests avec remise appliquée correctement
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover-lift animate-slide-up animation-delay-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="text-purple-600" size={18} />
              Taux de réussite Tests Ligne
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold text-purple-600">
                {stats?.taux_reussite_tl || 0}%
              </div>
              <div className="text-xs text-gray-600">
                Tests avec offre appliquée correctement
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* J-5 Alert Banner */}
      {stats?.is_j5_alert && stats?.tests_manquants_j5 > 0 && (
        <Card className="mb-6 border-0 bg-red-50 border-l-4 border-l-red-600">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="text-red-600 mt-1" size={24} />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  ⚠️ Alerte J-{stats.days_until_end} : Tests mensuels manquants
                </h3>
                <p className="text-red-800 mb-3">
                  Il reste {stats.days_until_end} jour{stats.days_until_end > 1 ? 's' : ''} avant la fin du mois. 
                  <span className="font-semibold"> {stats.partenaires_manquants} partenaire{stats.partenaires_manquants > 1 ? 's' : ''} n&apos;ont pas encore été testé{stats.partenaires_manquants > 1 ? 's' : ''}</span> ce mois-ci.
                </p>
                
                {/* Grouped by programme */}
                <div className="space-y-4">
                  {groupTestsByProgramme(stats.tests_manquants)?.map((programme, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-4 border border-red-200">
                      <h4 className="text-md font-semibold text-red-800 mb-3 flex items-center">
                        <span className="bg-red-100 px-2 py-1 rounded text-sm mr-2">Programme</span>
                        {programme.programme_nom}
                      </h4>
                      <div className="space-y-2 pl-4">
                        {programme.partenaires.map((partenaire, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                            <span className="text-sm font-medium text-gray-900">{partenaire.partenaire_nom}</span>
                            <div className="flex gap-2">
                              {partenaire.types_manquants.map((type, tIdx) => (
                                <span key={tIdx} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                  {type}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tests manquants (hors J-5) */}
      {!stats?.is_j5_alert && stats?.tests_manquants_count > 0 && (
        <TestsManquantsSection stats={stats} groupTestsByProgramme={groupTestsByProgramme} />
      )}
    </div>
  );
};

// Composant pour afficher les tests manquants avec vue expandable
const TestsManquantsSection = ({ stats, groupTestsByProgramme }) => {
  const [expandedProgrammes, setExpandedProgrammes] = useState({});
  const [showAll, setShowAll] = useState(false);
  
  const groupedTests = groupTestsByProgramme(stats.tests_manquants) || [];
  const displayedProgrammes = showAll ? groupedTests : groupedTests.slice(0, 3);
  
  const toggleProgramme = (progId) => {
    setExpandedProgrammes(prev => ({
      ...prev,
      [progId]: !prev[progId]
    }));
  };
  
  const expandAll = () => {
    const allExpanded = {};
    groupedTests.forEach(prog => { allExpanded[prog.programme_id] = true; });
    setExpandedProgrammes(allExpanded);
    setShowAll(true);
  };
  
  const collapseAll = () => {
    setExpandedProgrammes({});
    setShowAll(false);
  };

  return (
    <Card className="mb-6 border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="text-orange-600" size={18} />
            Tests mensuels à réaliser
            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium ml-2">
              {stats.partenaires_manquants} partenaire{stats.partenaires_manquants > 1 ? 's' : ''}
            </span>
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={expandAll}
              className="text-xs"
            >
              Tout voir
            </Button>
            {showAll && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={collapseAll}
                className="text-xs"
              >
                Réduire
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 max-h-[600px] overflow-y-auto">
        <div className="space-y-2">
          {displayedProgrammes.map((programme) => {
            const isExpanded = expandedProgrammes[programme.programme_id];
            const partenairesToShow = isExpanded ? programme.partenaires : programme.partenaires.slice(0, 3);
            const hasMore = programme.partenaires.length > 3;
            
            return (
              <div 
                key={programme.programme_id} 
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Header du programme */}
                <button
                  onClick={() => toggleProgramme(programme.programme_id)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <Building2 size={18} className="text-orange-600" />
                    <span className="font-semibold text-gray-900">{programme.programme_nom}</span>
                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {programme.partenaires.length} partenaire{programme.partenaires.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {programme.partenaires.some(p => p.types_manquants?.includes('Site')) && (
                      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        <Globe size={12} /> Site
                      </span>
                    )}
                    {programme.partenaires.some(p => p.types_manquants?.includes('Ligne')) && (
                      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        <Phone size={12} /> Ligne
                      </span>
                    )}
                  </div>
                </button>
                
                {/* Liste des partenaires */}
                <div className={`bg-white transition-all ${isExpanded || !hasMore ? '' : ''}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                    {partenairesToShow.map((partenaire, pIdx) => (
                      <div 
                        key={pIdx} 
                        className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 border border-gray-100"
                      >
                        <span className="font-medium text-gray-800 text-sm truncate mr-2">
                          {partenaire.partenaire_nom}
                        </span>
                        <div className="flex gap-1 flex-shrink-0">
                          {partenaire.types_manquants?.map((type, tIdx) => (
                            <span 
                              key={tIdx} 
                              className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1
                                ${type === 'Site' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}
                            >
                              {type === 'Site' ? <Globe size={10} /> : <Phone size={10} />}
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Bouton "Voir plus" si non expanded */}
                  {hasMore && !isExpanded && (
                    <button
                      onClick={() => toggleProgramme(programme.programme_id)}
                      className="w-full py-2 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 transition-colors border-t border-gray-100"
                    >
                      + {programme.partenaires.length - 3} autre{programme.partenaires.length - 3 > 1 ? 's' : ''} partenaire{programme.partenaires.length - 3 > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Bouton voir plus de programmes */}
        {!showAll && groupedTests.length > 3 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full mt-4 py-3 text-sm font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
          >
            Afficher les {groupedTests.length - 3} autre{groupedTests.length - 3 > 1 ? 's' : ''} programme{groupedTests.length - 3 > 1 ? 's' : ''}
          </button>
        )}
      </CardContent>
    </Card>
  );
};

// Dashboard simplifié pour les agents
const AgentDashboard = ({ stats }) => {
  // Grouper les tâches par programme
  const groupTasksByProgramme = (taches) => {
    if (!taches || taches.length === 0) return [];
    
    const grouped = {};
    taches.forEach(tache => {
      const progId = tache.programme_id;
      const progNom = tache.programme_nom;
      
      if (!grouped[progId]) {
        grouped[progId] = {
          programme_id: progId,
          programme_nom: progNom,
          tests: []
        };
      }
      
      grouped[progId].tests.push({
        partenaire_nom: tache.partenaire_nom,
        type_test: tache.type_test,
        priorite: tache.priorite
      });
    });
    
    return Object.values(grouped);
  };

  const groupedTasks = groupTasksByProgramme(stats?.taches_tests || []);

  // Calculs de progression
  const globalProgress = stats?.tests_attendus > 0 
    ? Math.round((stats.tests_effectues / stats.tests_attendus) * 100) 
    : 0;
  const siteProgress = stats?.tests_site_attendus > 0 
    ? Math.round((stats.tests_site_effectues / stats.tests_site_attendus) * 100) 
    : 0;
  const ligneProgress = stats?.tests_ligne_attendus > 0 
    ? Math.round((stats.tests_ligne_effectues / stats.tests_ligne_attendus) * 100) 
    : 0;

  return (
    <div data-testid="agent-dashboard">
      {/* Header avec message encourageant */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Work Sans' }}>
          Mon Espace de Travail
        </h1>
        <p className="text-gray-600">{stats?.message_encourageant || 'Bienvenue !'}</p>
      </div>

      {/* Progression mensuelle - Visible uniquement si des tests sont attendus */}
      {stats?.tests_attendus > 0 && (
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-5">
            {/* Progression globale */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <TrendingUp className="text-blue-600" size={22} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-0.5">Progression mensuelle</p>
                  <p className="text-xl font-bold text-gray-900">
                    <span className="text-blue-600">{stats.tests_effectues}</span> / {stats.tests_attendus} tests
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${
                  globalProgress >= 80 ? 'text-green-600' : 
                  globalProgress >= 50 ? 'text-blue-600' : 
                  'text-orange-600'
                }`}>
                  {globalProgress}%
                </div>
                <p className="text-xs text-gray-500">Complétion</p>
              </div>
            </div>
            
            {/* Barre de progression globale */}
            <div className="mb-5 bg-gray-200 rounded-full h-2.5">
              <div 
                className={`rounded-full h-2.5 transition-all duration-500 ${
                  globalProgress >= 80 ? 'bg-green-500' : 
                  globalProgress >= 50 ? 'bg-blue-500' : 
                  'bg-orange-500'
                }`}
                style={{ width: `${Math.min(globalProgress, 100)}%` }}
              ></div>
            </div>
            
            {/* Progression détaillée Site / Ligne */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              {/* Tests Site */}
              <div className="bg-red-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-red-800 flex items-center gap-1.5">
                    🌐 Tests Site
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    {stats.tests_site_effectues || 0} / {stats.tests_site_attendus || 0}
                  </span>
                </div>
                <div className="bg-red-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 rounded-full h-2 transition-all duration-500"
                    style={{ width: `${Math.min(siteProgress, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-red-700 mt-1.5 font-medium">
                  {siteProgress}% • Reste {Math.max(0, (stats.tests_site_attendus || 0) - (stats.tests_site_effectues || 0))} test{(stats.tests_site_attendus || 0) - (stats.tests_site_effectues || 0) > 1 ? 's' : ''}
                </p>
              </div>
              
              {/* Tests Ligne */}
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
                    📞 Tests Ligne
                  </span>
                  <span className="text-sm font-bold text-purple-600">
                    {stats.tests_ligne_effectues || 0} / {stats.tests_ligne_attendus || 0}
                  </span>
                </div>
                <div className="bg-purple-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 rounded-full h-2 transition-all duration-500"
                    style={{ width: `${Math.min(ligneProgress, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-purple-700 mt-1.5 font-medium">
                  {ligneProgress}% • Reste {Math.max(0, (stats.tests_ligne_attendus || 0) - (stats.tests_ligne_effectues || 0))} test{(stats.tests_ligne_attendus || 0) - (stats.tests_ligne_effectues || 0) > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cartes de résumé */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Tâches à effectuer */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-50">
                <ListTodo className="text-blue-600" size={24} />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Tests à effectuer ce mois</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.total_taches || 0}</p>
            </div>
          </CardContent>
        </Card>

        {/* Alertes en cours */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-50">
                <AlertCircle className="text-orange-600" size={24} />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Alertes nécessitant un suivi</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.total_incidents || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des tâches à effectuer */}
      {stats?.total_taches > 0 && (
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="text-blue-600" size={20} />
              Tests à réaliser ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Voici la liste des tests qui doivent encore être effectués pour ce mois.
            </p>
            
            {/* Groupés par programme */}
            <div className="space-y-4">
              {groupedTasks.slice(0, 10).map((programme, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="bg-blue-100 px-2 py-1 rounded text-sm mr-2">Programme</span>
                    {programme.programme_nom}
                  </h4>
                  <div className="space-y-2 pl-4">
                    {programme.tests.slice(0, 8).map((test, tIdx) => (
                      <div key={tIdx} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-gray-100">
                        <span className="text-sm font-medium text-gray-900">{test.partenaire_nom}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          test.type_test === 'Site' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          Test {test.type_test}
                        </span>
                      </div>
                    ))}
                    {programme.tests.length > 8 && (
                      <p className="text-xs text-gray-500 mt-2">
                        ... et {programme.tests.length - 8} autre{programme.tests.length - 8 > 1 ? 's' : ''} test{programme.tests.length - 8 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {groupedTasks.length > 10 && (
              <p className="text-sm text-gray-600 mt-4">
                ... et {groupedTasks.length - 10} autre{groupedTasks.length - 10 > 1 ? 's' : ''} programme{groupedTasks.length - 10 > 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Message si aucune tâche */}
      {stats?.total_taches === 0 && (
        <Card className="mb-6 border-0 shadow-sm bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="text-green-600" size={32} />
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-1">
                  Tous les tests sont à jour ! 🎉
                </h3>
                <p className="text-green-800">
                  Excellent travail ! Tous les tests mensuels ont été effectués.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertes en cours */}
      {stats?.total_incidents > 0 && (
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="text-orange-600" size={20} />
              Alertes en cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Ces alertes nécessitent un suivi ou une action.
            </p>
            
            <div className="space-y-3">
              {stats.incidents_en_cours.slice(0, 10).map((alerte, idx) => (
                <div key={idx} className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{alerte.partenaire_nom}</p>
                      <p className="text-sm text-gray-600">{alerte.programme_nom}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      alerte.type_test === 'TS' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      Test {alerte.type_test === 'TS' ? 'Site' : 'Ligne'}
                    </span>
                  </div>
                  {alerte.description && (
                    <p className="text-sm text-gray-700 mt-2">{alerte.description}</p>
                  )}
                </div>
              ))}
            </div>
            {stats.incidents_en_cours.length > 10 && (
              <p className="text-sm text-gray-600 mt-4">
                ... et {stats.incidents_en_cours.length - 10} autre{stats.incidents_en_cours.length - 10 > 1 ? 's' : ''} alerte{stats.incidents_en_cours.length - 10 > 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Message si aucun alerte */}
      {stats?.total_incidents === 0 && (
        <Card className="mb-6 border-0 shadow-sm bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="text-green-600" size={32} />
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-1">
                  Aucun alerte en cours 👍
                </h3>
                <p className="text-green-800">
                  Tout se passe bien ! Aucun alerte à signaler pour le moment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;