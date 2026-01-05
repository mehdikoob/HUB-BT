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
import ScreenshotUploader from '../components/ScreenshotUploader';

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
  const [sortConfig, setSortConfig] = useState({ key: 'date_test', direction: 'desc' });
  const [selectedTests, setSelectedTests] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
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
    test_non_realisable: false,  // Checkbox simple
    application_remise: true,
    prix_public: '',
    prix_remise: '',
    naming_constate: '',
    cumul_codes: false,
    commentaire: '',
    screenshots: [],
  });
  const [partenaireUrl, setPartenaireUrl] = useState('');
  const [partenaireReferer, setPartenaireReferer] = useState('');
  const [partenaireCodePromo, setPartenaireCodePromo] = useState('');
  const [programmeInfo, setProgrammeInfo] = useState(null);
  const [programmeInfoExpanded, setProgrammeInfoExpanded] = useState(false);
  const [filteredPartenaires, setFilteredPartenaires] = useState([]);
  const [filteredProgrammes, setFilteredProgrammes] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

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
        // Afficher SEULEMENT si test_site_requis est explicitement true
        return contact && contact.test_site_requis === true;
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
          // Afficher SEULEMENT si test_site_requis est explicitement true
          return contact && contact.test_site_requis === true;
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

  // Get URL, referer and code promo for selected partenaire and programme
  const updatePartenaireInfo = (programmeId, partenaireId) => {
    if (!programmeId || !partenaireId) {
      setPartenaireUrl('');
      setPartenaireReferer('');
      setPartenaireCodePromo('');
      return;
    }

    const partenaire = partenaires.find(p => p.id === partenaireId);
    if (partenaire && partenaire.contacts_programmes) {
      const contact = partenaire.contacts_programmes.find(c => c.programme_id === programmeId);
      setPartenaireUrl(contact?.url_site || '');
      setPartenaireReferer(contact?.referer || '');
      setPartenaireCodePromo(contact?.code_promo || '');
    } else {
      setPartenaireUrl('');
      setPartenaireReferer('');
      setPartenaireCodePromo('');
    }
  };

  const handleProgrammeChange = (value) => {
    setFormData({ ...formData, programme_id: value });
    updatePartenaireInfo(value, formData.partenaire_id);
  };

  const handlePartenaireChange = (value) => {
    setFormData({ ...formData, partenaire_id: value });
    updatePartenaireInfo(formData.programme_id, value);
  };

  // Vérification des doublons en temps réel
  useEffect(() => {
    const checkDuplicate = async () => {
      // Seulement si les deux sont renseignés et qu'on n'est pas en mode édition
      if (formData.partenaire_id && formData.programme_id && !editingTest) {
        setCheckingDuplicate(true);
        try {
          const response = await axios.get(`${API}/check-duplicate-test`, {
            params: {
              partenaire_id: formData.partenaire_id,
              programme_id: formData.programme_id,
              test_type: 'site'
            },
            headers: getAuthHeader()
          });
          
          if (response.data.exists) {
            setDuplicateWarning(response.data.test);
          } else {
            setDuplicateWarning(null);
          }
        } catch (error) {
          console.error('Erreur vérification doublon:', error);
          // Ne pas bloquer si l'API échoue
          setDuplicateWarning(null);
        } finally {
          setCheckingDuplicate(false);
        }
      } else {
        setDuplicateWarning(null);
      }
    };

    checkDuplicate();
  }, [formData.partenaire_id, formData.programme_id, editingTest, getAuthHeader]);

  // File upload removed - Using only CTRL+V screenshots now

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
    
    // Si test non réalisable : créer un test minimal ET une alerte
    if (formData.test_non_realisable) {
      if (!formData.commentaire || !formData.commentaire.trim()) {
        toast.error('Le commentaire est obligatoire pour un test non réalisable');
        return;
      }
      
      try {
        // Créer d'abord un test minimal
        const testData = {
          programme_id: formData.programme_id,
          partenaire_id: formData.partenaire_id,
          date_test: formData.date_test,
          test_non_realisable: true,
          commentaire: formData.commentaire,
          screenshots: formData.screenshots,
          // Champs techniques optionnels avec valeurs par défaut
          application_remise: false,
          prix_public: 0,
          prix_remise: 0,
          naming_constate: "N/A - Test non réalisable",
          cumul_codes: false,
        };
        
        const testResponse = await axios.post(`${API}/tests-site`, testData, {
          headers: getAuthHeader()
        });
        
        // Puis créer l'alerte associée au test
        await axios.post(`${API}/alertes`, {
          programme_id: formData.programme_id,
          partenaire_id: formData.partenaire_id,
          type_test: 'TS',
          description: `Test site non réalisable - ${formData.commentaire}`,
          statut: 'ouvert',
          screenshots: formData.screenshots,
          test_id: testResponse.data.id,
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        toast.success('Test non réalisable enregistré avec alerte créée');
        resetForm();
        setDialogOpen(false);
        fetchTests();
      } catch (error) {
        console.error('Erreur création test non réalisable:', error);
        toast.error(error.response?.data?.detail || 'Erreur lors de la création');
      }
      return;
    }
    
    // Si test réalisable : procédure normale
    // Champs techniques obligatoires
    if (!formData.prix_public || parseFloat(formData.prix_public) <= 0) {
      toast.error('Le prix public doit être supérieur à 0');
      return;
    }
    
    if (!formData.prix_remise || parseFloat(formData.prix_remise) < 0) {
      toast.error('Le prix remisé ne peut pas être négatif');
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

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTests([]);
    } else {
      setSelectedTests(tests.map(test => test.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectTest = (testId) => {
    if (selectedTests.includes(testId)) {
      setSelectedTests(selectedTests.filter(id => id !== testId));
      setSelectAll(false);
    } else {
      setSelectedTests([...selectedTests, testId]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTests.length === 0) return;
    
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedTests.length} test(s) ?`)) return;
    
    try {
      // Supprimer chaque test sélectionné
      const deletePromises = selectedTests.map(testId =>
        axios.delete(`${API}/tests-site/${testId}`, {
          headers: getAuthHeader()
        })
      );
      
      await Promise.all(deletePromises);
      
      toast.success(`${selectedTests.length} test(s) supprimé(s) avec succès`);
      setSelectedTests([]);
      setSelectAll(false);
      fetchTests();
    } catch (error) {
      console.error('Erreur suppression multiple:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      programme_id: '',
      partenaire_id: '',
      date_test: '',
      test_non_realisable: false,
      application_remise: true,
      prix_public: '',
      prix_remise: '',
      naming_constate: '',
      cumul_codes: false,
      commentaire: '',
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
      test_non_realisable: test.test_non_realisable || false,
      application_remise: test.application_remise !== undefined ? test.application_remise : true,
      prix_public: test.prix_public ? test.prix_public.toString() : '',
      prix_remise: test.prix_remise ? test.prix_remise.toString() : '',
      naming_constate: test.naming_constate || '',
      cumul_codes: test.cumul_codes !== undefined ? test.cumul_codes : false,
      commentaire: test.commentaire || '',
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
    const exportType = bilanData.export_type || 'partenaire';
    
    if (exportType === 'partenaire' && !bilanData.partenaire_id) {
      toast.error('Veuillez sélectionner un partenaire');
      return;
    }
    if (exportType === 'programme' && !bilanData.programme_id) {
      toast.error('Veuillez sélectionner un programme');
      return;
    }
    if (!bilanData.date_debut || !bilanData.date_fin) {
      toast.error('Veuillez sélectionner une plage de dates');
      return;
    }

    try {
      const params = {
        date_debut: bilanData.date_debut,
        date_fin: bilanData.date_fin,
      };
      
      if (exportType === 'partenaire') {
        params.partenaire_id = bilanData.partenaire_id;
      } else {
        params.programme_id = bilanData.programme_id;
      }

      const response = await axios.get(`${API}/export/bilan-site-excel`, {
        params: params,
        responseType: 'blob',
      });
      
      let filename;
      if (exportType === 'partenaire') {
        const partenaire = partenaires.find(p => p.id === bilanData.partenaire_id);
        const partenaireNom = partenaire ? partenaire.nom : 'partenaire';
        const today = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
        filename = `Tests_Site_${partenaireNom}_${today}.xlsx`;
      } else {
        const programme = programmes.find(p => p.id === bilanData.programme_id);
        const programmeNom = programme ? programme.nom : 'programme';
        const today = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
        filename = `Tests_Site_${programmeNom}_${today}.xlsx`;
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export généré avec succès');
      setBilanDialogOpen(false);
      setBilanData({
        partenaire_id: '',
        programme_id: '',
        export_type: 'partenaire',
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
                <DialogTitle>Export des tests sites</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="export-type">Type d'export *</Label>
                  <Select
                    value={bilanData.export_type || 'partenaire'}
                    onValueChange={(value) => setBilanData({ ...bilanData, export_type: value, partenaire_id: '', programme_id: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="partenaire">Par Partenaire</SelectItem>
                      <SelectItem value="programme">Par Programme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(!bilanData.export_type || bilanData.export_type === 'partenaire') && (
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
                )}

                {bilanData.export_type === 'programme' && (
                  <div>
                    <Label htmlFor="bilan-programme">Programme *</Label>
                    <Select
                      value={bilanData.programme_id}
                      onValueChange={(value) => setBilanData({ ...bilanData, programme_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un programme" />
                      </SelectTrigger>
                      <SelectContent>
                        {programmes.map((prog) => (
                          <SelectItem key={prog.id} value={prog.id}>
                            {prog.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
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
                  {(!bilanData.export_type || bilanData.export_type === 'partenaire') 
                    ? "L'export inclura tous les tests (tous programmes confondus) pour ce partenaire sur la période sélectionnée."
                    : "L'export inclura tous les tests (tous partenaires confondus) pour ce programme sur la période sélectionnée."}
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
          
          <div className="flex gap-2">
            {selectedTests.length > 0 && (
              <Button
                onClick={handleDeleteSelected}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 size={16} />
                Supprimer {selectedTests.length} test(s)
              </Button>
            )}
            
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
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">{editingTest ? 'Modifier le test site' : 'Nouveau test site'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-2 py-2">
                <div className="grid grid-cols-2 gap-3">
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

                {/* Bandeau d'avertissement si doublon détecté */}
                {duplicateWarning && (
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-orange-900 mb-1">
                          ⚠️ Test déjà existant ce mois-ci
                        </h4>
                        <p className="text-xs text-orange-800 mb-2">
                          Un test pour <strong>{duplicateWarning.partenaire_nom}</strong> x <strong>{duplicateWarning.programme_nom}</strong> existe déjà ce mois-ci
                        </p>
                        <div className="text-xs text-orange-700 space-y-0.5">
                          <p>• Créé le : {new Date(duplicateWarning.date_test).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          {duplicateWarning.created_by && (
                            <p>• Créé par : {duplicateWarning.created_by.prenom} {duplicateWarning.created_by.nom}</p>
                          )}
                        </div>
                        <p className="text-xs text-orange-600 mt-2 italic">
                          Vous pouvez quand même créer ce test, mais assurez-vous qu'il s'agit d'un nouveau test distinct.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Display Programme Info if available - Accordéon replié par défaut */}
                {programmeInfo && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                    <button
                      type="button"
                      onClick={() => setProgrammeInfoExpanded(!programmeInfoExpanded)}
                      className="w-full flex items-center justify-between text-left hover:bg-green-100 rounded p-1.5 transition-colors"
                    >
                      <Label className="text-xs text-green-800 font-semibold flex items-center gap-1.5 cursor-pointer mb-0">
                        <Globe size={14} />
                        Informations de connexion - {programmeInfo.nom}
                      </Label>
                      {programmeInfoExpanded ? <ChevronUp size={16} className="text-green-700" /> : <ChevronDown size={16} className="text-green-700" />}
                    </button>
                    
                    {programmeInfoExpanded && (
                      <div className="space-y-2 mt-2 pt-2 border-t border-green-300">
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <Label className="text-xs text-blue-800 font-semibold mb-1 flex items-center gap-1.5">
                      <Globe size={14} />
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
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                    <Label className="text-xs text-purple-800 font-semibold mb-0.5 flex items-center gap-1.5">
                      <Globe size={14} />
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
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="prix_public" className="text-sm">
                      Prix public (€) {!formData.test_non_realisable && '*'}
                    </Label>
                    <Input
                      id="prix_public"
                      type="number"
                      step="0.01"
                      data-testid="test-site-prix-public-input"
                      value={formData.prix_public}
                      onChange={(e) => setFormData({ ...formData, prix_public: e.target.value })}
                      required={!formData.test_non_realisable}
                      disabled={formData.test_non_realisable}
                    />
                  </div>
                  <div>
                    <Label htmlFor="prix_remise">
                      Prix remisé (€) {!formData.test_non_realisable && '*'}
                    </Label>
                    <Input
                      id="prix_remise"
                      type="number"
                      step="0.01"
                      data-testid="test-site-prix-remise-input"
                      value={formData.prix_remise}
                      onChange={(e) => setFormData({ ...formData, prix_remise: e.target.value })}
                      required={!formData.test_non_realisable}
                      disabled={formData.test_non_realisable}
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
                
                {/* Checkbox Test non réalisable - Positionné juste avant commentaire */}
                <div className="border-l-4 border-orange-400 pl-3 py-1.5 bg-orange-50">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="test_non_realisable"
                      checked={formData.test_non_realisable}
                      onChange={(e) => {
                        const isNonRealisable = e.target.checked;
                        setFormData({ 
                          ...formData, 
                          test_non_realisable: isNonRealisable,
                          // Si non réalisable, décocher automatiquement les champs techniques
                          ...(isNonRealisable && {
                            application_remise: false,
                            cumul_codes: false
                          })
                        });
                      }}
                      className="w-4 h-4 mt-0.5 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <Label htmlFor="test_non_realisable" className="text-xs font-medium text-orange-900 cursor-pointer">
                        Test non réalisable
                      </Label>
                      <p className="text-xs text-orange-700 mt-0">
                        Cocher uniquement si le test n&apos;a pas pu être effectué
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Objet - Obligatoire si test non réalisable */}
                <div>
                  <Label htmlFor="commentaire" className="text-sm">
                    Objet {formData.test_non_realisable && <span className="text-red-600">*</span>}
                  </Label>
                  <Textarea
                    id="commentaire"
                    data-testid="test-site-commentaire-input"
                    value={formData.commentaire}
                    onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                    rows={2}
                    required={formData.test_non_realisable}
                    placeholder={formData.test_non_realisable ? "Décrivez pourquoi le test n'a pas pu être réalisé (obligatoire)" : "Objet du test (optionnel)"}
                  />
                </div>
                
                {/* Screenshot Uploader - CTRL+V */}
                <ScreenshotUploader
                  screenshots={formData.screenshots}
                  onScreenshotsChange={(newScreenshots) => setFormData({ ...formData, screenshots: newScreenshots })}
                  maxScreenshots={3}
                />
                
                {/* File attachments removed - Using only CTRL+V screenshots now */}
                
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
                <th className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                  />
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date_test')}
                >
                  <div className="flex items-center">
                    Date
                    <SortIcon columnKey="date_test" />
                  </div>
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700">Programme</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700">Partenaire</th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('application_remise')}
                >
                  <div className="flex items-center">
                    Appliquée
                    <SortIcon columnKey="application_remise" />
                  </div>
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700">Objet</th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('prix_public')}
                >
                  <div className="flex items-center">
                    Prix public
                    <SortIcon columnKey="prix_public" />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('prix_remise')}
                >
                  <div className="flex items-center">
                    Prix remisé
                    <SortIcon columnKey="prix_remise" />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('pct_remise_calcule')}
                >
                  <div className="flex items-center">
                    % Remise
                    <SortIcon columnKey="pct_remise_calcule" />
                  </div>
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700">Naming remise</th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('cumul_codes')}
                >
                  <div className="flex items-center">
                    Cumul codes
                    <SortIcon columnKey="cumul_codes" />
                  </div>
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700">Alertes</th>
                {/* Colonne "Créé par" - discrète et visible pour tous */}
                <th className="px-1 py-2 text-left text-xs font-medium text-gray-500">Créé par</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {getSortedTests().map((test) => {
                const alerts = getTestAlerts(test);
                const isNonRealisable = test.test_non_realisable === true;
                return (
                <tr key={test.id} className={`hover:bg-gray-50 ${isNonRealisable ? 'bg-orange-50 border-l-4 border-orange-500' : alerts.length > 0 ? 'bg-red-50' : ''}`}>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selectedTests.includes(test.id)}
                      onChange={() => handleSelectTest(test.id)}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900">
                    {format(new Date(test.date_test), 'dd/MM/yyyy HH:mm')}
                    {isNonRealisable && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                          ⚠️ Non réalisable
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900">{getProgrammeName(test.programme_id)}</td>
                  <td className="px-2 py-2 text-xs text-gray-900">{getPartenaireName(test.partenaire_id)}</td>
                  <td className="px-2 py-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        test.application_remise
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {test.application_remise ? 'OUI' : 'NON'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-700">
                    <div className="max-w-[200px] truncate" title={test.commentaire || ''}>
                      {test.commentaire || <span className="text-gray-400 italic">-</span>}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900">{test.prix_public.toFixed(2)} €</td>
                  <td className="px-2 py-2 text-xs text-gray-900">{test.prix_remise.toFixed(2)} €</td>
                  <td className="px-2 py-2 text-xs font-medium text-red-600">{test.pct_remise_calcule}%</td>
                  <td className="px-2 py-2 text-xs text-gray-700">
                    {test.naming_constate || <span className="text-gray-400 italic">Non renseigné</span>}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        test.cumul_codes
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {test.cumul_codes ? 'OUI' : 'NON'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {alerts.length > 0 ? (
                      <div className="space-y-1">
                        {alerts.map((alert, idx) => (
                          <div key={idx} className="flex items-center gap-1 text-xs text-red-700">
                            <AlertTriangle size={12} className="flex-shrink-0" />
                            <span>{alert}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-green-600 text-xs">✓ OK</span>
                    )}
                  </td>
                  {/* Colonne "Créé par" - discrète et visible pour tous */}
                  <td className="px-1 py-2 text-xs text-gray-500">
                    {test.created_by ? (
                      <div className="max-w-[80px]">
                        <div className="truncate" title={`${test.created_by.prenom} ${test.created_by.nom}`}>
                          {test.created_by.prenom} {test.created_by.nom?.charAt(0)}.
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs">
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