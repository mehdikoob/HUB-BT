import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2, ExternalLink, Phone, Globe, FileText, ChevronDown, ChevronUp, Link } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useProgrammes, usePartenairesAll, useInvalidatePartenaires } from '../hooks/useData';
import { useQueryClient } from '@tanstack/react-query';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PartenairesNew = () => {
  const queryClient = useQueryClient();
  
  // React Query hooks
  const { data: partenaires = [], isLoading: partenairesLoading } = usePartenairesAll();
  const { data: programmes = [], isLoading: programmesLoading } = useProgrammes();
  const invalidatePartenaires = useInvalidatePartenaires();
  
  const loading = partenairesLoading || programmesLoading;
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartenaire, setEditingPartenaire] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedLogoId, setExpandedLogoId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProgrammes, setExpandedProgrammes] = useState({}); // { programmeId: true/false }
  const [formData, setFormData] = useState({
    nom: '',
    programmes_ids: [],
    contacts_programmes: [],
    naming_attendu: '',
    remise_minimum: '',
    logo_url: '',
    contact_email: '',
  });

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
      // Invalider le cache pour rafraîchir les données
      invalidatePartenaires();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      programmes_ids: [],
      contacts_programmes: [],
      naming_attendu: '',
      remise_minimum: '',
      logo_url: '',
      contact_email: '',
    });
    setEditingPartenaire(null);
    setExpandedProgrammes({}); // Reset l'état replié au reset du formulaire
  };

  const toggleProgrammeExpanded = (programmeId) => {
    setExpandedProgrammes(prev => ({
      ...prev,
      [programmeId]: !prev[programmeId]
    }));
  };

  const handleEdit = (partenaire) => {
    setEditingPartenaire(partenaire);
    
    // S'assurer que chaque programme sélectionné a un contact
    const programmeIds = partenaire.programmes_ids || [];
    const existingContacts = partenaire.contacts_programmes || [];
    const contacts = programmeIds.map(progId => {
      const existingContact = existingContacts.find(c => c.programme_id === progId);
      return existingContact || { programme_id: progId, url_site: '', code_promo: '', numero_telephone: '' };
    });
    
    setFormData({
      nom: partenaire.nom,
      programmes_ids: programmeIds,
      contacts_programmes: contacts,
      naming_attendu: partenaire.naming_attendu || '',
      remise_minimum: partenaire.remise_minimum || '',
      logo_url: partenaire.logo_url || '',
      contact_email: partenaire.contact_email || '',
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

  const handleProgrammeToggle = (programmeId) => {
    const isSelected = formData.programmes_ids.includes(programmeId);
    
    if (isSelected) {
      // Remove programme
      setFormData({
        ...formData,
        programmes_ids: formData.programmes_ids.filter(id => id !== programmeId),
        contacts_programmes: formData.contacts_programmes.filter(c => c.programme_id !== programmeId),
      });
    } else {
      // Add programme
      setFormData({
        ...formData,
        programmes_ids: [...formData.programmes_ids, programmeId],
        contacts_programmes: [
          ...formData.contacts_programmes,
          { programme_id: programmeId, url_site: '', code_promo: '', numero_telephone: '' }
        ],
      });
    }
  };

  const updateContactProgramme = (programmeId, field, value) => {
    const updatedContacts = formData.contacts_programmes.map(contact =>
      contact.programme_id === programmeId
        ? { ...contact, [field]: value }
        : contact
    );
    setFormData({ ...formData, contacts_programmes: updatedContacts });
  };

  const getProgrammeName = (id) => {
    const prog = programmes.find((p) => p.id === id);
    return prog ? prog.nom : id;
  };

  const getContactForProgramme = (partenaire, programmeId) => {
    return partenaire.contacts_programmes?.find(c => c.programme_id === programmeId);
  };

  // Filtrer et trier les partenaires
  const filteredPartenaires = partenaires
    .filter(p => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.nom.toLowerCase().includes(query) ||
        p.naming_attendu?.toLowerCase().includes(query) ||
        p.programmes_ids?.some(progId => {
          const progName = getProgrammeName(progId).toLowerCase();
          return progName.includes(query);
        })
      );
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

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
          <p className="text-gray-600">Gestion des partenaires et leurs coordonnées</p>
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
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingPartenaire ? 'Modifier le partenaire' : 'Nouveau partenaire'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="remise_minimum">Remise minimum (%)</Label>
                  <Input
                    id="remise_minimum"
                    type="number"
                    step="0.01"
                    data-testid="partenaire-remise-input"
                    value={formData.remise_minimum}
                    onChange={(e) => setFormData({ ...formData, remise_minimum: e.target.value })}
                    placeholder="Ex: 10 pour -10%"
                  />
                </div>
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
                <Label htmlFor="contact_email">Email du contact principal</Label>
                <Input
                  id="contact_email"
                  type="email"
                  data-testid="partenaire-contact-email-input"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="contact@partenaire.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Adresse email du contact principal pour ce partenaire
                </p>
              </div>
              
              <div>
                <Label htmlFor="logo_url">URL du logo</Label>
                <Input
                  id="logo_url"
                  data-testid="partenaire-logo-input"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://exemple.com/logo.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL d'une image pour le logo du partenaire
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
                <Label className="text-lg font-semibold mb-4 block">Programmes associés et coordonnées</Label>
                <div className="space-y-4 border rounded-lg p-4 max-h-96 overflow-y-auto bg-gray-50">
                  {programmes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Aucun programme disponible</p>
                  ) : (
                    programmes.map((prog) => {
                      const isSelected = formData.programmes_ids.includes(prog.id);
                      const contact = formData.contacts_programmes.find(c => c.programme_id === prog.id);
                      
                      return (
                        <div key={prog.id} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id={`prog-${prog.id}`}
                                data-testid={`programme-checkbox-${prog.id}`}
                                checked={isSelected}
                                onChange={() => handleProgrammeToggle(prog.id)}
                                className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                              />
                              <Label htmlFor={`prog-${prog.id}`} className="mb-0 cursor-pointer font-medium text-lg">
                                {prog.nom}
                              </Label>
                            </div>
                            
                            {isSelected && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleProgrammeExpanded(prog.id)}
                                className="h-8 w-8 p-0"
                              >
                                {expandedProgrammes[prog.id] ? (
                                  <ChevronUp size={20} className="text-gray-600" />
                                ) : (
                                  <ChevronDown size={20} className="text-gray-600" />
                                )}
                              </Button>
                            )}
                          </div>
                          
                          {isSelected && expandedProgrammes[prog.id] && (
                            <div className="ml-8 space-y-3 mt-3 pt-3 border-t">
                              {/* Types de tests requis pour ce programme */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                                  Types de tests requis pour ce programme
                                </Label>
                                <div className="flex gap-4">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`test_site-${prog.id}`}
                                      checked={contact?.test_site_requis !== false}
                                      onChange={(e) => updateContactProgramme(prog.id, 'test_site_requis', e.target.checked)}
                                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                    />
                                    <Label htmlFor={`test_site-${prog.id}`} className="mb-0 cursor-pointer text-sm">
                                      Test Site
                                    </Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`test_ligne-${prog.id}`}
                                      checked={contact?.test_ligne_requis !== false}
                                      onChange={(e) => updateContactProgramme(prog.id, 'test_ligne_requis', e.target.checked)}
                                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                    />
                                    <Label htmlFor={`test_ligne-${prog.id}`} className="mb-0 cursor-pointer text-sm">
                                      Test Ligne
                                    </Label>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-sm text-gray-600 flex items-center gap-2">
                                  <Globe size={16} />
                                  URL du partenaire pour ce programme
                                </Label>
                                <Input
                                  data-testid={`url-${prog.id}`}
                                  value={contact?.url_site || ''}
                                  onChange={(e) => updateContactProgramme(prog.id, 'url_site', e.target.value)}
                                  placeholder="https://www.exemple.com/programme"
                                  className="mt-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Site web dédié du partenaire pour ce programme
                                </p>
                              </div>
                              
                              <div>
                                <Label className="text-sm text-gray-600 flex items-center gap-2">
                                  <Link size={16} />
                                  URL Referer
                                </Label>
                                <Input
                                  data-testid={`referer-${prog.id}`}
                                  value={contact?.referer || ''}
                                  onChange={(e) => updateContactProgramme(prog.id, 'referer', e.target.value)}
                                  placeholder="https://referer.exemple.com"
                                  className="mt-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  URL de référence pour effectuer les tests (optionnel)
                                </p>
                              </div>
                              
                              <div>
                                <Label className="text-sm text-gray-600 flex items-center gap-2">
                                  <FileText size={16} />
                                  Code promo spécifique
                                </Label>
                                <Input
                                  data-testid={`code-${prog.id}`}
                                  value={contact?.code_promo || ''}
                                  onChange={(e) => updateContactProgramme(prog.id, 'code_promo', e.target.value)}
                                  placeholder="Ex: INTERSPORT"
                                  className="mt-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Code promotionnel du partenaire pour ce programme
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm text-gray-600 flex items-center gap-2">
                                  <Phone size={16} />
                                  Numéro de téléphone dédié
                                </Label>
                                <Input
                                  data-testid={`tel-${prog.id}`}
                                  value={contact?.numero_telephone || ''}
                                  onChange={(e) => updateContactProgramme(prog.id, 'numero_telephone', e.target.value)}
                                  placeholder="+33 X XX XX XX XX"
                                  className="mt-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Téléphone du partenaire spécifique à ce programme
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 justify-end pt-4 border-t">
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

      {/* Barre de recherche */}
      <Card className="mb-6 p-4 border-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Rechercher un partenaire, programme ou naming..."
              data-testid="search-partenaire-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {filteredPartenaires.length} partenaire{filteredPartenaires.length > 1 ? 's' : ''}
          </div>
        </div>
      </Card>

      {/* Liste des partenaires */}
      <div className="space-y-3">
        {filteredPartenaires.map((partenaire) => {
          const isExpanded = expandedId === partenaire.id;
          const linkedProgrammes = partenaire.programmes_ids || [];
          
          return (
            <Card key={partenaire.id} className="border-0 shadow-sm hover:shadow-md transition-all">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {partenaire.logo_url && (
                      <img 
                        src={partenaire.logo_url} 
                        alt={`Logo ${partenaire.nom}`}
                        className="h-12 w-12 object-contain rounded flex-shrink-0"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div 
                      className="cursor-pointer flex-1"
                      onClick={() => setExpandedId(isExpanded ? null : partenaire.id)}
                    >
                      <h3 className="text-xl font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Work Sans' }}>
                        {partenaire.nom}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        {partenaire.remise_minimum !== null && partenaire.remise_minimum !== undefined && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Remise min:</span>
                            <span className="text-red-600 font-semibold">-{partenaire.remise_minimum}%</span>
                          </span>
                        )}
                        {linkedProgrammes.length > 0 && (
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{linkedProgrammes.length} programme{linkedProgrammes.length > 1 ? 's' : ''}</span>
                          </span>
                        )}
                        {partenaire.naming_attendu && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {partenaire.naming_attendu}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(partenaire)}
                        data-testid={`edit-partenaire-${partenaire.id}`}
                        className="hover:bg-gray-100"
                      >
                        <Pencil size={18} className="text-gray-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(partenaire.id)}
                        data-testid={`delete-partenaire-${partenaire.id}`}
                        className="hover:bg-red-50"
                      >
                        <Trash2 size={18} className="text-red-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedId(isExpanded ? null : partenaire.id)}
                        className="text-sm"
                      >
                        {isExpanded ? 'Masquer' : 'Détails'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {isExpanded && linkedProgrammes.length > 0 && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {/* URL du logo - Accordéon */}
                    {partenaire.logo_url && (
                      <div className="mb-4">
                        <button
                          onClick={() => setExpandedLogoId(expandedLogoId === partenaire.id ? null : partenaire.id)}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <Link size={16} className="text-red-600" />
                          <span className="font-medium">URL du logo</span>
                          {expandedLogoId === partenaire.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {expandedLogoId === partenaire.id && (
                          <div className="mt-2 ml-6 p-3 bg-gray-50 rounded text-sm text-gray-700 break-all">
                            <a 
                              href={partenaire.logo_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:text-red-600 hover:underline flex items-center gap-1"
                            >
                              {partenaire.logo_url}
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    <h4 className="font-semibold text-gray-700 mb-3">Coordonnées par programme</h4>
                    {linkedProgrammes.map((progId) => {
                      const contact = getContactForProgramme(partenaire, progId);
                      return (
                        <div key={progId} className="bg-gray-50 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-3">{getProgrammeName(progId)}</h5>
                          <div className="space-y-2 text-sm">
                            {contact?.url_site && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Globe size={16} className="text-red-600" />
                                <a
                                  href={contact.url_site}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-red-600 hover:underline flex items-center gap-1"
                                >
                                  {contact.url_site}
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                            )}
                            {contact?.numero_telephone && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone size={16} className="text-red-600" />
                                <a href={`tel:${contact.numero_telephone}`} className="hover:text-red-600">
                                  {contact.numero_telephone}
                                </a>
                              </div>
                            )}
                            {!contact?.url_site && !contact?.numero_telephone && (
                              <p className="text-gray-400 italic">Aucune coordonnée renseignée</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {partenaires.length === 0 && (
        <Card className="border-0 shadow-sm">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Aucun partenaire pour le moment</p>
            <Button onClick={resetForm} className="bg-red-600 hover:bg-red-700">
              Créer le premier partenaire
            </Button>
          </div>
        </Card>
      )}

      {partenaires.length > 0 && filteredPartenaires.length === 0 && (
        <Card className="border-0 shadow-sm">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">Aucun partenaire trouvé</p>
            <p className="text-sm text-gray-400">Essayez avec un autre terme de recherche</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PartenairesNew;
