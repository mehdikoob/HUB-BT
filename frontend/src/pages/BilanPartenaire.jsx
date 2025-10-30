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

    setGenerating(true);

    try {
      const params = {
        partenaire_id: selectedPartenaire,
        period_type: periodType,
      };

      if (periodType === 'month') {
        params.year = selectedYear;
        params.month = selectedMonth;
      } else if (periodType === 'year') {
        params.year = selectedYear;
      }

      const response = await axios.get(`${API}/export/bilan-partenaire-ppt`, {
        params,
        responseType: 'blob',
      });

      // Get partenaire name for filename
      const partenaire = partenaires.find(p => p.id === selectedPartenaire);
      const partenaireNom = partenaire ? partenaire.nom : 'partenaire';
      
      // Get period label for filename
      let periodLabel = '';
      if (periodType === 'month') {
        const monthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
        periodLabel = `${monthLabel}_${selectedYear}`;
      } else if (periodType === 'year') {
        periodLabel = `Annee_${selectedYear}`;
      } else {
        periodLabel = 'Annee_Glissante';
      }

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
