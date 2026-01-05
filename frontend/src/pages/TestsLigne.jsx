import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, FileBarChart, Trash2, Filter, Pencil, Phone, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, FileDown, Globe, Tag } from 'lucide-react';
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

// Formater le numéro de téléphone avec espaces (xx xx xx xx xx)
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  // Retirer tous les caractères non numériques
  const cleaned = phone.replace(/\D/g, '');
  // Ajouter des espaces tous les 2 chiffres
  return cleaned.match(/.{1,2}/g)?.join(' ') || cleaned;
};

const TestsLigne = () => {
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
    numero_telephone: '',
    messagerie_vocale_dediee: false,
    decroche_dedie: false,
    delai_attente: '',
    nom_conseiller: 'NC',
    evaluation_accueil: 'Bien',
    application_offre: true,
    commentaire: '',
    screenshots: [],
  });
  const [partenaireTelephone, setPartenaireTelephone] = useState('');
  const [partenaireUrl, setPartenaireUrl] = useState('');
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
  }, [dialogOpen, editingTest]);

  // Filter partenaires based on selected programme (only those with test_ligne_requis=true for this programme)
  useEffect(() => {
    if (formData.programme_id) {
      const filtered = partenaires.filter(p => {
        if (!p.contacts_programmes) return false;
        const contact = p.contacts_programmes.find(c => c.programme_id === formData.programme_id);
        // Afficher SEULEMENT si test_ligne_requis est explicitement true
        return contact && contact.test_ligne_requis === true;
      });
      setFilteredPartenaires(filtered);
    } else {
      setFilteredPartenaires(partenaires);
    }
  }, [formData.programme_id, partenaires]);

  // Filter programmes based on selected partenaire (only programmes with test_ligne_requis=true)
  useEffect(() => {
    if (formData.partenaire_id) {
      const partenaire = partenaires.find(p => p.id === formData.partenaire_id);
      if (partenaire && partenaire.contacts_programmes) {
        const filtered = programmes.filter(prog => {
          const contact = partenaire.contacts_programmes.find(c => c.programme_id === prog.id);
          // Afficher SEULEMENT si test_ligne_requis est explicitement true
          return contact && contact.test_ligne_requis === true;
        });
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

  // Get telephone and URL for selected partenaire and programme
  const updatePartenaireInfo = (programmeId, partenaireId) => {
    if (!programmeId || !partenaireId) {
      setPartenaireTelephone('');
      setPartenaireUrl('');
      return;
    }

    const partenaire = partenaires.find(p => p.id === partenaireId);
    if (partenaire && partenaire.contacts_programmes) {
      const contact = partenaire.contacts_programmes.find(c => c.programme_id === programmeId);
      const tel = contact?.numero_telephone || '';
      setPartenaireTelephone(tel);
      setPartenaireUrl(contact?.url_site || '');
      // Also update formData with the telephone
      setFormData(prev => ({ ...prev, numero_telephone: tel }));
    } else {
      setPartenaireTelephone('');
      setPartenaireUrl('');
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
              test_type: 'ligne'
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
          application_offre: false,
          messagerie_vocale_dediee: false,
          decroche_dedie: false,
          delai_attente: 0,
          nom_conseiller: "N/A",
        };
        
        const testResponse = await axios.post(`${API}/tests-ligne`, testData, {
          headers: getAuthHeader()
        });
        
        // Puis créer l'alerte associée au test
        await axios.post(`${API}/alertes`, {
          programme_id: formData.programme_id,
          partenaire_id: formData.partenaire_id,
          type_test: 'TL',
          description: `Test ligne non réalisable - ${formData.commentaire}`,
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
    
    // Si test réalisable : validation des champs techniques
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
        axios.delete(`${API}/tests-ligne/${testId}`, {
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
      numero_telephone: '',
      messagerie_vocale_dediee: false,
      decroche_dedie: false,
      delai_attente: '',
      nom_conseiller: 'NC',
      evaluation_accueil: 'Bien',
      application_offre: true,
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
      numero_telephone: test.numero_telephone || '',
      messagerie_vocale_dediee: test.messagerie_vocale_dediee !== undefined ? test.messagerie_vocale_dediee : false,
      decroche_dedie: test.decroche_dedie !== undefined ? test.decroche_dedie : false,
      delai_attente: test.delai_attente || '',
      nom_conseiller: test.nom_conseiller || 'NC',
      evaluation_accueil: test.evaluation_accueil || 'Bien',
      application_offre: test.application_offre !== undefined ? test.application_offre : true,
      commentaire: test.commentaire || '',
      screenshots: test.screenshots || [],
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

  const handleDownloadAlerteReport = async (testId) => {
    try {
      const response = await axios.get(
        `${API}/export-alerte-report/${testId}?test_type=ligne`,
        {
          headers: getAuthHeader(),
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_incident_ligne_${testId}.pdf`);
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

      const response = await axios.get(`${API}/export/bilan-ligne-excel`, {
        params: params,
        responseType: 'blob',
      });
      
      let filename;
      if (exportType === 'partenaire') {
        const partenaire = partenaires.find(p => p.id === bilanData.partenaire_id);
        const partenaireNom = partenaire ? partenaire.nom : 'partenaire';
        const today = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
        filename = `Tests_Ligne_${partenaireNom}_${today}.xlsx`;
      } else {
        const programme = programmes.find(p => p.id === bilanData.programme_id);
        const programmeNom = programme ? programme.nom : 'programme';
        const today = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
        filename = `Tests_Ligne_${programmeNom}_${today}.xlsx`;
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
                <FileDown size={20} className="mr-2" />
                Export
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Export des tests lignes</DialogTitle>
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
                  data-testid="add-test-ligne-btn"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Plus size={20} className="mr-2" />
                  Nouveau test
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">{editingTest ? 'Modifier le test ligne' : 'Nouveau test ligne'}</DialogTitle>
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
                
                {/* Display telephone if available */}
                {partenaireTelephone && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                    <Label className="text-xs text-purple-800 font-semibold mb-0.5 flex items-center gap-1.5">
                      <Phone size={14} />
                      Numéro de téléphone du partenaire pour ce programme :
                    </Label>
                    <p className="text-purple-900 font-medium text-base">
                      {partenaireTelephone}
                    </p>
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
                  <Label htmlFor="numero_telephone">
                    Numéro de téléphone {!formData.test_non_realisable && '*'}
                  </Label>
                  <Input
                    id="numero_telephone"
                    data-testid="test-ligne-telephone-input"
                    value={formData.numero_telephone}
                    onChange={(e) => setFormData({ ...formData, numero_telephone: e.target.value })}
                    placeholder="+33 X XX XX XX XX"
                    required={!formData.test_non_realisable}
                    disabled={formData.test_non_realisable}
                  />
                </div>
                <div>
                  <Label htmlFor="delai_attente">
                    Délai d'attente (mm:ss) {!formData.test_non_realisable && '*'}
                  </Label>
                  <Input
                    id="delai_attente"
                    data-testid="test-ligne-delai-input"
                    value={formData.delai_attente}
                    onChange={(e) => setFormData({ ...formData, delai_attente: e.target.value })}
                    placeholder="02:30"
                    required={!formData.test_non_realisable}
                    disabled={formData.test_non_realisable}
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
                  <Label htmlFor="evaluation_accueil">
                    Évaluation de l'accueil {!formData.test_non_realisable && '*'}
                  </Label>
                  <Select
                    value={formData.evaluation_accueil}
                    onValueChange={(value) => setFormData({ ...formData, evaluation_accueil: value })}
                    required={!formData.test_non_realisable}
                    disabled={formData.test_non_realisable}
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
                      disabled={formData.test_non_realisable}
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
                      disabled={formData.test_non_realisable}
                    />
                    <Label htmlFor="decroche_dedie" className="mb-0">Décroche dédié</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="application_offre"
                      data-testid="test-ligne-application-offre-checkbox"
                      checked={formData.application_offre}
                      disabled={formData.test_non_realisable}
                      onChange={(e) => setFormData({ ...formData, application_offre: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <Label htmlFor="application_offre" className="mb-0">Application de l'offre</Label>
                  </div>
                </div>
                
                {/* Checkbox Test non réalisable */}
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
                            application_offre: false,
                            messagerie_vocale_dediee: false,
                            decroche_dedie: false
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
                
                <div>
                  <Label htmlFor="commentaire" className="text-sm">
                    Commentaire {formData.test_non_realisable && <span className="text-red-600">*</span>}
                  </Label>
                  <Textarea
                    id="commentaire"
                    data-testid="test-ligne-commentaire-input"
                    value={formData.commentaire}
                    onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                    rows={2}
                    required={formData.test_non_realisable}
                    placeholder={formData.test_non_realisable ? "Décrivez pourquoi le test n'a pas pu être réalisé (obligatoire)" : "Commentaire optionnel"}
                  />
                </div>
                
                {/* Screenshot Uploader - CTRL+V */}
                <ScreenshotUploader
                  screenshots={formData.screenshots}
                  onScreenshotsChange={(newScreenshots) => setFormData({ ...formData, screenshots: newScreenshots })}
                  maxScreenshots={3}
                />
                
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
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700">N° de tél</th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('messagerie_vocale_dediee')}
                >
                  <div className="flex items-center">
                    Msg vocale
                    <SortIcon columnKey="messagerie_vocale_dediee" />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('delai_attente')}
                >
                  <div className="flex items-center">
                    Délai
                    <SortIcon columnKey="delai_attente" />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('nom_conseiller')}
                >
                  <div className="flex items-center">
                    Conseiller
                    <SortIcon columnKey="nom_conseiller" />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('decroche_dedie')}
                >
                  <div className="flex items-center">
                    Décroche
                    <SortIcon columnKey="decroche_dedie" />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('evaluation_accueil')}
                >
                  <div className="flex items-center">
                    Éval. accueil
                    <SortIcon columnKey="evaluation_accueil" />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('application_offre')}
                >
                  <div className="flex items-center">
                    App. offre
                    <SortIcon columnKey="application_offre" />
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
                  <td className="px-2 py-2 text-xs text-gray-900 whitespace-nowrap">
                    <a href={`tel:${test.numero_telephone}`} className="text-blue-600 hover:underline">
                      {formatPhoneNumber(test.numero_telephone)}
                    </a>
                  </td>
                  <td className="px-2 py-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        test.messagerie_vocale_dediee
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {test.messagerie_vocale_dediee ? 'OUI' : 'NON'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 font-mono">{test.delai_attente}</td>
                  <td className="px-2 py-2 text-xs text-gray-900">
                    {test.nom_conseiller || <span className="text-gray-400 italic">NC</span>}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        test.decroche_dedie
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {test.decroche_dedie ? 'OUI' : 'NON'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs">
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
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
                  <td className="px-2 py-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        test.application_offre
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {test.application_offre ? 'OUI' : 'NON'}
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