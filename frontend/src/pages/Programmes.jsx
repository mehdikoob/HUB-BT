import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Programmes = () => {
  const [programmes, setProgrammes] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgramme, setEditingProgramme] = useState(null);
  const [formData, setFormData] = useState({ nom: '', description: '', logo_url: '' });
  const [selectedPartenairesIds, setSelectedPartenairesIds] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

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
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProgramme) {
        await axios.put(`${API}/programmes/${editingProgramme.id}`, formData);
        toast.success('Programme modifié avec succès');
      } else {
        await axios.post(`${API}/programmes`, formData);
        toast.success('Programme créé avec succès');
      }
      
      // Update partenaires to link them to this programme if needed
      if (selectedPartenairesIds.length > 0) {
        const programmeId = editingProgramme?.id || (await axios.get(`${API}/programmes`)).data.find(p => p.nom === formData.nom)?.id;
        
        for (const partId of selectedPartenairesIds) {
          const part = partenaires.find(p => p.id === partId);
          if (part && !part.programmes_ids.includes(programmeId)) {
            await axios.put(`${API}/partenaires/${partId}`, {
              ...part,
              programmes_ids: [...part.programmes_ids, programmeId],
            });
          }
        }
      }
      
      setDialogOpen(false);
      setFormData({ nom: '', description: '' });
      setSelectedPartenairesIds([]);
      setEditingProgramme(null);
      fetchData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleEdit = (programme) => {
    setEditingProgramme(programme);
    setFormData({ 
      nom: programme.nom, 
      description: programme.description || '',
      logo_url: programme.logo_url || ''
    });
    
    // Find partenaires linked to this programme
    const linkedPartenaires = partenaires
      .filter(p => p.programmes_ids && p.programmes_ids.includes(programme.id))
      .map(p => p.id);
    setSelectedPartenairesIds(linkedPartenaires);
    
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce programme ?')) return;
    try {
      await axios.delete(`${API}/programmes/${id}`);
      toast.success('Programme supprimé');
      fetchData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openNewDialog = () => {
    setEditingProgramme(null);
    setFormData({ nom: '', description: '', logo_url: '' });
    setSelectedPartenairesIds([]);
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div data-testid="programmes-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Work Sans' }}>
            Programmes
          </h1>
          <p className="text-gray-600">Gestion des programmes partenaires</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openNewDialog}
              data-testid="add-programme-btn"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus size={20} className="mr-2" />
              Nouveau programme
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProgramme ? 'Modifier le programme' : 'Nouveau programme'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom du programme *</Label>
                <Input
                  id="nom"
                  data-testid="programme-nom-input"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="programme-description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="logo_url">URL du logo</Label>
                <Input
                  id="logo_url"
                  data-testid="programme-logo-input"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://exemple.com/logo.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL d'une image pour le logo du programme
                </p>
                {formData.logo_url && (
                  <div className="mt-2 p-2 border rounded bg-gray-50">
                    <p className="text-xs text-gray-600 mb-1">Aperçu :</p>
                    <img 
                      src={formData.logo_url} 
                      alt="Logo preview" 
                      className="h-12 w-auto object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <p className="text-xs text-red-600" style={{ display: 'none' }}>
                      Impossible de charger l'image
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <Label>Partenaires associés</Label>
                <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                  {partenaires.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun partenaire disponible</p>
                  ) : (
                    partenaires.map((part) => (
                      <div key={part.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`part-${part.id}`}
                          data-testid={`partenaire-checkbox-${part.id}`}
                          checked={selectedPartenairesIds.includes(part.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPartenairesIds([...selectedPartenairesIds, part.id]);
                            } else {
                              setSelectedPartenairesIds(selectedPartenairesIds.filter((id) => id !== part.id));
                            }
                          }}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                        <Label htmlFor={`part-${part.id}`} className="mb-0 cursor-pointer">
                          {part.nom}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" data-testid="save-programme-btn" className="bg-red-600 hover:bg-red-700">
                  Enregistrer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programmes.map((programme) => (
          <Card key={programme.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  {programme.logo_url && (
                    <img 
                      src={programme.logo_url} 
                      alt={`Logo ${programme.nom}`}
                      className="h-10 w-10 object-contain rounded"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                  <span className="text-lg">{programme.nom}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(programme)}
                    data-testid={`edit-programme-${programme.id}`}
                  >
                    <Pencil size={16} className="text-gray-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(programme.id)}
                    data-testid={`delete-programme-${programme.id}`}
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {programme.description && (
                <p className="text-sm text-gray-600 mb-2">{programme.description}</p>
              )}
              {(() => {
                const linkedPartenaires = partenaires.filter(p => 
                  p.programmes_ids && p.programmes_ids.includes(programme.id)
                );
                return linkedPartenaires.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Partenaires:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {linkedPartenaires.map((part) => (
                        <span key={part.id} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
                          {part.nom}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ))}
      </div>

      {programmes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Aucun programme pour le moment</p>
          <Button onClick={openNewDialog} className="bg-red-600 hover:bg-red-700">
            Créer le premier programme
          </Button>
        </div>
      )}
    </div>
  );
};

export default Programmes;