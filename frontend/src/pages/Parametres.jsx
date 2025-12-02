import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { Users, UserPlus, Edit, Trash2, Shield, UserCog, Eye, EyeOff } from 'lucide-react';

const Parametres = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [programmes, setProgrammes] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    role: 'agent',
    is_active: true,
    programme_id: '',
    partenaire_id: '',
    programme_ids: []  // Pour les chefs de projet
  });

  const { getAuthHeader, user: currentUser, fetchCurrentUser } = useAuth();
  const { toast } = useToast();
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchUsers();
    fetchProgrammes();
    fetchPartenaires();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/users`, {
        headers: getAuthHeader()
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProgrammes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/programmes`, {
        headers: getAuthHeader()
      });
      setProgrammes(response.data);
    } catch (error) {
      console.error('Error fetching programmes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les programmes",
        variant: "destructive"
      });
    }
  };

  const fetchPartenaires = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/partenaires`, {
        headers: getAuthHeader()
      });
      setPartenaires(response.data);
    } catch (error) {
      console.error('Error fetching partenaires:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les partenaires",
        variant: "destructive"
      });
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        password: '',
        role: user.role,
        is_active: user.is_active,
        programme_id: user.programme_id || '',
        partenaire_id: user.partenaire_id || '',
        programme_ids: user.programme_ids || []  // Pour les chefs de projet
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        nom: '',
        prenom: '',
        password: '',
        role: 'agent',
        is_active: true,
        programme_id: '',
        partenaire_id: '',
        programme_ids: []  // Pour les chefs de projet
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setFormData({
      email: '',
      nom: '',
      prenom: '',
      password: '',
      role: 'agent',
      is_active: true,
      programme_id: '',
      partenaire_id: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // Update user
        const updateData = {
          nom: formData.nom,
          prenom: formData.prenom,
          role: formData.role,
          is_active: formData.is_active
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        
        await axios.put(`${API_URL}/api/users/${editingUser.id}`, updateData, {
          headers: getAuthHeader()
        });
        
        toast({
          title: "Succès",
          description: "Utilisateur mis à jour avec succès"
        });
      } else {
        // Create user
        await axios.post(`${API_URL}/api/users`, formData, {
          headers: getAuthHeader()
        });
        
        toast({
          title: "Succès",
          description: "Utilisateur créé avec succès"
        });
      }
      
      handleCloseDialog();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Erreur lors de l'enregistrement",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/users/${userId}`, {
        headers: getAuthHeader()
      });
      
      toast({
        title: "Succès",
        description: "Utilisateur supprimé avec succès"
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Erreur lors de la suppression",
        variant: "destructive"
      });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Vérification que les mots de passe correspondent
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive"
      });
      return;
    }
    
    // Vérification longueur minimum
    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Modifier le mot de passe de l'utilisateur actuel
      await axios.put(
        `${API_URL}/api/users/${currentUser.id}`,
        { password: passwordData.newPassword },
        { headers: getAuthHeader() }
      );
      
      toast({
        title: "Succès",
        description: "Mot de passe modifié avec succès"
      });
      
      setPasswordDialogOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      
      // Rafraîchir les données utilisateur
      fetchCurrentUser();
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Erreur lors du changement de mot de passe",
        variant: "destructive"
      });
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Admin', icon: Shield },
      chef_projet: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Chef de projet', icon: Shield },
      agent: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Agent', icon: UserCog },
      programme: { bg: 'bg-green-100', text: 'text-green-800', label: 'Programme', icon: UserCog },
      partenaire: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Partenaire', icon: UserCog }
    };
    
    const config = roleConfig[role] || roleConfig.agent;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.bg} ${config.text} hover:${config.bg}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Actif
      </Badge>
    ) : (
      <Badge variant="destructive">
        Inactif
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-gray-600 mt-1">Gestion des utilisateurs et des rôles</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nouvel utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </DialogTitle>
              <DialogDescription>
                {editingUser ? 'Modifiez les informations de l\'utilisateur' : 'Créez un nouvel utilisateur'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={editingUser !== null}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input
                      id="prenom"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Mot de passe {editingUser && '(laisser vide pour ne pas modifier)'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value, programme_id: '', partenaire_id: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="chef_projet">Chef de projet</SelectItem>
                      <SelectItem value="programme">Programme</SelectItem>
                      <SelectItem value="partenaire">Partenaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Multi-select programmes pour chef de projet */}
                {formData.role === 'chef_projet' && (
                  <div className="space-y-2">
                    <Label htmlFor="programme_ids">Programmes affiliés *</Label>
                    <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                      {programmes.map((prog) => (
                        <label key={prog.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.programme_ids.includes(prog.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, programme_ids: [...formData.programme_ids, prog.id] });
                              } else {
                                setFormData({ ...formData, programme_ids: formData.programme_ids.filter(id => id !== prog.id) });
                              }
                            }}
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                          />
                          <span className="text-sm">{prog.nom}</span>
                        </label>
                      ))}
                    </div>
                    {formData.programme_ids.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.programme_ids.length} programme(s) sélectionné(s)
                      </p>
                    )}
                  </div>
                )}
                
                {/* Programme selection (visible only if role is "programme") */}
                {formData.role === 'programme' && (
                  <div className="space-y-2">
                    <Label htmlFor="programme_id">Programme</Label>
                    <Select
                      value={formData.programme_id}
                      onValueChange={(value) => setFormData({ ...formData, programme_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un programme" />
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
                
                {/* Partenaire selection (visible only if role is "partenaire") */}
                {formData.role === 'partenaire' && (
                  <div className="space-y-2">
                    <Label htmlFor="partenaire_id">Partenaire</Label>
                    <Select
                      value={formData.partenaire_id}
                      onValueChange={(value) => setFormData({ ...formData, partenaire_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un partenaire" />
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
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Compte actif
                  </Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingUser ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mon Compte - Changement de mot de passe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCog className="h-5 w-5 mr-2" />
            Mon Compte
          </CardTitle>
          <CardDescription>
            Gérez vos informations personnelles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium text-gray-900">
                  {currentUser?.prenom} {currentUser?.nom}
                </p>
                <p className="text-sm text-gray-600">{currentUser?.email}</p>
                <div className="mt-2">
                  {getRoleBadge(currentUser?.role)}
                </div>
              </div>
              <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    Changer le mot de passe
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Changer mon mot de passe</DialogTitle>
                    <DialogDescription>
                      Choisissez un nouveau mot de passe sécurisé
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleChangePassword}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            required
                            minLength={6}
                            placeholder="Au moins 6 caractères"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showNewPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            required
                            minLength={6}
                            placeholder="Répétez le mot de passe"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showConfirmPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setPasswordDialogOpen(false);
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          setShowNewPassword(false);
                          setShowConfirmPassword(false);
                        }}
                      >
                        Annuler
                      </Button>
                      <Button type="submit">
                        Modifier le mot de passe
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gestion des utilisateurs (Admin uniquement) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Utilisateurs ({users.length})
          </CardTitle>
          <CardDescription>
            Gérez les utilisateurs et leurs permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">
                        {user.prenom} {user.nom}
                        {user.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-gray-500">(Vous)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      {user.role === 'chef_projet' && user.programme_ids && user.programme_ids.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          📋 {user.programme_ids.length} programme(s) affilié(s)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {getRoleBadge(user.role)}
                  {getStatusBadge(user.is_active)}
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    {user.id !== currentUser?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Parametres;
