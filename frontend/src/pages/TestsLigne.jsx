import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, FileBarChart, Trash2, Filter, Pencil, Phone, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TestsLigne = () => {
  const { getAuthHeader } = useAuth();
  const [tests, setTests] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [bilanDialogOpen, setBilanDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({
    programme_id: '',
    partenaire_id: '',
    date_debut: '',
    date_fin: '',
  });
  const [bilanData, setBilanData] = useState({
    partenaire_id: '',
    date_debut: '',
    date_fin: '',
  });
  const [formData, setFormData] = useState({
    programme_id: '',
    partenaire_id: '',
    date_test: '',
    numero_telephone: '',
    messagerie_vocale_dediee: false,
    decroche_dedie: false,
    delai_attente: '',
    nom_conseiller: 'NC',
    evaluation_accueil: 'Bien',
    application_offre: true,
    commentaire: '',
  });
  const [partenaireTelephone, setPartenaireTelephone] = useState('');
  const [filteredPartenaires, setFilteredPartenaires] = useState([]);
  const [filteredProgrammes, setFilteredProgrammes] = useState([]);

  // Initialize date with current datetime when dialog opens
  useEffect(() => {
    if (dialogOpen && !editingTest) {
      const now = new Date();
      const formattedDate = format(now, "yyyy-MM-dd'T'HH:mm");
      setFormData(prev => ({ ...prev, date_test: formattedDate }));
    }
  }, [dialogOpen, editingTest]);

  // Filter partenaires based on selected programme
  useEffect(() => {
    if (formData.programme_id) {
      const filtered = partenaires.filter(p => 
        p.programmes_ids && p.programmes_ids.includes(formData.programme_id)
      );
      setFilteredPartenaires(filtered);
    } else {
      setFilteredPartenaires(partenaires);
    }
  }, [formData.programme_id, partenaires]);

  // Filter programmes based on selected partenaire
  useEffect(() => {
    if (formData.partenaire_id) {
      const partenaire = partenaires.find(p => p.id === formData.partenaire_id);
      if (partenaire && partenaire.programmes_ids) {
        const filtered = programmes.filter(prog => 
          partenaire.programmes_ids.includes(prog.id)
        );
        setFilteredProgrammes(filtered);
      } else {
        setFilteredProgrammes(programmes);
      }
    } else {
      setFilteredProgrammes(programmes);
    }
  }, [formData.partenaire_id, partenaires, programmes]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchTests();
  }, [filters]);

  const fetchData = async () => {
    try {
      const [progResponse, partResponse] = await Promise.all([
        axios.get(`${API}/programmes`, { headers: getAuthHeader() }),
        axios.get(`${API}/partenaires`, { headers: getAuthHeader() }),
      ]);
      setProgrammes(progResponse.data);
      setPartenaires(partResponse.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get telephone for selected partenaire and programme
  const updatePartenaireTelephone = (programmeId, partenaireId) => {
    if (!programmeId || !partenaireId) {
      setPartenaireTelephone('');
      return;
    }

    const partenaire = partenaires.find(p => p.id === partenaireId);
    if (partenaire && partenaire.contacts_programmes) {
      const contact = partenaire.contacts_programmes.find(c => c.programme_id === programmeId);
      const tel = contact?.numero_telephone || '';
      setPartenaireTelephone(tel);
      // Also update formData with the telephone
      setFormData(prev => ({ ...prev, numero_telephone: tel }));
    } else {
      setPartenaireTelephone('');
    }
  };

  const handleProgrammeChange = (value) => {
    setFormData({ ...formData, programme_id: value });
    updatePartenaireTelephone(value, formData.partenaire_id);
  };

  const handlePartenaireChange = (value) => {
    setFormData({ ...formData, partenaire_id: value });
    updatePartenaireTelephone(formData.programme_id, value);
  };

  const fetchTests = async () => {
    try {
      const params = {};
      if (filters.programme_id) params.programme_id = filters.programme_id;
      if (filters.partenaire_id) params.partenaire_id = filters.partenaire_id;
      if (filters.date_debut) params.date_debut = filters.date_debut;
      if (filters.date_fin) params.date_fin = filters.date_fin;
      
      const response = await axios.get(`${API}/tests-ligne`, { 
        params,
        headers: getAuthHeader()
      });
      setTests(response.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des tests');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate delai_attente format
    const delaiParts = formData.delai_attente.split(':');
    if (delaiParts.length !== 2) {
      toast.error('Format de délai invalide. Utilisez mm:ss');
      return;
    }
    
    const minutes = parseInt(delaiParts[0]);
    const seconds = parseInt(delaiParts[1]);
    
    if (isNaN(minutes) || isNaN(seconds) || seconds > 59 || minutes >= 10) {
      toast.error('Délai invalide. Les minutes doivent être < 10 et les secondes < 60');
      return;
    }

    // Check if test already exists this month for this partenaire/programme (only for new tests)
    if (!editingTest) {
      const testDate = new Date(formData.date_test);
      const currentMonth = testDate.getMonth();
      const currentYear = testDate.getFullYear();
      
      const existingTest = tests.find(t => {
        const tDate = new Date(t.date_test);
        return t.partenaire_id === formData.partenaire_id &&
               t.programme_id === formData.programme_id &&
               tDate.getMonth() === currentMonth &&
               tDate.getFullYear() === currentYear;
      });

      if (existingTest) {
        const monthName = testDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        toast.error(`Un test ligne existe déjà pour ce partenaire sur ce programme en ${monthName}. Maximum 1 test par mois.`);
        return;
      }
    }

    try {
      const submitData = {
        ...formData,
        date_test: new Date(formData.date_test).toISOString(),
      };
      
      if (editingTest) {
        await axios.put(`${API}/tests-ligne/${editingTest.id}`, submitData, { headers: getAuthHeader() });
        toast.success('Test ligne modifié avec succès');
      } else {
        await axios.post(`${API}/tests-ligne`, submitData, { headers: getAuthHeader() });
        toast.success('Test ligne enregistré avec succès');
      }
      
      setDialogOpen(false);
      resetForm();
      setEditingTest(null);
      fetchTests();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.detail?.[0]?.msg || error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    }
  };

  const resetForm = () => {
    setFormData({
      programme_id: '',
      partenaire_id: '',
      date_test: '',
      numero_telephone: '',
      messagerie_vocale_dediee: false,
      decroche_dedie: false,
      delai_attente: '',
      nom_conseiller: 'NC',
      evaluation_accueil: 'Bien',
      application_offre: true,
      commentaire: '',
    });
    setEditingTest(null);
  };

  const handleEdit = (test) => {
    setEditingTest(test);
    setFormData({
      programme_id: test.programme_id,
      partenaire_id: test.partenaire_id,
      date_test: format(new Date(test.date_test), "yyyy-MM-dd'T'HH:mm"),
      numero_telephone: test.numero_telephone,
      messagerie_vocale_dediee: test.messagerie_vocale_dediee,
      decroche_dedie: test.decroche_dedie,
      delai_attente: test.delai_attente,
      nom_conseiller: test.nom_conseiller || 'NC',
      evaluation_accueil: test.evaluation_accueil || 'Bien',
      application_offre: test.application_offre,
      commentaire: test.commentaire || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce test ?')) return;
    try {
      await axios.delete(`${API}/tests-ligne/${id}`, { headers: getAuthHeader() });
      toast.success('Test supprimé');
      fetchTests();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Sorting functions
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedTests = () => {
    if (!sortConfig.key) return tests;

    const sortedTests = [...tests].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle date sorting
      if (sortConfig.key === 'date_test') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      // Handle boolean sorting
      if (sortConfig.key === 'messagerie_vocale_dediee' || sortConfig.key === 'decroche_dedie' || sortConfig.key === 'application_offre') {
        aVal = aVal ? 1 : 0;
        bVal = bVal ? 1 : 0;
      }

      // Handle string sorting (case insensitive)
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || '';
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sortedTests;
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="ml-1 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp size={14} className="ml-1 text-blue-600" /> : 
      <ArrowDown size={14} className="ml-1 text-blue-600" />;
  };

  // Check if test has any alerts
  const getTestAlerts = (test) => {
    const alerts = [];
    
    // Offre non appliquée
    if (!test.application_offre) {
      alerts.push('Offre non appliquée');
    }
    
    // Évaluation médiocre ou moyenne
    if (test.evaluation_accueil === 'Médiocre' || test.evaluation_accueil === 'Moyen') {
      alerts.push(`Accueil ${test.evaluation_accueil.toLowerCase()}`);
    }
    
    // Délai d'attente trop long (> 3 minutes)
    if (test.delai_attente) {
      const parts = test.delai_attente.split(':');
      if (parts.length === 2) {
        const minutes = parseInt(parts[0], 10);
        if (minutes > 3) {
          alerts.push('Délai d\'attente élevé');
        }
      }
    }
    
    return alerts;
  };

  const handleGenerateBilan = async () => {
    if (!bilanData.partenaire_id) {
      toast.error('Veuillez sélectionner un partenaire');
      return;
    }
    if (!bilanData.date_debut || !bilanData.date_fin) {
      toast.error('Veuillez sélectionner une plage de dates');
      return;
    }

    try {
      const response = await axios.get(`${API}/export/bilan-ligne-excel`, {
        params: {
          partenaire_id: bilanData.partenaire_id,
          date_debut: bilanData.date_debut,
          date_fin: bilanData.date_fin,
        },
        responseType: 'blob',
      });
      
      const partenaire = partenaires.find(p => p.id === bilanData.partenaire_id);
      const partenaireNom = partenaire ? partenaire.nom : 'partenaire';
      const today = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
      const filename = `Bilan_Ligne_${partenaireNom}_${today}.xlsx`;
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Bilan généré avec succès');
      setBilanDialogOpen(false);
      setBilanData({
        partenaire_id: '',
        date_debut: '',
        date_fin: '',
      });
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la génération du bilan');
    }
  };

  const getProgrammeName = (id) => {
    const prog = programmes.find((p) => p.id === id);
    return prog ? prog.nom : id;
  };

  const getPartenaireName = (id) => {
    const part = partenaires.find((p) => p.id === id);
    return part ? part.nom : id;
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div data-testid="tests-ligne-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Work Sans' }}>
            Tests Ligne
          </h1>
          <p className="text-gray-600">Gestion des tests téléphoniques</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bilanDialogOpen} onOpenChange={setBilanDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="generate-bilan-btn"
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <FileBarChart size={20} className="mr-2" />
                Générer un bilan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Générer un bilan partenaire</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="bilan-partenaire">Partenaire *</Label>
                  <Select
                    value={bilanData.partenaire_id}
                    onValueChange={(value) => setBilanData({ ...bilanData, partenaire_id: value })}
                  >
                    <SelectTrigger data-testid="bilan-partenaire-select">
                      <SelectValue placeholder="Sélectionnez un partenaire" />
                    </SelectTrigger>
                    <SelectContent>
                      {partenaires.map((part) => (
                        <SelectItem key={part.id} value={part.id}>
                          {part.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date-debut">Date de début *</Label>
                    <Input
                      id="date-debut"
                      type="date"
                      data-testid="bilan-date-debut"
                      value={bilanData.date_debut}
                      onChange={(e) => setBilanData({ ...bilanData, date_debut: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date-fin">Date de fin *</Label>
                    <Input
                      id="date-fin"
                      type="date"
                      data-testid="bilan-date-fin"
                      value={bilanData.date_fin}
                      onChange={(e) => setBilanData({ ...bilanData, date_fin: e.target.value })}
                    />
                  </div>
                </div>
                
                <p className="text-sm text-gray-500">
                  Le bilan inclura tous les tests (tous programmes confondus) pour ce partenaire sur la période sélectionnée.
                </p>
                
                <div className="flex gap-2 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setBilanDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleGenerateBilan}
                    data-testid="confirm-generate-bilan"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Générer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={resetForm}
                data-testid="add-test-ligne-btn"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus size={20} className="mr-2" />
                Nouveau test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTest ? 'Modifier le test ligne' : 'Nouveau test ligne'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="programme_id">Programme *</Label>
                    <Select
                      value={formData.programme_id}
                      onValueChange={handleProgrammeChange}
                      required
                    >
                      <SelectTrigger data-testid="test-ligne-programme-select">
                        <SelectValue placeholder="Sélectionnez un programme" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProgrammes.map((prog) => (
                          <SelectItem key={prog.id} value={prog.id}>
                            {prog.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="partenaire_id">Partenaire *</Label>
                    <Select
                      value={formData.partenaire_id}
                      onValueChange={handlePartenaireChange}
                      required
                    >
                      <SelectTrigger data-testid="test-ligne-partenaire-select">
                        <SelectValue placeholder="Sélectionnez un partenaire" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPartenaires.map((part) => (
                          <SelectItem key={part.id} value={part.id}>
                            {part.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Display telephone if available */}
                {partenaireTelephone && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <Label className="text-sm text-purple-800 font-semibold mb-1 flex items-center gap-2">
                      <Phone size={16} />
                      Numéro de téléphone du partenaire pour ce programme :
                    </Label>
                    <p className="text-purple-900 font-medium text-lg">
                      {partenaireTelephone}
                    </p>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="date_test">Date du test *</Label>
                  <Input
                    id="date_test"
                    type="datetime-local"
                    data-testid="test-ligne-date-input"
                    value={formData.date_test}
                    onChange={(e) => setFormData({ ...formData, date_test: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="numero_telephone">Numéro de téléphone *</Label>
                  <Input
                    id="numero_telephone"
                    data-testid="test-ligne-telephone-input"
                    value={formData.numero_telephone}
                    onChange={(e) => setFormData({ ...formData, numero_telephone: e.target.value })}
                    placeholder="+33 X XX XX XX XX"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="delai_attente">Délai d'attente (mm:ss) *</Label>
                  <Input
                    id="delai_attente"
                    data-testid="test-ligne-delai-input"
                    value={formData.delai_attente}
                    onChange={(e) => setFormData({ ...formData, delai_attente: e.target.value })}
                    placeholder="02:30"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nom_conseiller">Nom du conseiller</Label>
                  <Input
                    id="nom_conseiller"
                    data-testid="test-ligne-conseiller-input"
                    value={formData.nom_conseiller}
                    onChange={(e) => setFormData({ ...formData, nom_conseiller: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="evaluation_accueil">Évaluation de l'accueil *</Label>
                  <Select
                    value={formData.evaluation_accueil}
                    onValueChange={(value) => setFormData({ ...formData, evaluation_accueil: value })}
                    required
                  >
                    <SelectTrigger data-testid="test-ligne-evaluation-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Bien">Bien</SelectItem>
                      <SelectItem value="Moyen">Moyen</SelectItem>
                      <SelectItem value="Médiocre">Médiocre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="messagerie_vocale_dediee"
                      data-testid="test-ligne-messagerie-checkbox"
                      checked={formData.messagerie_vocale_dediee}
                      onChange={(e) => setFormData({ ...formData, messagerie_vocale_dediee: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <Label htmlFor="messagerie_vocale_dediee" className="mb-0">Messagerie dédiée</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="decroche_dedie"
                      data-testid="test-ligne-decroche-checkbox"
                      checked={formData.decroche_dedie}
                      onChange={(e) => setFormData({ ...formData, decroche_dedie: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <Label htmlFor="decroche_dedie" className="mb-0">Décroche dédié</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="application_offre"
                      data-testid="test-ligne-application-offre-checkbox"
                      checked={formData.application_offre}
                      onChange={(e) => setFormData({ ...formData, application_offre: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <Label htmlFor="application_offre" className="mb-0">Application de l'offre</Label>
                  </div>
                </div>
                <div>
                  <Label htmlFor="commentaire">Commentaire</Label>
                  <Textarea
                    id="commentaire"
                    data-testid="test-ligne-commentaire-input"
                    value={formData.commentaire}
                    onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" data-testid="save-test-ligne-btn" className="bg-red-600 hover:bg-red-700">
                    Enregistrer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4 border-0 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Filter size={20} className="text-gray-600" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={filters.programme_id || undefined}
                onValueChange={(value) => setFilters({ ...filters, programme_id: value === 'all' ? '' : value })}
              >
                <SelectTrigger data-testid="filter-programme-select">
                  <SelectValue placeholder="Filtrer par programme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les programmes</SelectItem>
                  {programmes.map((prog) => (
                    <SelectItem key={prog.id} value={prog.id}>
                      {prog.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.partenaire_id || undefined}
                onValueChange={(value) => setFilters({ ...filters, partenaire_id: value === 'all' ? '' : value })}
              >
                <SelectTrigger data-testid="filter-partenaire-select">
                  <SelectValue placeholder="Filtrer par partenaire" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les partenaires</SelectItem>
                  {partenaires.map((part) => (
                    <SelectItem key={part.id} value={part.id}>
                      {part.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-5" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="filter-date-debut" className="text-sm text-gray-600 mb-1.5 block">
                  Date de début
                </Label>
                <Input
                  id="filter-date-debut"
                  type="date"
                  data-testid="filter-date-debut"
                  value={filters.date_debut}
                  onChange={(e) => setFilters({ ...filters, date_debut: e.target.value })}
                  placeholder="Date de début"
                />
              </div>
              <div>
                <Label htmlFor="filter-date-fin" className="text-sm text-gray-600 mb-1.5 block">
                  Date de fin
                </Label>
                <Input
                  id="filter-date-fin"
                  type="date"
                  data-testid="filter-date-fin"
                  value={filters.date_fin}
                  onChange={(e) => setFilters({ ...filters, date_fin: e.target.value })}
                  placeholder="Date de fin"
                />
              </div>
            </div>
            {(filters.date_debut || filters.date_fin) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ ...filters, date_debut: '', date_fin: '' })}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Effacer dates
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tests Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date_test')}
                >
                  <div className="flex items-center">
                    Date
                    <SortIcon columnKey="date_test" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Programme</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Partenaire</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">N° de tél</th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('messagerie_vocale_dediee')}
                >
                  <div className="flex items-center">
                    Messagerie vocale dédiée
                    <SortIcon columnKey="messagerie_vocale_dediee" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('delai_attente')}
                >
                  <div className="flex items-center">
                    Délai d'attente
                    <SortIcon columnKey="delai_attente" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('nom_conseiller')}
                >
                  <div className="flex items-center">
                    Nom du conseiller
                    <SortIcon columnKey="nom_conseiller" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('decroche_dedie')}
                >
                  <div className="flex items-center">
                    Décroche dédiée
                    <SortIcon columnKey="decroche_dedie" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('evaluation_accueil')}
                >
                  <div className="flex items-center">
                    Évaluation de l'accueil
                    <SortIcon columnKey="evaluation_accueil" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('application_offre')}
                >
                  <div className="flex items-center">
                    Application de l'offre
                    <SortIcon columnKey="application_offre" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Alertes</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {getSortedTests().map((test) => {
                const alerts = getTestAlerts(test);
                return (
                <tr key={test.id} className={`hover:bg-gray-50 ${alerts.length > 0 ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {format(new Date(test.date_test), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{getProgrammeName(test.programme_id)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{getPartenaireName(test.partenaire_id)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <a href={`tel:${test.numero_telephone}`} className="text-blue-600 hover:underline">
                      {test.numero_telephone}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        test.messagerie_vocale_dediee
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {test.messagerie_vocale_dediee ? 'OUI' : 'NON'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">{test.delai_attente}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {test.nom_conseiller || <span className="text-gray-400 italic">NC</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        test.decroche_dedie
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {test.decroche_dedie ? 'OUI' : 'NON'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        test.evaluation_accueil === 'Excellent'
                          ? 'bg-green-100 text-green-800'
                          : test.evaluation_accueil === 'Bien'
                          ? 'bg-blue-100 text-blue-800'
                          : test.evaluation_accueil === 'Moyen'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {test.evaluation_accueil}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        test.application_offre
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {test.application_offre ? 'OUI' : 'NON'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {alerts.length > 0 ? (
                      <div className="space-y-1">
                        {alerts.map((alert, idx) => (
                          <div key={idx} className="flex items-center gap-1 text-xs text-red-700">
                            <AlertTriangle size={14} className="flex-shrink-0" />
                            <span>{alert}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-green-600 text-xs">✓ OK</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(test)}
                        data-testid={`edit-test-${test.id}`}
                        title="Modifier"
                      >
                        <Pencil size={16} className="text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(test.id)}
                        data-testid={`delete-test-${test.id}`}
                        title="Supprimer"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {tests.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Aucun test pour le moment</p>
          <Button onClick={resetForm} className="bg-red-600 hover:bg-red-700">
            Créer le premier test
          </Button>
        </div>
      )}
    </div>
  );
};

export default TestsLigne;