import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Partenaires = () => {
  const [partenaires, setPartenaires] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartenaire, setEditingPartenaire] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    programmes_ids: [],
    telephones: [],
    naming_attendu: '',
    remise_minimum: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [partResponse, progResponse] = await Promise.all([
        axios.get(`${API}/partenaires`),
        axios.get(`${API}/programmes`),
      ]);
      setPartenaires(partResponse.data);
      setProgrammes(progResponse.data);
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
      const submitData = {
        ...formData,
        remise_minimum: formData.remise_minimum ? parseFloat(formData.remise_minimum) : null,
      };
      
      if (editingPartenaire) {
        await axios.put(`${API}/partenaires/${editingPartenaire.id}`, submitData);
        toast.success('Partenaire modifié avec succès');
      } else {
        await axios.post(`${API}/partenaires`, submitData);
        toast.success('Partenaire créé avec succès');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      programmes_ids: [],
      telephones: [],
      naming_attendu: '',
      remise_minimum: '',
    });
    setEditingPartenaire(null);
  };

  const handleEdit = (partenaire) => {
    setEditingPartenaire(partenaire);
    setFormData({
      nom: partenaire.nom,
      programmes_ids: partenaire.programmes_ids || [],
      telephones: partenaire.telephones || [],
      naming_attendu: partenaire.naming_attendu || '',
      remise_minimum: partenaire.remise_minimum || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce partenaire ?')) return;
    try {
      await axios.delete(`${API}/partenaires/${id}`);
      toast.success('Partenaire supprimé');
      fetchData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getProgrammeName = (id) => {
    const prog = programmes.find((p) => p.id === id);
    return prog ? prog.nom : id;
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div data-testid="partenaires-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Work Sans' }}>
            Partenaires
          </h1>
          <p className="text-gray-600">Gestion des partenaires</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              data-testid="add-partenaire-btn"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus size={20} className="mr-2" />
              Nouveau partenaire
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPartenaire ? 'Modifier le partenaire' : 'Nouveau partenaire'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom du partenaire *</Label>
                <Input
                  id="nom"
                  data-testid="partenaire-nom-input"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="naming_attendu">Naming attendu</Label>
                <Input
                  id="naming_attendu"
                  data-testid="partenaire-naming-input"
                  value={formData.naming_attendu}
                  onChange={(e) => setFormData({ ...formData, naming_attendu: e.target.value })}
                  placeholder="Code promo - [Nom du programme]"
                />
              </div>
              
              <div>
                <Label htmlFor="remise_minimum">Remise minimum attendue (%)</Label>
                <Input
                  id="remise_minimum"
                  type="number"
                  step="0.01"
                  data-testid="partenaire-remise-input"
                  value={formData.remise_minimum}
                  onChange={(e) => setFormData({ ...formData, remise_minimum: e.target.value })}
                  placeholder="Ex: 10 pour -10%"
                />
                <p className="text-xs text-gray-500 mt-1">
                  La remise minimum attendue pour ce partenaire (ex: 10 pour -10%)
                </p>
              </div>
              
              <div>
                <Label>Programmes associés</Label>
                <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                  {programmes.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun programme disponible</p>
                  ) : (
                    programmes.map((prog) => (
                      <div key={prog.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`prog-${prog.id}`}
                          data-testid={`programme-checkbox-${prog.id}`}
                          checked={formData.programmes_ids.includes(prog.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                programmes_ids: [...formData.programmes_ids, prog.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                programmes_ids: formData.programmes_ids.filter((id) => id !== prog.id),
                              });
                            }
                          }}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                        <Label htmlFor={`prog-${prog.id}`} className="mb-0 cursor-pointer">
                          {prog.nom}
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
                <Button type="submit" data-testid="save-partenaire-btn" className="bg-red-600 hover:bg-red-700">
                  Enregistrer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partenaires.map((partenaire) => (
          <Card key={partenaire.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-start justify-between">
                <span className="text-lg">{partenaire.nom}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(partenaire)}
                    data-testid={`edit-partenaire-${partenaire.id}`}
                  >
                    <Pencil size={16} className="text-gray-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(partenaire.id)}
                    data-testid={`delete-partenaire-${partenaire.id}`}
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {partenaire.naming_attendu && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Naming:</span> {partenaire.naming_attendu}
                </p>
              )}
              {partenaire.remise_minimum !== null && partenaire.remise_minimum !== undefined && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Remise minimum:</span>{' '}
                  <span className="text-red-600 font-semibold">-{partenaire.remise_minimum}%</span>
                </p>
              )}
              {partenaire.programmes_ids && partenaire.programmes_ids.length > 0 && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Programmes:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {partenaire.programmes_ids.map((pid) => (
                      <span key={pid} className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {getProgrammeName(pid)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {partenaires.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Aucun partenaire pour le moment</p>
          <Button onClick={resetForm} className="bg-red-600 hover:bg-red-700">
            Créer le premier partenaire
          </Button>
        </div>
      )}
    </div>
  );
};

export default Partenaires;