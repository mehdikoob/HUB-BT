import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, FileBarChart, Trash2, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TestsSite = () => {
  const [tests, setTests] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bilanDialogOpen, setBilanDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    programme_id: '',
    partenaire_id: '',
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
    application_remise: true,
    prix_public: '',
    prix_remise: '',
    naming_constate: '',
    cumul_codes: false,
    commentaire: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchTests();
  }, [filters]);

  const fetchData = async () => {
    try {
      const [progResponse, partResponse] = await Promise.all([
        axios.get(`${API}/programmes`),
        axios.get(`${API}/partenaires`),
      ]);
      setProgrammes(progResponse.data);
      setPartenaires(partResponse.data);
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
      
      const response = await axios.get(`${API}/tests-site`, { params });
      setTests(response.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des tests');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    if (parseFloat(formData.prix_public) <= 0) {
      toast.error('Le prix public doit être supérieur à 0');
      return;
    }
    
    if (parseFloat(formData.prix_remise) < 0) {
      toast.error('Le prix remisé ne peut pas être négatif');
      return;
    }

    try {
      const submitData = {
        ...formData,
        prix_public: parseFloat(formData.prix_public),
        prix_remise: parseFloat(formData.prix_remise),
        date_test: new Date(formData.date_test).toISOString(),
      };
      
      await axios.post(`${API}/tests-site`, submitData);
      toast.success('Test site enregistré avec succès');
      setDialogOpen(false);
      resetForm();
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
      application_remise: true,
      prix_public: '',
      prix_remise: '',
      naming_constate: '',
      cumul_codes: false,
      commentaire: '',
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce test ?')) return;
    try {
      await axios.delete(`${API}/tests-site/${id}`);
      toast.success('Test supprimé');
      fetchTests();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
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
      const response = await axios.get(`${API}/export/bilan-partenaire`, {
        params: {
          partenaire_id: bilanData.partenaire_id,
          date_debut: bilanData.date_debut,
          date_fin: bilanData.date_fin,
        },
        responseType: 'blob',
      });
      
      const partenaire = partenaires.find(p => p.id === bilanData.partenaire_id);
      const partenaireNom = partenaire ? partenaire.nom : 'partenaire';
      const filename = `bilan_${partenaireNom}_${bilanData.date_debut}_${bilanData.date_fin}.csv`;
      
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
                data-testid="add-test-site-btn"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus size={20} className="mr-2" />
                Nouveau test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouveau test site</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="programme_id">Programme *</Label>
                    <Select
                      value={formData.programme_id}
                      onValueChange={(value) => setFormData({ ...formData, programme_id: value })}
                      required
                    >
                      <SelectTrigger data-testid="test-site-programme-select">
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
                  <div>
                    <Label htmlFor="partenaire_id">Partenaire *</Label>
                    <Select
                      value={formData.partenaire_id}
                      onValueChange={(value) => setFormData({ ...formData, partenaire_id: value })}
                      required
                    >
                      <SelectTrigger data-testid="test-site-partenaire-select">
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
                </div>
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
                <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <Label htmlFor="commentaire">Commentaire</Label>
                  <Textarea
                    id="commentaire"
                    data-testid="test-site-commentaire-input"
                    value={formData.commentaire}
                    onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                    rows={3}
                  />
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
      </Card>

      {/* Tests Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Programme</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Partenaire</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Prix public</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Prix remisé</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">% Remise</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Appliquée</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {format(new Date(test.date_test), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{getProgrammeName(test.programme_id)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{getPartenaireName(test.partenaire_id)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{test.prix_public.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{test.prix_remise.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-600">{test.pct_remise_calcule}%</td>
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
                  <td className="px-4 py-3 text-sm">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(test.id)}
                      data-testid={`delete-test-${test.id}`}
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
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