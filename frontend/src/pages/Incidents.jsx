import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, AlertCircle, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchIncidents();
  }, [filter]);

  const fetchIncidents = async () => {
    try {
      const params = {};
      if (filter) params.statut = filter;
      
      const response = await axios.get(`${API}/incidents`, { params });
      setIncidents(response.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    if (!window.confirm('Marquer cet incident comme résolu ?')) return;
    try {
      await axios.put(`${API}/incidents/${id}`);
      toast.success('Incident résolu');
      fetchIncidents();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la résolution');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div data-testid="incidents-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Work Sans' }}>
          Incidents
        </h1>
        <p className="text-gray-600">Suivi et résolution des incidents détectés</p>
      </div>

      {/* Filter */}
      <Card className="mb-6 p-4 border-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Filter size={20} className="text-gray-600" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger data-testid="filter-statut-select" className="w-64">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les incidents</SelectItem>
              <SelectItem value="ouvert">Ouverts</SelectItem>
              <SelectItem value="resolu">Résolus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Incidents List */}
      <div className="space-y-4">
        {incidents.map((incident) => (
          <Card key={incident.id} className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-lg ${
                      incident.statut === 'ouvert' ? 'bg-red-50' : 'bg-green-50'
                    }`}
                  >
                    {incident.statut === 'ouvert' ? (
                      <AlertCircle className="text-red-600" size={24} />
                    ) : (
                      <CheckCircle className="text-green-600" size={24} />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg mb-2">
                      {incident.type_test === 'TS' ? 'Test Site' : 'Test Ligne'}
                      <span
                        className={`ml-3 px-3 py-1 rounded-full text-xs font-medium ${
                          incident.statut === 'ouvert'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {incident.statut === 'ouvert' ? 'OUVERT' : 'RÉSOLU'}
                      </span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Test ID: {incident.test_id}</span>
                      <span>•</span>
                      <span>Créé le {format(new Date(incident.created_at), 'dd/MM/yyyy à HH:mm')}</span>
                      {incident.resolved_at && (
                        <>
                          <span>•</span>
                          <span>Résolu le {format(new Date(incident.resolved_at), 'dd/MM/yyyy à HH:mm')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {incident.statut === 'ouvert' && (
                  <Button
                    onClick={() => handleResolve(incident.id)}
                    data-testid={`resolve-incident-${incident.id}`}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Résoudre
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {incidents.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <CheckCircle className="mx-auto mb-4 text-green-600" size={48} />
            <p className="text-gray-500 text-lg">Aucun incident pour le moment</p>
            <p className="text-sm text-gray-400 mt-2">Les incidents sont créés automatiquement lors de la détection d'anomalies</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Incidents;