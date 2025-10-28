import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileText, Users, AlertCircle, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/stats/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
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
      title: stats?.is_j5_alert ? 'Tests manquants J-5' : 'Tests manquants ce mois',
      value: stats?.is_j5_alert ? stats?.tests_manquants_j5 || 0 : stats?.tests_manquants_count || 0,
      icon: stats?.is_j5_alert ? AlertTriangle : Clock,
      color: stats?.is_j5_alert ? 'text-red-600' : 'text-orange-600',
      bg: stats?.is_j5_alert ? 'bg-red-50' : 'bg-orange-50',
      alert: stats?.is_j5_alert,
    },
    {
      title: 'Incidents Ouverts',
      value: stats?.total_incidents_ouverts || 0,
      icon: AlertCircle,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div data-testid="dashboard">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Work Sans' }}>
          Tableau de bord
        </h1>
        <p className="text-gray-600">Vue d'ensemble des blind tests QWERTYS</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
                stat.alert ? 'ring-2 ring-red-500 animate-pulse' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <Icon className={stat.color} size={24} />
                  </div>
                  {stat.alert && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                      URGENT
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className={`text-3xl font-bold ${stat.alert ? 'text-red-600' : 'text-gray-900'}`}>
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Indicateur de tests mensuels */}
      {stats?.tests_attendus > 0 && (
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-50">
                  <TrendingUp className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Progression mensuelle</p>
                  <p className="text-2xl font-bold text-gray-900">
                    <span className="text-blue-600">{stats.tests_effectues}</span> / {stats.tests_attendus} tests réalisés ce mois-ci
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round((stats.tests_effectues / stats.tests_attendus) * 100)}%
                </div>
                <p className="text-xs text-gray-500">Complétion</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 rounded-full h-2 transition-all duration-300"
                style={{ width: `${Math.min((stats.tests_effectues / stats.tests_attendus) * 100, 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <span className="font-semibold"> {stats.partenaires_manquants} partenaire{stats.partenaires_manquants > 1 ? 's' : ''} n'ont pas encore été testé{stats.partenaires_manquants > 1 ? 's' : ''}</span> ce mois-ci.
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
        <Card className="mb-6 border-0 bg-orange-50 border-l-4 border-l-orange-600">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Clock className="text-orange-600 mt-1" size={24} />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-900 mb-2">
                  Tests mensuels à réaliser
                </h3>
                <p className="text-orange-800 mb-3">
                  {stats.partenaires_manquants} partenaire{stats.partenaires_manquants > 1 ? 's' : ''} n'ont pas encore été testé{stats.partenaires_manquants > 1 ? 's' : ''} ce mois-ci sur tous les programmes.
                </p>
                
                {/* Grouped by programme */}
                <div className="space-y-3">
                  {groupTestsByProgramme(stats.tests_manquants)?.slice(0, 5).map((programme, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-orange-200">
                      <h4 className="text-sm font-semibold text-orange-800 mb-2 flex items-center">
                        <span className="bg-orange-100 px-2 py-0.5 rounded text-xs mr-2">Programme</span>
                        {programme.programme_nom}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-3">
                        {programme.partenaires.slice(0, 6).map((partenaire, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1.5 text-xs">
                            <span className="font-medium text-gray-900">{partenaire.partenaire_nom}</span>
                            <div className="flex gap-1">
                              {partenaire.types_manquants.map((type, tIdx) => (
                                <span key={tIdx} className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                  {type}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {programme.partenaires.length > 6 && (
                        <p className="text-xs text-orange-600 mt-2 pl-3">
                          ... et {programme.partenaires.length - 6} autre{programme.partenaires.length - 6 > 1 ? 's' : ''} partenaire{programme.partenaires.length - 6 > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {groupTestsByProgramme(stats.tests_manquants)?.length > 5 && (
                  <p className="text-sm text-orange-700 mt-3">
                    ... et {groupTestsByProgramme(stats.tests_manquants).length - 5} autre{groupTestsByProgramme(stats.tests_manquants).length - 5 > 1 ? 's' : ''} programme{groupTestsByProgramme(stats.tests_manquants).length - 5 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-red-600" size={20} />
              Taux de réussite Tests Site
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold text-red-600">
                {stats?.taux_reussite_ts || 0}%
              </div>
              <div className="text-sm text-gray-600">
                Tests avec remise appliquée correctement
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-purple-600" size={20} />
              Taux de réussite Tests Ligne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold text-purple-600">
                {stats?.taux_reussite_tl || 0}%
              </div>
              <div className="text-sm text-gray-600">
                Tests avec offre appliquée correctement
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;