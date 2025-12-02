import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, AlertCircle, Filter, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Alertes = () => {
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchAlertes();
  }, [filter]);

  const fetchAlertes = async () => {
    try {
      const params = {};
      if (filter) params.statut = filter;
      
      const response = await axios.get(`${API}/alertes/enriched`, { params });
      setAlertes(response.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des alertes');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    if (!window.confirm('Marquer cet alerte comme résolu ?')) return;
    try {
      await axios.put(`${API}/alertes/${id}`);
      toast.success('Alerte résolu');
      fetchAlertes();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la résolution');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet alerte résolu ?')) return;
    try {
      await axios.delete(`${API}/alertes/${id}`);
      toast.success('Alerte supprimé');
      fetchAlertes();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div data-testid="alertes-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Work Sans' }}>
          Alertes
        </h1>
        <p className="text-gray-600">Suivi et résolution des alertes détectés</p>
      </div>

      {/* Filter */}
      <Card className="mb-6 p-4 border-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Filter size={20} className="text-gray-600" />
          <Select value={filter || undefined} onValueChange={(value) => setFilter(value === 'all' ? '' : value)}>
            <SelectTrigger data-testid="filter-statut-select" className="w-64">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les alertes</SelectItem>
              <SelectItem value="ouvert">Ouverts</SelectItem>
              <SelectItem value="resolu">Résolus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Alertes List */}
      <div className="space-y-4">
        {alertes.map((alerte) => (
          <Card 
            key={alerte.id} 
            className="border-0 shadow-sm"
            style={{ 
              backgroundColor: alerte.statut === 'ouvert' ? '#FFE5E5' : '#E8F8E8' 
            }}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-lg ${
                      alerte.statut === 'ouvert' ? 'bg-red-100' : 'bg-green-100'
                    }`}
                  >
                    {alerte.statut === 'ouvert' ? (
                      <AlertCircle className="text-red-600" size={24} />
                    ) : (
                      <CheckCircle className="text-green-600" size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">
                      {alerte.type_test === 'TS' ? 'Test Site' : 'Test Ligne'}
                      <span
                        className={`ml-3 px-3 py-1 rounded-full text-xs font-medium ${
                          alerte.statut === 'ouvert'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {alerte.statut === 'ouvert' ? 'OUVERT' : 'RÉSOLU'}
                      </span>
                    </CardTitle>
                    
                    {/* Programme and Partenaire */}
                    <div className="mb-3 space-y-1">
                      {alerte.programme_nom && (
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Programme :</span> {alerte.programme_nom}
                        </p>
                      )}
                      {alerte.partenaire_nom && (
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Partenaire :</span> {alerte.partenaire_nom}
                        </p>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{alerte.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span>Créé le {format(new Date(alerte.created_at), 'dd/MM/yyyy à HH:mm')}</span>
                      {alerte.resolved_at && (
                        <>
                          <span>•</span>
                          <span>Résolu le {format(new Date(alerte.resolved_at), 'dd/MM/yyyy à HH:mm')}</span>
                        </>
                      )}
                    </div>
                    
                    {/* Contact */}
                    {alerte.partenaire_contact_email && (
                      <div className="pt-2 border-t border-gray-300">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Contact :</span>{' '}
                          <a 
                            href={`mailto:${alerte.partenaire_contact_email}`}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            📧 {alerte.partenaire_contact_email}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {alerte.statut === 'ouvert' ? (
                    <Button
                      onClick={() => handleResolve(alerte.id)}
                      data-testid={`resolve-alerte-${alerte.id}`}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Résoudre
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleDelete(alerte.id)}
                      data-testid={`delete-alerte-${alerte.id}`}
                      variant="outline"
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {alertes.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <CheckCircle className="mx-auto mb-4 text-green-600" size={48} />
            <p className="text-gray-500 text-lg">Aucun alerte pour le moment</p>
            <p className="text-sm text-gray-400 mt-2">Les alertes sont créés automatiquement lors de la détection d'anomalies</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Alertes;