import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, FileBarChart, Trash2, Filter, Upload, Paperclip, X, FileImage, FileText, Pencil, Globe, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, FileDown, Copy, Check, User, Lock, ChevronDown, ChevronUp } from 'lucide-react';
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

// Générer les options de mois/année pour les 24 derniers mois
const generateMonthYearOptions = () => {
  const options = [];
  const now = new Date();
  
  for (let i = 0; i < 24; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const value = `${year}-${String(month).padStart(2, '0')}`;
    
    options.push({ value, label: monthName.charAt(0).toUpperCase() + monthName.slice(1) });
  }
  
  return options;
};

// Convertir mois/année en dates début et fin complètes
const monthYearToDateRange = (monthYear) => {
  if (!monthYear) return { start: '', end: '' };
  
  const [year, month] = monthYear.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0, 23, 59, 59);
  
  return {
    start: firstDay.toISOString(),
    end: lastDay.toISOString()
  };
};

const TestsSite = () => {
  const { getAuthHeader } = useAuth();
  const [tests, setTests] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [bilanDialogOpen, setBilanDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Initialiser avec le mois en cours
  const currentMonthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [filters, setFilters] = useState({
    programme_id: '',
    partenaire_id: '',
    date_debut: currentMonthYear,
    date_fin: currentMonthYear,
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
    statut_test: 'effectue',  // 'effectue' ou 'avorte'
    raison_avortement: '',
    application_remise: true,
    prix_public: '',
    prix_remise: '',
    naming_constate: '',
    cumul_codes: false,
    commentaire: '',
    attachments: [],
    screenshots: [],
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [partenaireUrl, setPartenaireUrl] = useState('');
  const [partenaireReferer, setPartenaireReferer] = useState('');
  const [programmeInfo, setProgrammeInfo] = useState(null);
  const [programmeInfoExpanded, setProgrammeInfoExpanded] = useState(false);
  const [filteredPartenaires, setFilteredPartenaires] = useState([]);
  const [filteredProgrammes, setFilteredProgrammes] = useState([]);

  // Initialize date with current datetime when dialog opens
  useEffect(() => {
    if (dialogOpen && !editingTest) {
      const now = new Date();
      const formattedDate = format(now, "yyyy-MM-dd'T'HH:mm");
      setFormData(prev => ({ ...prev, date_test: formattedDate }));
    }
    // Réinitialiser l'accordéon quand le dialog se ferme
    if (!dialogOpen) {
      setProgrammeInfoExpanded(false);
    }
  }, [dialogOpen, editingTest]);

  // Filter partenaires based on selected programme (only those with test_site_requis=true for this programme)
  useEffect(() => {
    if (formData.programme_id) {
      const filtered = partenaires.filter(p => {
        if (!p.contacts_programmes) return false;
        const contact = p.contacts_programmes.find(c => c.programme_id === formData.programme_id);
        return contact && contact.test_site_requis !== false;
      });
      setFilteredPartenaires(filtered);
    } else {
      setFilteredPartenaires(partenaires);
    }
  }, [formData.programme_id, partenaires]);

  // Filter programmes based on selected partenaire (only programmes with test_site_requis=true)
  useEffect(() => {
    if (formData.partenaire_id) {
      const partenaire = partenaires.find(p => p.id === formData.partenaire_id);
      if (partenaire && partenaire.contacts_programmes) {
        const filtered = programmes.filter(prog => {
          const contact = partenaire.contacts_programmes.find(c => c.programme_id === prog.id);
          return contact && contact.test_site_requis !== false;
        });
        setFilteredProgrammes(filtered);
      } else {
        setFilteredProgrammes(programmes);
      }
    } else {
      setFilteredProgrammes(programmes);
    }
  }, [formData.partenaire_id, partenaires, programmes]);

  // Get programme info when programme is selected
  useEffect(() => {
    if (formData.programme_id) {
      const programme = programmes.find(p => p.id === formData.programme_id);
      if (programme && (programme.url_plateforme || programme.identifiant || programme.mot_de_passe)) {
        setProgrammeInfo(programme);
      } else {
        setProgrammeInfo(null);
      }
    } else {
      setProgrammeInfo(null);
    }
  }, [formData.programme_id, programmes]);

  // Calculate discount percentage automatically
  const calculateRemisePercentage = () => {
    const prixPublic = parseFloat(formData.prix_public);
    const prixRemise = parseFloat(formData.prix_remise);
    
    if (prixPublic > 0 && !isNaN(prixRemise)) {
      const percentage = ((prixPublic - prixRemise) / prixPublic) * 100;
      return percentage.toFixed(1);
    }
    return '';
  };

  // Get URL for selected partenaire and programme
  const updatePartenaireUrl = (programmeId, partenaireId) => {
    if (!programmeId || !partenaireId) {
      setPartenaireUrl('');
      return;
    }

    const partenaire = partenaires.find(p => p.id === partenaireId);
    if (partenaire && partenaire.contacts_programmes) {
      const contact = partenaire.contacts_programmes.find(c => c.programme_id === programmeId);
      setPartenaireUrl(contact?.url_site || '');
      setPartenaireReferer(contact?.referer || '');
    } else {
      setPartenaireUrl('');
      setPartenaireReferer('');
    }
  };

  const handleProgrammeChange = (value) => {
    setFormData({ ...formData, programme_id: value });
    updatePartenaireUrl(value, formData.partenaire_id);
  };

  const handlePartenaireChange = (value) => {
    setFormData({ ...formData, partenaire_id: value });
    updatePartenaireUrl(formData.programme_id, value);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non autorisé. Utilisez jpeg, png ou pdf');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 10MB)');
      return;
    }

    setUploadingFile(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await axios.post(`${API}/upload-attachment`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFormData({
        ...formData,
        attachments: [...formData.attachments, response.data],
      });
      toast.success('Fichier ajouté');
      e.target.value = ''; // Reset input
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload');
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = (index) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

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
      // Trier les partenaires par ordre alphabétique
      const sortedPartenaires = partResponse.data.sort((a, b) => 
        a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
      );
      setPartenaires(sortedPartenaires);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      const params = {};
      if (filters.programme_id) params.programme_id = filters.programme_id;
      if (filters.partenaire_id) params.partenaire_id = filters.partenaire_id;
      
      // Convertir les mois/années en dates complètes
      if (filters.date_debut) {
        const range = monthYearToDateRange(filters.date_debut);
        params.date_debut = range.start;
      }
      if (filters.date_fin) {
        const range = monthYearToDateRange(filters.date_fin);
        params.date_fin = range.end;
      }
      
      const response = await axios.get(`${API}/tests-site`, { 
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
    
    // Validations conditionnelles selon le statut
    if (formData.statut_test === 'effectue') {
      if (parseFloat(formData.prix_public) <= 0) {
        toast.error('Le prix public doit être supérieur à 0');
        return;
      }
      
      if (parseFloat(formData.prix_remise) < 0) {
        toast.error('Le prix remisé ne peut pas être négatif');
        return;
      }
    } else if (formData.statut_test === 'avorte') {
      if (!formData.raison_avortement) {
        toast.error('La raison de l\'avortement est obligatoire');
        return;
      }
      if (!formData.commentaire || !formData.commentaire.trim()) {
        toast.error('Le commentaire est obligatoire pour un test avorté');
        return;
      }
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
        toast.error(`Un test site existe déjà pour ce partenaire sur ce programme en ${monthName}. Maximum 1 test par mois.`);
        return;
      }
    }

    try {
      const submitData = {
        ...formData,
        prix_public: formData.prix_public ? parseFloat(formData.prix_public) : null,
        prix_remise: formData.prix_remise ? parseFloat(formData.prix_remise) : null,
        date_test: new Date(formData.date_test).toISOString(),
        attachments: formData.attachments.map(att => typeof att === 'string' ? att : att.url), // Handle both string URLs and objects
      };
      
      if (editingTest) {
        await axios.put(`${API}/tests-site/${editingTest.id}`, submitData, { headers: getAuthHeader() });
        toast.success('Test site modifié avec succès');
      } else {
        await axios.post(`${API}/tests-site`, submitData, { headers: getAuthHeader() });
        toast.success('Test site enregistré avec succès');
      }
      
      setDialogOpen(false);
      resetForm();
      setEditingTest(null);
      fetchTests();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    }
  };

  const resetForm = () => {
    setFormData({
      programme_id: '',
      partenaire_id: '',
      date_test: '',
      statut_test: 'effectue',
      raison_avortement: '',
      application_remise: true,
      prix_public: '',
      prix_remise: '',
      naming_constate: '',
      cumul_codes: false,
      commentaire: '',
      attachments: [],
      screenshots: [],
    });
    setEditingTest(null);
  };

  const handleEdit = (test) => {
    setEditingTest(test);
    setFormData({
      programme_id: test.programme_id,
      partenaire_id: test.partenaire_id,
      date_test: format(new Date(test.date_test), "yyyy-MM-dd'T'HH:mm"),
      statut_test: test.statut_test || 'effectue',
      raison_avortement: test.raison_avortement || '',
      application_remise: test.application_remise !== undefined ? test.application_remise : true,
      prix_public: test.prix_public ? test.prix_public.toString() : '',
      prix_remise: test.prix_remise ? test.prix_remise.toString() : '',
      naming_constate: test.naming_constate || '',
      cumul_codes: test.cumul_codes !== undefined ? test.cumul_codes : false,
      commentaire: test.commentaire || '',
      attachments: test.attachments || [],
      screenshots: test.screenshots || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce test ?')) return;
    try {
      await axios.delete(`${API}/tests-site/${id}`, { headers: getAuthHeader() });
      toast.success('Test supprimé');
      fetchTests();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDownloadAlerteReport = async (testId) => {
    try {
      const response = await axios.get(
        `${API}/export-alerte-report/${testId}?test_type=site`,
        {
          headers: getAuthHeader(),
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_incident_site_${testId}.pdf`);
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

      // Handle numeric sorting
      if (sortConfig.key === 'prix_public' || sortConfig.key === 'prix_remise' || sortConfig.key === 'pct_remise_calcule') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      // Handle boolean sorting
      if (sortConfig.key === 'application_remise' || sortConfig.key === 'cumul_codes') {
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
    
    // Remise non appliquée
    if (!test.application_remise) {
      alerts.push('Remise non appliquée');
    }
    
    // Prix remisé supérieur au prix public
    if (test.prix_remise > test.prix_public) {
      alerts.push('Prix remisé supérieur au prix public');
    }
    
    // Pourcentage de remise négatif ou trop élevé
    if (test.pct_remise_calcule < 0) {
      alerts.push('Remise négative détectée');
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
      const response = await axios.get(`${API}/export/bilan-site-excel`, {
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
      const filename = `Bilan_Site_${partenaireNom}_${today}.xlsx`;
      
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
    <div data-testid="tests-site-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Work Sans' }}>
            Tests Site
          </h1>
          <p className="text-gray-600">Gestion des tests de remises en ligne</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bilanDialogOpen} onOpenChange={setBilanDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="generate-bilan-btn"
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <FileDown size={20} className="mr-2" />
                Export
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Export des tests</DialogTitle>
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
                data-testid="add-test-site-btn"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus size={20} className="mr-2" />
                Nouveau test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTest ? 'Modifier le test site' : 'Nouveau test site'}</DialogTitle>
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
                      <SelectTrigger data-testid="test-site-programme-select">
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
                      <SelectTrigger data-testid="test-site-partenaire-select">
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
                
                {/* Display Programme Info if available - Accordéon replié par défaut */}
                {programmeInfo && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <button
                      type="button"
                      onClick={() => setProgrammeInfoExpanded(!programmeInfoExpanded)}
                      className="w-full flex items-center justify-between text-left hover:bg-green-100 rounded p-2 transition-colors"
                    >
                      <Label className="text-sm text-green-800 font-semibold flex items-center gap-2 cursor-pointer mb-0">
                        <Globe size={16} />
                        Informations de connexion - {programmeInfo.nom}
                      </Label>
                      {programmeInfoExpanded ? <ChevronUp size={18} className="text-green-700" /> : <ChevronDown size={18} className="text-green-700" />}
                    </button>
                    
                    {programmeInfoExpanded && (
                      <div className="space-y-3 mt-3 pt-3 border-t border-green-300">
                      {programmeInfo.url_plateforme && (
                        <div>
                          <p className="text-xs text-green-700 font-medium mb-1">URL de la plateforme :</p>
                          <div className="flex items-center gap-2">
                            <a 
                              href={programmeInfo.url_plateforme} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800 underline font-medium text-sm break-all flex-1"
                            >
                              {programmeInfo.url_plateforme}
                            </a>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(programmeInfo.url_plateforme);
                                toast.success('URL copiée !');
                              }}
                              className="h-8 px-2"
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {programmeInfo.identifiant && (
                        <div>
                          <p className="text-xs text-green-700 font-medium mb-1 flex items-center gap-1">
                            <User size={12} />
                            Identifiant :
                          </p>
                          <div className="flex items-center gap-2 bg-white rounded px-3 py-2 border border-green-300">
                            <code className="text-green-900 font-mono text-sm flex-1 break-all">
                              {programmeInfo.identifiant}
                            </code>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(programmeInfo.identifiant);
                                toast.success('Identifiant copié !');
                              }}
                              className="h-8 px-2"
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {programmeInfo.mot_de_passe && (
                        <div>
                          <p className="text-xs text-green-700 font-medium mb-1 flex items-center gap-1">
                            <Lock size={12} />
                            Mot de passe :
                          </p>
                          <div className="flex items-center gap-2 bg-white rounded px-3 py-2 border border-green-300">
                            <code className="text-green-900 font-mono text-sm flex-1 break-all">
                              {programmeInfo.mot_de_passe}
                            </code>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(programmeInfo.mot_de_passe);
                                toast.success('Mot de passe copié !');
                              }}
                              className="h-8 px-2"
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </div>
                      )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Display URL if available */}
                {partenaireUrl && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <Label className="text-sm text-blue-800 font-semibold mb-1 flex items-center gap-2">
                      <Globe size={16} />
                      Site web du partenaire pour ce programme :
                    </Label>
                    <a 
                      href={partenaireUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline font-medium text-sm break-all"
                    >
                      {partenaireUrl}
                    </a>
                  </div>
                )}
                
                {/* Display Referer if available */}
                {partenaireReferer && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <Label className="text-sm text-purple-800 font-semibold mb-1 flex items-center gap-2">
                      <Globe size={16} />
                      URL Referer :
                    </Label>
                    <p className="text-purple-700 font-medium text-sm break-all">
                      {partenaireReferer}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      URL de référence à utiliser pour effectuer ce test
                    </p>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="date_test">Date du test *</Label>
                  <Input
                    id="date_test"
                    type="datetime-local"
                    data-testid="test-site-date-input"
                    value={formData.date_test}
                    onChange={(e) => setFormData({ ...formData, date_test: e.target.value })}
                    required
                  />
                </div>
                
                {/* Statut du test */}
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <Label htmlFor="statut_test" className="text-base font-semibold text-blue-900">Statut du test *</Label>
                  <Select
                    value={formData.statut_test}
                    onValueChange={(value) => setFormData({ ...formData, statut_test: value })}
                    required
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="effectue">✅ Test effectué</SelectItem>
                      <SelectItem value="avorte">🔴 Test avorté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Si test avorté : Raison obligatoire */}
                {formData.statut_test === 'avorte' && (
                  <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                    <Label htmlFor="raison_avortement" className="text-base font-semibold text-red-900">Raison de l'avortement *</Label>
                    <Select
                      value={formData.raison_avortement}
                      onValueChange={(value) => setFormData({ ...formData, raison_avortement: value })}
                      required
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Sélectionnez une raison" />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="site_inaccessible">🚫 Site inaccessible / URL invalide</SelectItem>
                        <SelectItem value="erreur_technique">⚠️ Erreur technique du site</SelectItem>
                        <SelectItem value="maintenance">🔧 Site en maintenance</SelectItem>
                        <SelectItem value="connexion_impossible">🔐 Connexion impossible</SelectItem>
                        <SelectItem value="autre">❓ Autre (préciser dans commentaires)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Champs techniques - Conditionnels selon statut */}
                {formData.statut_test === 'effectue' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="prix_public">Prix public (€) *</Label>
                    <Input
                      id="prix_public"
                      type="number"
                      step="0.01"
                      data-testid="test-site-prix-public-input"
                      value={formData.prix_public}
                      onChange={(e) => setFormData({ ...formData, prix_public: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="prix_remise">Prix remisé (€) *</Label>
                    <Input
                      id="prix_remise"
                      type="number"
                      step="0.01"
                      data-testid="test-site-prix-remise-input"
                      value={formData.prix_remise}
                      onChange={(e) => setFormData({ ...formData, prix_remise: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="remise_percentage">% Remise (calculé)</Label>
                    <Input
                      id="remise_percentage"
                      type="text"
                      value={calculateRemisePercentage() ? `${calculateRemisePercentage()}%` : ''}
                      readOnly
                      disabled
                      className="bg-gray-50 text-gray-700 font-semibold"
                      placeholder="Auto"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="naming_constate">Naming constaté</Label>
                  <Input
                    id="naming_constate"
                    data-testid="test-site-naming-input"
                    value={formData.naming_constate}
                    onChange={(e) => setFormData({ ...formData, naming_constate: e.target.value })}
                    placeholder="Code promo - [Nom du programme]"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="application_remise"
                      data-testid="test-site-application-remise-checkbox"
                      checked={formData.application_remise}
                      onChange={(e) => setFormData({ ...formData, application_remise: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <Label htmlFor="application_remise" className="mb-0">Application de la remise</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="cumul_codes"
                      data-testid="test-site-cumul-codes-checkbox"
                      checked={formData.cumul_codes}
                      onChange={(e) => setFormData({ ...formData, cumul_codes: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <Label htmlFor="cumul_codes" className="mb-0">Cumul des codes promo</Label>
                  </div>
                </div>
                </>
                )}
                
                {/* Commentaires - Obligatoire si test avorté */}
                <div>
                  <Label htmlFor="commentaire">
                    Commentaire {formData.statut_test === 'avorte' && <span className="text-red-600">*</span>}
                  </Label>
                  <Textarea
                    id="commentaire"
                    data-testid="test-site-commentaire-input"
                    value={formData.commentaire}
                    onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                    rows={3}
                    required={formData.statut_test === 'avorte'}
                    placeholder={formData.statut_test === 'avorte' ? "Décrivez le problème rencontré (obligatoire)" : "Commentaire optionnel"}
                  />
                </div>
                
                {/* File attachments section */}
                <div>
                  <Label>Pièces jointes (jpeg, png, pdf)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      id="file-upload"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-upload"
                      className={`flex flex-col items-center justify-center cursor-pointer ${
                        uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="text-gray-400 mb-2" size={32} />
                      <span className="text-sm text-gray-600">
                        {uploadingFile ? 'Upload en cours...' : 'Cliquez pour ajouter un fichier'}
                      </span>
                      <span className="text-xs text-gray-400 mt-1">
                        JPEG, PNG ou PDF (max 10MB)
                      </span>
                    </label>
                  </div>
                  
                  {/* List of attached files */}
                  {formData.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {formData.attachments.map((file, index) => {
                        const isPdf = file.filename?.toLowerCase().endsWith('.pdf');
                        const Icon = isPdf ? FileText : FileImage;
                        
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                          >
                            <div className="flex items-center gap-2">
                              <Icon size={20} className="text-gray-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-700">{file.filename}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X size={18} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" data-testid="save-test-site-btn" className="bg-red-600 hover:bg-red-700">
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
                  Mois de début
                </Label>
                <Select
                  value={filters.date_debut}
                  onValueChange={(value) => setFilters({ ...filters, date_debut: value })}
                >
                  <SelectTrigger id="filter-date-debut" data-testid="filter-date-debut">
                    <SelectValue placeholder="Sélectionner un mois" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateMonthYearOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-date-fin" className="text-sm text-gray-600 mb-1.5 block">
                  Mois de fin
                </Label>
                <Select
                  value={filters.date_fin}
                  onValueChange={(value) => setFilters({ ...filters, date_fin: value })}
                >
                  <SelectTrigger id="filter-date-fin" data-testid="filter-date-fin">
                    <SelectValue placeholder="Sélectionner un mois" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateMonthYearOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const current = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                setFilters({ ...filters, date_debut: current, date_fin: current });
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Réinitialiser dates
            </Button>
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
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('application_remise')}
                >
                  <div className="flex items-center">
                    Appliquée
                    <SortIcon columnKey="application_remise" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('prix_public')}
                >
                  <div className="flex items-center">
                    Prix public
                    <SortIcon columnKey="prix_public" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('prix_remise')}
                >
                  <div className="flex items-center">
                    Prix remisé
                    <SortIcon columnKey="prix_remise" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('pct_remise_calcule')}
                >
                  <div className="flex items-center">
                    % Remise
                    <SortIcon columnKey="pct_remise_calcule" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Naming de la remise</th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('cumul_codes')}
                >
                  <div className="flex items-center">
                    Cumul codes promos
                    <SortIcon columnKey="cumul_codes" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Pièces jointes</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Alertes</th>
                {/* Colonne "Créé par" - discrète et visible pour tous */}
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500">Créé par</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {getSortedTests().map((test) => {
                const alerts = getTestAlerts(test);
                const isAvorte = test.statut_test === 'avorte';
                return (
                <tr key={test.id} className={`hover:bg-gray-50 ${isAvorte ? 'bg-orange-50 border-l-4 border-orange-500' : alerts.length > 0 ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {format(new Date(test.date_test), 'dd/MM/yyyy HH:mm')}
                    {isAvorte && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
                          🔴 Test avorté
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{getProgrammeName(test.programme_id)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{getPartenaireName(test.partenaire_id)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        test.application_remise
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {test.application_remise ? 'OUI' : 'NON'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{test.prix_public.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{test.prix_remise.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-600">{test.pct_remise_calcule}%</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {test.naming_constate || <span className="text-gray-400 italic">Non renseigné</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        test.cumul_codes
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {test.cumul_codes ? 'OUI' : 'NON'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {test.attachments && test.attachments.length > 0 ? (
                      <div className="flex gap-1">
                        {test.attachments.map((url, idx) => {
                          const isPdf = url.toLowerCase().endsWith('.pdf');
                          const Icon = isPdf ? FileText : FileImage;
                          return (
                            <a
                              key={idx}
                              href={`${process.env.REACT_APP_BACKEND_URL}${url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                              title={`Fichier ${idx + 1}`}
                            >
                              <Icon size={20} />
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Aucune</span>
                    )}
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
                  {/* Colonne "Créé par" - discrète et visible pour tous */}
                  <td className="px-2 py-3 text-xs text-gray-500">
                    {test.created_by ? (
                      <div className="max-w-[100px]">
                        <div className="truncate" title={`${test.created_by.prenom} ${test.created_by.nom}`}>
                          {test.created_by.prenom} {test.created_by.nom?.charAt(0)}.
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">-</span>
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
                      {alerts.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadAlerteReport(test.id)}
                          title="Télécharger le rapport d'alerte"
                        >
                          <FileDown size={16} className="text-orange-600" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                );
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

export default TestsSite;