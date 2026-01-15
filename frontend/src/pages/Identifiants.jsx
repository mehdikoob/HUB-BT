import React, { useState, useEffect } from 'react';
import { UserSearch, Plus, Pencil, Trash2, Search, Filter, Calendar, CreditCard, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Identifiants = () => {
  const { toast } = useToast();
  const [identifiants, setIdentifiants] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProgramme, setFilterProgramme] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdentifiant, setEditingIdentifiant] = useState(null);
  const [expandedProgrammes, setExpandedProgrammes] = useState({});
  
  const [formData, setFormData] = useState({
    programme_id: '',
    nom: '',
    prenom: '',
    numero_adherent: '',
    date_naissance: ''
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [identifiantsRes, programmesRes] = await Promise.all([
        axios.get(`${API_URL}/api/identifiants-mystere`, { headers }),
        axios.get(`${API_URL}/api/programmes`, { headers })
      ]);
      
      setIdentifiants(identifiantsRes.data);
      setProgrammes(programmesRes.data);
      
      // Expand all programmes by default
      const expanded = {};
      programmesRes.data.forEach(p => { expanded[p.id] = true; });
      setExpandedProgrammes(expanded);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Group identifiants by programme
  const groupedByProgramme = () => {
    const grouped = {};
    
    programmes.forEach(prog => {
      grouped[prog.id] = {
        programme: prog,
        identifiants: []
      };
    });
    
    identifiants.forEach(id => {
      if (grouped[id.programme_id]) {
        grouped[id.programme_id].identifiants.push(id);
      }
    });
    
    return Object.values(grouped).filter(g => 
      filterProgramme === 'all' || g.programme.id === filterProgramme
    );
  };

  // Filter identifiants
  const filteredGroups = groupedByProgramme().map(group => ({
    ...group,
    identifiants: group.identifiants.filter(id =>
      id.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      id.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (id.numero_adherent && id.numero_adherent.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })).filter(group => 
    filterProgramme === 'all' ? true : group.identifiants.length > 0 || group.programme.id === filterProgramme
  );

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.programme_id || !formData.nom || !formData.prenom) {
      toast({
        title: "Erreur",
        description: "Programme, nom et prénom sont requis",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const payload = {
        ...formData,
        numero_adherent: formData.numero_adherent || null,
        date_naissance: formData.date_naissance || null
      };
      
      if (editingIdentifiant) {
        await axios.put(`${API_URL}/api/identifiants-mystere/${editingIdentifiant.id}`, payload, { headers });
        toast({ title: "Succès", description: "Identifiant mis à jour" });
      } else {
        await axios.post(`${API_URL}/api/identifiants-mystere`, payload, { headers });
        toast({ title: "Succès", description: "Identifiant créé" });
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Une erreur est survenue",
        variant: "destructive"
      });
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet identifiant ?")) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/identifiants-mystere/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "Succès", description: "Identifiant supprimé" });
      fetchData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'identifiant",
        variant: "destructive"
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      programme_id: '',
      nom: '',
      prenom: '',
      numero_adherent: '',
      date_naissance: ''
    });
    setEditingIdentifiant(null);
  };

  // Open modal for editing
  const openEditModal = (identifiant) => {
    setEditingIdentifiant(identifiant);
    setFormData({
      programme_id: identifiant.programme_id,
      nom: identifiant.nom,
      prenom: identifiant.prenom,
      numero_adherent: identifiant.numero_adherent || '',
      date_naissance: identifiant.date_naissance || ''
    });
    setIsModalOpen(true);
  };

  // Toggle programme expansion
  const toggleProgramme = (progId) => {
    setExpandedProgrammes(prev => ({
      ...prev,
      [progId]: !prev[progId]
    }));
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div data-testid="identifiants-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3" style={{ fontFamily: 'Work Sans' }}>
            <div className="p-2 bg-indigo-100 rounded-lg">
              <UserSearch className="text-indigo-600" size={28} />
            </div>
            Identifiants Mystère
          </h1>
          <p className="text-gray-600 mt-1">Profils de clients mystères fictifs par programme</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-red-600 hover:bg-red-700"
          data-testid="new-identifiant-btn"
        >
          <Plus size={18} className="mr-2" />
          Nouvel identifiant
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Rechercher par nom, prénom ou n° adhérent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-identifiants"
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={filterProgramme} onValueChange={setFilterProgramme}>
                <SelectTrigger data-testid="filter-programme">
                  <Filter size={16} className="mr-2 text-gray-400" />
                  <SelectValue placeholder="Filtrer par programme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les programmes</SelectItem>
                  {programmes.map(prog => (
                    <SelectItem key={prog.id} value={prog.id}>{prog.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-indigo-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{identifiants.length}</p>
            <p className="text-sm text-indigo-800">Identifiants</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {new Set(identifiants.map(i => i.programme_id)).size}
            </p>
            <p className="text-sm text-purple-800">Programmes</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {identifiants.filter(i => i.numero_adherent).length}
            </p>
            <p className="text-sm text-green-800">Avec n° adhérent</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-orange-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {identifiants.filter(i => i.date_naissance).length}
            </p>
            <p className="text-sm text-orange-800">Avec date naissance</p>
          </CardContent>
        </Card>
      </div>

      {/* Grouped list */}
      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-gray-500">
              <UserSearch size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Aucun identifiant trouvé</p>
              <p className="text-sm mt-1">Créez votre premier identifiant mystère</p>
            </CardContent>
          </Card>
        ) : (
          filteredGroups.map(group => (
            <Card key={group.programme.id} className="border-0 shadow-sm overflow-hidden">
              {/* Programme header */}
              <button
                onClick={() => toggleProgramme(group.programme.id)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedProgrammes[group.programme.id] ? (
                    <ChevronDown size={20} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-400" />
                  )}
                  <div className="flex items-center gap-2">
                    {group.programme.logo_url && (
                      <img 
                        src={group.programme.logo_url} 
                        alt={group.programme.nom}
                        className="w-8 h-8 object-contain rounded"
                      />
                    )}
                    <span className="font-semibold text-gray-900">{group.programme.nom}</span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                  {group.identifiants.length} identifiant{group.identifiants.length > 1 ? 's' : ''}
                </span>
              </button>
              
              {/* Identifiants list */}
              {expandedProgrammes[group.programme.id] && (
                <CardContent className="p-0">
                  {group.identifiants.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      Aucun identifiant pour ce programme
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {group.identifiants.map(identifiant => (
                        <div 
                          key={identifiant.id}
                          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                          data-testid={`identifiant-row-${identifiant.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                              {identifiant.prenom.charAt(0)}{identifiant.nom.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {identifiant.prenom} {identifiant.nom}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                {identifiant.numero_adherent && (
                                  <span className="flex items-center gap-1">
                                    <CreditCard size={14} />
                                    {identifiant.numero_adherent}
                                  </span>
                                )}
                                {identifiant.date_naissance && (
                                  <span className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    {formatDate(identifiant.date_naissance)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(identifiant)}
                              className="text-gray-500 hover:text-blue-600"
                              data-testid={`edit-btn-${identifiant.id}`}
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(identifiant.id)}
                              className="text-gray-500 hover:text-red-600"
                              data-testid={`delete-btn-${identifiant.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserSearch className="text-indigo-600" size={20} />
              {editingIdentifiant ? 'Modifier l\'identifiant' : 'Nouvel identifiant'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="programme_id">Programme *</Label>
              <Select 
                value={formData.programme_id} 
                onValueChange={(value) => setFormData({...formData, programme_id: value})}
              >
                <SelectTrigger data-testid="select-programme">
                  <SelectValue placeholder="Sélectionner un programme" />
                </SelectTrigger>
                <SelectContent>
                  {programmes.map(prog => (
                    <SelectItem key={prog.id} value={prog.id}>{prog.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                  placeholder="Jean"
                  data-testid="input-prenom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  placeholder="DUPONT"
                  data-testid="input-nom"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="numero_adherent">
                Numéro d'adhérent <span className="text-gray-400 text-xs">(optionnel)</span>
              </Label>
              <Input
                id="numero_adherent"
                value={formData.numero_adherent}
                onChange={(e) => setFormData({...formData, numero_adherent: e.target.value})}
                placeholder="ABC123456"
                data-testid="input-numero-adherent"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date_naissance">
                Date de naissance <span className="text-gray-400 text-xs">(optionnel)</span>
              </Label>
              <Input
                id="date_naissance"
                type="date"
                value={formData.date_naissance}
                onChange={(e) => setFormData({...formData, date_naissance: e.target.value})}
                data-testid="input-date-naissance"
              />
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="submit-identifiant">
                {editingIdentifiant ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Identifiants;
