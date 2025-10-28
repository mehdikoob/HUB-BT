import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Mail, Plus, Trash2, Send, FileText, Edit, CheckCircle, Clock, History } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Messagerie = () => {
  const [drafts, setDrafts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDraft, setEditingDraft] = useState(null);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingSignature, setEditingSignature] = useState(null);
  const [selectedSignatureForSend, setSelectedSignatureForSend] = useState('');

  const [draftForm, setDraftForm] = useState({
    subject: '',
    body: '',
    recipient: ''
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject_template: '',
    body_template: '',
    is_default: false
  });

  const [signatureForm, setSignatureForm] = useState({
    user_name: '',
    signature_text: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [draftsRes, templatesRes, signaturesRes, historyRes] = await Promise.all([
        axios.get(`${API}/email-drafts`),
        axios.get(`${API}/email-templates`),
        axios.get(`${API}/signatures`),
        axios.get(`${API}/email-history`)
      ]);
      
      setDrafts(draftsRes.data);
      setTemplates(templatesRes.data);
      setSignatures(signaturesRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Draft operations
  const handleEditDraft = (draft) => {
    setEditingDraft(draft);
    setDraftForm({
      subject: draft.subject,
      body: draft.body,
      recipient: draft.recipient
    });
    setDraftDialogOpen(true);
  };

  const handleSaveDraft = async () => {
    try {
      if (editingDraft) {
        await axios.put(`${API}/email-drafts/${editingDraft.id}`, {
          ...editingDraft,
          ...draftForm
        });
        toast.success('Brouillon mis à jour');
      }
      setDraftDialogOpen(false);
      setEditingDraft(null);
      fetchAllData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteDraft = async (id) => {
    if (!window.confirm('Supprimer ce brouillon ?')) return;
    try {
      await axios.delete(`${API}/email-drafts/${id}`);
      toast.success('Brouillon supprimé');
      fetchAllData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSendEmail = async (draftId) => {
    if (!selectedSignatureForSend) {
      toast.error('Veuillez sélectionner une signature');
      return;
    }

    try {
      await axios.post(`${API}/email-drafts/${draftId}/send`, {
        signature_id: selectedSignatureForSend
      });
      toast.success('Email envoyé avec succès');
      setSelectedSignatureForSend('');
      fetchAllData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi');
    }
  };

  // Template operations
  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      subject_template: template.subject_template,
      body_template: template.body_template,
      is_default: template.is_default
    });
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        await axios.put(`${API}/email-templates/${editingTemplate.id}`, templateForm);
        toast.success('Template mis à jour');
      } else {
        await axios.post(`${API}/email-templates`, templateForm);
        toast.success('Template créé');
      }
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({
        name: '',
        subject_template: '',
        body_template: '',
        is_default: false
      });
      fetchAllData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Supprimer ce template ?')) return;
    try {
      await axios.delete(`${API}/email-templates/${id}`);
      toast.success('Template supprimé');
      fetchAllData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSetDefaultTemplate = async (id) => {
    try {
      await axios.put(`${API}/email-templates/${id}/set-default`);
      toast.success('Template défini par défaut');
      fetchAllData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Signature operations
  const handleEditSignature = (signature) => {
    setEditingSignature(signature);
    setSignatureForm({
      user_name: signature.user_name,
      signature_text: signature.signature_text
    });
    setSignatureDialogOpen(true);
  };

  const handleSaveSignature = async () => {
    try {
      if (editingSignature) {
        await axios.put(`${API}/signatures/${editingSignature.id}`, signatureForm);
        toast.success('Signature mise à jour');
      } else {
        await axios.post(`${API}/signatures`, signatureForm);
        toast.success('Signature créée');
      }
      setSignatureDialogOpen(false);
      setEditingSignature(null);
      setSignatureForm({
        user_name: '',
        signature_text: ''
      });
      fetchAllData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteSignature = async (id) => {
    if (!window.confirm('Supprimer cette signature ?')) return;
    try {
      await axios.delete(`${API}/signatures/${id}`);
      toast.success('Signature supprimée');
      fetchAllData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div data-testid="messagerie-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Work Sans' }}>
          <Mail className="inline-block mr-3" size={40} />
          Messagerie
        </h1>
        <p className="text-gray-600">Gestion des emails et communications avec les partenaires</p>
      </div>

      <Tabs defaultValue="drafts" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="drafts">
            <FileText size={18} className="mr-2" />
            Brouillons ({drafts.filter(d => d.status === 'draft').length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText size={18} className="mr-2" />
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="signatures">
            <Edit size={18} className="mr-2" />
            Signatures ({signatures.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <History size={18} className="mr-2" />
            Historique ({history.length})
          </TabsTrigger>
        </TabsList>

        {/* Drafts Tab */}
        <TabsContent value="drafts">
          <Card className="border-0 shadow-sm p-6">
            <div className="space-y-4">
              {drafts.filter(d => d.status === 'draft').length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun brouillon</p>
              ) : (
                drafts.filter(d => d.status === 'draft').map((draft) => (
                  <div key={draft.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{draft.subject}</h3>
                        <p className="text-sm text-gray-600 mt-1">À: {draft.recipient}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Créé le {format(new Date(draft.created_at), 'dd/MM/yyyy à HH:mm')}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock size={14} className="inline-block mr-1" />
                        Brouillon
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 mb-4 whitespace-pre-wrap bg-white p-3 rounded border">
                      {draft.body.substring(0, 200)}...
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={selectedSignatureForSend}
                        onValueChange={setSelectedSignatureForSend}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Choisir une signature" />
                        </SelectTrigger>
                        <SelectContent>
                          {signatures.map((sig) => (
                            <SelectItem key={sig.id} value={sig.id}>
                              {sig.user_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => handleSendEmail(draft.id)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={!selectedSignatureForSend}
                      >
                        <Send size={16} className="mr-2" />
                        Envoyer
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleEditDraft(draft)}
                      >
                        <Edit size={16} className="mr-2" />
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card className="border-0 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Gestion des templates</h2>
              <Button
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateForm({
                    name: '',
                    subject_template: '',
                    body_template: '',
                    is_default: false
                  });
                  setTemplateDialogOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus size={16} className="mr-2" />
                Nouveau template
              </Button>
            </div>
            <div className="space-y-4">
              {templates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun template</p>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{template.name}</h3>
                        {template.is_default && (
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                            <CheckCircle size={12} className="inline-block mr-1" />
                            Par défaut
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      <strong>Objet:</strong> {template.subject_template}
                    </div>
                    <div className="text-sm text-gray-700 mb-4 whitespace-pre-wrap bg-white p-3 rounded border max-h-40 overflow-y-auto">
                      {template.body_template}
                    </div>
                    <div className="flex gap-2">
                      {!template.is_default && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetDefaultTemplate(template.id)}
                        >
                          Définir par défaut
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit size={14} className="mr-1" />
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Signatures Tab */}
        <TabsContent value="signatures">
          <Card className="border-0 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Gestion des signatures</h2>
              <Button
                onClick={() => {
                  setEditingSignature(null);
                  setSignatureForm({
                    user_name: '',
                    signature_text: ''
                  });
                  setSignatureDialogOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus size={16} className="mr-2" />
                Nouvelle signature
              </Button>
            </div>
            <div className="space-y-4">
              {signatures.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune signature</p>
              ) : (
                signatures.map((signature) => (
                  <div key={signature.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg text-gray-900">{signature.user_name}</h3>
                    </div>
                    <div className="text-sm text-gray-700 mb-4 whitespace-pre-wrap bg-white p-3 rounded border">
                      {signature.signature_text}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditSignature(signature)}
                      >
                        <Edit size={14} className="mr-1" />
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSignature(signature.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="border-0 shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Historique des emails envoyés</h2>
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun email envoyé</p>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{item.subject}</h3>
                        <p className="text-sm text-gray-600 mt-1">À: {item.recipient}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Envoyé le {format(new Date(item.sent_at), 'dd/MM/yyyy à HH:mm')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.status === 'success' ? (
                          <>
                            <CheckCircle size={14} className="inline-block mr-1" />
                            Envoyé
                          </>
                        ) : (
                          'Échec'
                        )}
                      </span>
                    </div>
                    {item.error_message && (
                      <div className="text-sm text-red-600 mb-2">
                        Erreur: {item.error_message}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Draft Edit Dialog */}
      <Dialog open={draftDialogOpen} onOpenChange={setDraftDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le brouillon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Destinataire</Label>
              <Input
                value={draftForm.recipient}
                onChange={(e) => setDraftForm({ ...draftForm, recipient: e.target.value })}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label>Objet</Label>
              <Input
                value={draftForm.subject}
                onChange={(e) => setDraftForm({ ...draftForm, subject: e.target.value })}
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={draftForm.body}
                onChange={(e) => setDraftForm({ ...draftForm, body: e.target.value })}
                rows={15}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDraftDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveDraft} className="bg-red-600 hover:bg-red-700">
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Modifier' : 'Nouveau'} template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom du template</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="Ex: Template incident remise"
              />
            </div>
            <div>
              <Label>Objet (avec variables)</Label>
              <Input
                value={templateForm.subject_template}
                onChange={(e) => setTemplateForm({ ...templateForm, subject_template: e.target.value })}
                placeholder="[Nom du programme] – [Nature du problème constaté]"
              />
            </div>
            <div>
              <Label>Corps du message (avec variables)</Label>
              <Textarea
                value={templateForm.body_template}
                onChange={(e) => setTemplateForm({ ...templateForm, body_template: e.target.value })}
                rows={15}
                placeholder="Utilisez les variables: [Nom du programme], [Date du test], [Nature du problème constaté], etc."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={templateForm.is_default}
                onChange={(e) => setTemplateForm({ ...templateForm, is_default: e.target.checked })}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <Label htmlFor="is_default" className="mb-0">Définir comme template par défaut</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveTemplate} className="bg-red-600 hover:bg-red-700">
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSignature ? 'Modifier' : 'Nouvelle'} signature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom de l'utilisateur</Label>
              <Input
                value={signatureForm.user_name}
                onChange={(e) => setSignatureForm({ ...signatureForm, user_name: e.target.value })}
                placeholder="Ex: Jean Dupont"
              />
            </div>
            <div>
              <Label>Texte de la signature</Label>
              <Textarea
                value={signatureForm.signature_text}
                onChange={(e) => setSignatureForm({ ...signatureForm, signature_text: e.target.value })}
                rows={6}
                placeholder="Ex: Jean Dupont&#10;Responsable Qualité&#10;QWERTYS&#10;Email: jean.dupont@qwertys.fr&#10;Tél: 01 23 45 67 89"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSignatureDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveSignature} className="bg-red-600 hover:bg-red-700">
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Messagerie;
