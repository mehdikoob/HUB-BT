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

  const statCards = [
    {
      title: 'Programmes',
      value: stats?.total_programmes || 0,
      icon: FileText,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Partenaires',
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
                  <span className="font-semibold"> {stats.tests_manquants_j5} partenaire{stats.tests_manquants_j5 > 1 ? 's' : ''} n'ont pas encore été testé{stats.tests_manquants_j5 > 1 ? 's' : ''}</span> ce mois-ci.
                </p>
                <div className="space-y-2">
                  {stats.tests_manquants?.map((test, idx) => (
                    <div key={idx} className="text-sm bg-white rounded px-3 py-2 flex items-center justify-between">
                      <span className="font-medium text-gray-900">{test.partenaire_nom}</span>
                      <div className="flex gap-2">
                        {test.types_manquants.map((type, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                            {type}
                          </span>
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
                  {stats.tests_manquants_count} partenaire{stats.tests_manquants_count > 1 ? 's' : ''} n'ont pas encore été testé{stats.tests_manquants_count > 1 ? 's' : ''} ce mois-ci.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {stats.tests_manquants?.slice(0, 6).map((test, idx) => (
                    <div key={idx} className="text-sm bg-white rounded px-3 py-2 flex items-center justify-between">
                      <span className="font-medium text-gray-900">{test.partenaire_nom}</span>
                      <div className="flex gap-1">
                        {test.types_manquants.map((type, i) => (
                          <span key={i} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {stats.tests_manquants_count > 6 && (
                  <p className="text-sm text-orange-700 mt-2">
                    ... et {stats.tests_manquants_count - 6} autre{stats.tests_manquants_count - 6 > 1 ? 's' : ''}
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