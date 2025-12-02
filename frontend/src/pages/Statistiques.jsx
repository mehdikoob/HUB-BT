import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { BarChart3, Users, ClipboardCheck, AlertCircle } from 'lucide-react';

const Statistiques = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const { getAuthHeader } = useAuth();
  const { toast } = useToast();
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/users/stats/all`, {
        headers: getAuthHeader()
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalTests = () => {
    return stats.reduce((sum, stat) => sum + stat.total_tests, 0);
  };

  const getTotalAlertes = () => {
    return stats.reduce((sum, stat) => sum + stat.incidents_count, 0);
  };

  const getRoleBadge = (role) => {
    return role === 'admin' ? (
      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
        Admin
      </Badge>
    ) : (
      <Badge variant="secondary">
        Agent
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Statistiques</h1>
        <p className="text-gray-600 mt-1">Contributions des utilisateurs</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.length}</div>
            <p className="text-xs text-muted-foreground">
              {stats.filter(s => s.user.is_active).length} actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalTests()}</div>
            <p className="text-xs text-muted-foreground">
              Tous types confondus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alertes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalAlertes()}</div>
            <p className="text-xs text-muted-foreground">
              Détectés par les utilisateurs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Détail par utilisateur
          </CardTitle>
          <CardDescription>
            Contributions individuelles des utilisateurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Utilisateur</th>
                  <th className="text-left py-3 px-4">Rôle</th>
                  <th className="text-center py-3 px-4">Tests Site</th>
                  <th className="text-center py-3 px-4">Tests Ligne</th>
                  <th className="text-center py-3 px-4">Total Tests</th>
                  <th className="text-center py-3 px-4">Alertes</th>
                  <th className="text-left py-3 px-4">Statut</th>
                </tr>
              </thead>
              <tbody>
                {stats
                  .sort((a, b) => b.total_tests - a.total_tests)
                  .map((stat) => (
                    <tr key={stat.user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">
                            {stat.user.prenom} {stat.user.nom}
                          </p>
                          <p className="text-sm text-gray-600">{stat.user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getRoleBadge(stat.user.role)}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="font-medium">{stat.tests_site_count}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="font-medium">{stat.tests_ligne_count}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="font-bold text-blue-600">{stat.total_tests}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="font-medium text-orange-600">
                          {stat.incidents_count}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {stat.user.is_active ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Inactif</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {stats.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucune statistique disponible
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Statistiques;
