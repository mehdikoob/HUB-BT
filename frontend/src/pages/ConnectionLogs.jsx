import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Shield, Clock, User, Monitor, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API = process.env.REACT_APP_BACKEND_URL;

const ConnectionLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 50;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/connection-logs`, {
        params: { limit, skip: page * limit },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Erreur:', error);
      if (error.response?.status === 403) {
        toast.error('Accès réservé au super administrateur');
      } else {
        toast.error('Erreur lors du chargement des logs');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handleClearOldLogs = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    if (!window.confirm(`Supprimer tous les logs avant le ${dateStr} ?`)) return;
    
    try {
      const response = await axios.delete(`${API}/api/connection-logs`, {
        params: { before_date: dateStr },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success(response.data.message);
      fetchLogs();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      super_admin: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
      chef_projet: 'bg-blue-100 text-blue-800',
      agent: 'bg-green-100 text-green-800',
      programme: 'bg-yellow-100 text-yellow-800',
      partenaire: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Shield className="text-purple-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logs de Connexion</h1>
            <p className="text-sm text-gray-500">Accès super administrateur uniquement</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchLogs} variant="outline" className="gap-2">
            <RefreshCw size={16} />
            Actualiser
          </Button>
          <Button onClick={handleClearOldLogs} variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 size={16} />
            Purger +30 jours
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            {total} connexion(s) enregistrée(s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucun log de connexion</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Date/Heure</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Utilisateur</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Rôle</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">IP</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Navigateur</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-gray-400" />
                          <span>
                            {format(new Date(log.login_time), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400" />
                          <div>
                            <div className="font-medium">{log.user_prenom} {log.user_nom}</div>
                            <div className="text-xs text-gray-500">{log.user_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(log.user_role)}`}>
                          {log.user_role}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-600 font-mono text-xs">
                        {log.ip_address || 'N/A'}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2 max-w-xs">
                          <Monitor size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-500 truncate" title={log.user_agent}>
                            {log.user_agent?.slice(0, 50) || 'N/A'}...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <span className="text-sm text-gray-500">
                Page {page + 1} sur {Math.ceil(total / limit)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= total}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectionLogs;
