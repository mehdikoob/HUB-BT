import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileBarChart, Download, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BilanPartenaire = () => {
  const [partenaires, setPartenaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPartenaire, setSelectedPartenaire] = useState('');
  
  // Date range state
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  useEffect(() => {
    fetchPartenaires();
    // Set default dates (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setDateDebut(firstDay.toISOString().split('T')[0]);
    setDateFin(lastDay.toISOString().split('T')[0]);
  }, []);

  const fetchPartenaires = async () => {
    try {
      const response = await axios.get(`${API}/partenaires`);
      setPartenaires(response.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des partenaires');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBilan = async () => {
    if (!selectedPartenaire) {
      toast.error('Veuillez sélectionner un partenaire');
      return;
    }

    if (!dateDebut || !dateFin) {
      toast.error('Veuillez sélectionner une période (date début et fin)');
      return;
    }

    if (new Date(dateDebut) > new Date(dateFin)) {
      toast.error('La date de début doit être antérieure à la date de fin');
      return;
    }

    setGenerating(true);

    try {
      const response = await axios.get(`${API}/export/bilan-partenaire-ppt`, {
        params: {
          partenaire_id: selectedPartenaire,
          date_debut: dateDebut,
          date_fin: dateFin
        },
        responseType: 'blob',
      });

      // Get partenaire name for filename
      const partenaire = partenaires.find(p => p.id === selectedPartenaire);
      const partenaireNom = partenaire ? partenaire.nom : 'partenaire';
      
      // Format period label for filename
      const dateDebutObj = new Date(dateDebut);
      const dateFinObj = new Date(dateFin);
      const periodLabel = `${dateDebutObj.toLocaleDateString('fr-FR')}_au_${dateFinObj.toLocaleDateString('fr-FR')}`.replace(/\//g, '-');

      const filename = `Bilan_${partenaireNom}_${periodLabel}.pptx`;

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Bilan PowerPoint généré avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la génération du bilan');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div data-testid="bilan-partenaire-page">
      {/* Bannière "En travaux" */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-yellow-800">
              ⚠️ Cette fonctionnalité est en cours de développement. Certaines options peuvent être limitées.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Work Sans' }}>
          <FileBarChart className="inline-block mr-3" size={40} />
          Bilan Partenaire
        </h1>
        <p className="text-gray-600">Génération de rapports PowerPoint par partenaire</p>
      </div>

      <Card className="border-0 shadow-sm p-8 max-w-3xl">
        <div className="space-y-6">
          {/* Partenaire Selection */}
          <div>
            <Label htmlFor="partenaire" className="text-base font-semibold mb-2 block">
              Sélectionner un partenaire *
            </Label>
            <Select value={selectedPartenaire} onValueChange={setSelectedPartenaire}>
              <SelectTrigger data-testid="select-partenaire" className="w-full">
                <SelectValue placeholder="Choisir un partenaire" />
              </SelectTrigger>
              <SelectContent>
                {partenaires
                  .sort((a, b) => a.nom.localeCompare(b.nom))
                  .map((partenaire) => (
                    <SelectItem key={partenaire.id} value={partenaire.id}>
                      {partenaire.nom}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Selection - Custom Date Range */}
          <div>
            <Label htmlFor="period-range" className="text-base font-semibold mb-2 block">
              <Calendar className="inline-block mr-2" size={18} />
              Période d'analyse *
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date-debut" className="text-sm font-medium mb-2 block">
                  Date de début
                </Label>
                <Input
                  id="date-debut"
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full"
                  data-testid="date-debut"
                />
              </div>
              <div>
                <Label htmlFor="date-fin" className="text-sm font-medium mb-2 block">
                  Date de fin
                </Label>
                <Input
                  id="date-fin"
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full"
                  data-testid="date-fin"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Sélectionnez une période personnalisée pour analyser les tests
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Information :</strong> Le bilan PowerPoint contiendra 3 slides par programme du partenaire 
              (Vue d'ensemble, Tests Sites, Tests Ligne), et une 4ème slide d'un rapport SAV général par bilan.
            </p>
          </div>

          {/* Generate Button */}
          <div className="pt-4">
            <Button
              onClick={handleGenerateBilan}
              disabled={!selectedPartenaire || generating}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg"
              data-testid="generate-bilan-btn"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Génération en cours...
                </>
              ) : (
                <>
                  <Download size={24} className="mr-3" />
                  Générer le bilan PowerPoint
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BilanPartenaire;
