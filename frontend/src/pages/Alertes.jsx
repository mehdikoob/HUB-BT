import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, AlertCircle, Filter, Trash2, ArrowUpDown, ArrowUp, ArrowDown, FileDown, Settings, Info } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Alertes = () => {
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('');
  const [partenaireFilter, setPartenaireFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [programmes, setProgrammes] = useState([]);
  const [partenaires, setPartenaires] = useState([]);

  useEffect(() => {
    fetchAlertes();
    fetchProgrammes();
    fetchPartenaires();
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

  const fetchProgrammes = async () => {
    try {
      const response = await axios.get(`${API}/programmes`);
      setProgrammes(response.data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const fetchPartenaires = async () => {
    try {
      const response = await axios.get(`${API}/partenaires`);
      setPartenaires(response.data);
    } catch (error) {
      console.error('Erreur:', error);
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

  const handleDownloadReport = async (alerte) => {
    if (!alerte.test_id) {
      toast.error('Aucun test associé à cette alerte');
      return;
    }
    
    const testType = alerte.type_test === 'TL' ? 'ligne' : 'site';
    
    try {
      const response = await axios.get(
        `${API}/export-alerte-report/${alerte.test_id}?test_type=${testType}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_alerte_${alerte.test_id.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Rapport téléchargé avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors du téléchargement du rapport');
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getFilteredAndSortedAlertes = () => {
    let filtered = [...alertes];

    // Apply programme filter
    if (programmeFilter) {
      filtered = filtered.filter(a => a.programme_nom === programmeFilter);
    }

    // Apply partenaire filter
    if (partenaireFilter) {
      filtered = filtered.filter(a => a.partenaire_nom === partenaireFilter);
    }

    // Apply sorting (only by date)
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = new Date(a[sortConfig.key]);
        const bVal = new Date(b[sortConfig.key]);

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="ml-1 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp size={14} className="ml-1 text-blue-600" /> : 
      <ArrowDown size={14} className="ml-1 text-blue-600" />;
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

      {/* Filters & Sort */}
      <Card className="mb-6 p-4 border-0 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-600" />
            <span className="text-sm text-gray-600 font-medium">Filtres :</span>
          </div>

          <Select value={filter || undefined} onValueChange={(value) => setFilter(value === 'all' ? '' : value)}>
            <SelectTrigger data-testid="filter-statut-select" className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="ouvert">Ouverts</SelectItem>
              <SelectItem value="resolu">Résolus</SelectItem>
            </SelectContent>
          </Select>

          <Select value={programmeFilter || undefined} onValueChange={(value) => setProgrammeFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Programme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les programmes</SelectItem>
              {programmes.map((prog) => (
                <SelectItem key={prog.id} value={prog.nom}>
                  {prog.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={partenaireFilter || undefined} onValueChange={(value) => setPartenaireFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Partenaire" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les partenaires</SelectItem>
              {partenaires.map((part) => (
                <SelectItem key={part.id} value={part.nom}>
                  {part.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600 font-medium">Trier par :</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('created_at')}
              className="flex items-center gap-1 text-xs"
            >
              Date
              <SortIcon columnKey="created_at" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Alertes List */}
      <div className="space-y-4">
        {getFilteredAndSortedAlertes().map((alerte) => (
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
                    
                    {/* Points d'attention si présents (nouveau format) */}
                    {alerte.points_attention && alerte.points_attention.length > 0 && (
                      <div className="bg-red-50 border-l-4 border-red-400 p-2 rounded mt-2">
                        <ul className="text-sm text-red-800 space-y-1">
                          {alerte.points_attention.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-red-600 font-bold">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
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
                  {alerte.test_id && (
                    <Button
                      onClick={() => handleDownloadReport(alerte)}
                      data-testid={`download-alerte-${alerte.id}`}
                      variant="outline"
                      className="border-orange-600 text-orange-600 hover:bg-orange-50"
                    >
                      <FileDown size={16} className="mr-2" />
                      PDF
                    </Button>
                  )}
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

      {getFilteredAndSortedAlertes().length === 0 && alertes.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Filter className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-500 text-lg">Aucune alerte ne correspond aux filtres sélectionnés</p>
            <p className="text-sm text-gray-400 mt-2">Essayez de modifier vos critères de filtrage</p>
          </CardContent>
        </Card>
      )}

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