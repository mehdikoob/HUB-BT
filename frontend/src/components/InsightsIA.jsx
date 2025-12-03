import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle, Info, Loader2, RefreshCw, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';

const InsightsIA = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('week');
  const [programmeId, setProgrammeId] = useState('');
  const [partenaireId, setPartenaireId] = useState('');
  const [programmes, setProgrammes] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProgrammes();
    fetchPartenaires();
  }, []);

  const fetchProgrammes = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/programmes`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setProgrammes(response.data);
    } catch (error) {
      console.error('Erreur chargement programmes:', error);
    }
  };

  const fetchPartenaires = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/partenaires`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setPartenaires(response.data);
    } catch (error) {
      console.error('Erreur chargement partenaires:', error);
    }
  };

  const generateInsights = async () => {
    setLoading(true);
    try {
      let url = `${process.env.REACT_APP_BACKEND_URL}/api/insights/generate?period=${period}`;
      if (programmeId) url += `&programme_id=${programmeId}`;
      if (partenaireId) url += `&partenaire_id=${partenaireId}`;
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.enabled) {
        setInsights(response.data);
        toast({
          title: "Insights générés",
          description: `${response.data.insights?.length || 0} insight(s) trouvé(s)`,
        });
      } else {
        toast({
          title: "Insights IA désactivés",
          description: response.data.message || "La fonctionnalité n'est pas activée",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur génération insights:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer les insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="text-orange-500" size={20} />;
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'trend':
        return <TrendingUp className="text-blue-500" size={20} />;
      case 'info':
      default:
        return <Info className="text-gray-500" size={20} />;
    }
  };

  const getInsightBgColor = (type) => {
    switch (type) {
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'trend':
        return 'bg-blue-50 border-blue-200';
      case 'info':
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getScopeLabel = () => {
    const parts = [];
    if (programmeId) {
      const prog = programmes.find(p => p.id === programmeId);
      if (prog) parts.push(prog.nom);
    }
    if (partenaireId) {
      const part = partenaires.find(p => p.id === partenaireId);
      if (part) parts.push(part.nom);
    }
    return parts.length > 0 ? ` - ${parts.join(' / ')}` : '';
  };

  return (
    <>
      <Card className="w-full shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-500" size={20} />
              <div>
                <CardTitle className="text-lg">Insights IA</CardTitle>
                <CardDescription className="text-sm">Analyse intelligente par Gemini</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Période */}
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="week">📊 Semaine</SelectItem>
                  <SelectItem value="month">📅 Mois</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Programme */}
              <Select value={programmeId} onValueChange={setProgrammeId}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Tous programmes" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="">🌐 Tous programmes</SelectItem>
                  {programmes.map((prog) => (
                    <SelectItem key={prog.id} value={prog.id}>
                      {prog.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Partenaire */}
              <Select value={partenaireId} onValueChange={setPartenaireId}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Tous partenaires" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="">👥 Tous partenaires</SelectItem>
                  {partenaires.map((part) => (
                    <SelectItem key={part.id} value={part.id}>
                      {part.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Bouton Générer */}
              <Button 
                onClick={generateInsights} 
                disabled={loading}
                className="gap-2 h-9"
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span className="hidden sm:inline">Analyse...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    <span className="hidden sm:inline">Générer</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {!insights && !loading && (
            <div className="text-center py-6 text-gray-500">
              <Sparkles className="mx-auto mb-3 text-gray-300" size={36} />
              <p className="text-sm font-medium mb-1">Aucun insight généré</p>
              <p className="text-xs">Sélectionnez vos filtres et cliquez sur "Générer"</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-6">
              <Loader2 className="mx-auto mb-3 animate-spin text-purple-500" size={36} />
              <p className="text-sm font-medium text-gray-700">Analyse IA en cours...</p>
              <p className="text-xs text-gray-500 mt-1">Patientez quelques secondes</p>
            </div>
          )}

          {insights && insights.enabled && (
            <div className="space-y-3">
              {/* Résumé global - VERSION COMPACTE */}
              {insights.summary && (
                <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Sparkles className="text-purple-500 flex-shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-purple-900 mb-1">
                        Résumé IA{getScopeLabel()}
                      </p>
                      <p className="text-sm text-purple-800 leading-relaxed">{insights.summary}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats + Bouton Voir détails */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>📊 {insights.stats?.total_tests || 0} tests</span>
                  <span>🔔 {insights.stats?.total_alertes || 0} alertes</span>
                  <span>✨ {insights.insights?.length || 0} insights</span>
                </div>
                
                {insights.insights && insights.insights.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDetailsOpen(true)}
                    className="gap-2 h-8 text-xs"
                  >
                    <Eye size={14} />
                    Voir détails
                  </Button>
                )}
              </div>

              {/* Message si aucun insight */}
              {(!insights.insights || insights.insights.length === 0) && (
                <div className="text-center py-4 text-gray-500">
                  <Info className="mx-auto mb-2 text-gray-300" size={24} />
                  <p className="text-xs">Aucun insight significatif pour cette sélection</p>
                </div>
              )}

              {/* Timestamp */}
              {insights.generated_at && (
                <p className="text-xs text-gray-400 text-right">
                  Généré le {new Date(insights.generated_at).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          )}

        {insights && insights.error && (
          <div className="text-center py-8">
            <AlertTriangle className="mx-auto mb-3 text-red-500" size={40} />
            <p className="text-sm text-red-600 font-medium mb-1">Erreur de génération</p>
            <p className="text-xs text-gray-600">{insights.message || insights.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InsightsIA;
