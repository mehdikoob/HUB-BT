import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileText, Users, ClipboardCheck, Phone, AlertCircle, TrendingUp } from 'lucide-react';
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
      title: 'Tests Site',
      value: stats?.total_tests_site || 0,
      icon: ClipboardCheck,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Tests Ligne',
      value: stats?.total_tests_ligne || 0,
      icon: Phone,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Incidents Ouverts',
      value: stats?.total_incidents_ouverts || 0,
      icon: AlertCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <Icon className={stat.color} size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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