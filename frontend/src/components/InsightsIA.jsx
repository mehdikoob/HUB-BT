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
  const [programmeId, setProgrammeId] = useState('all');
  const [partenaireId, setPartenaireId] = useState('all');
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
      if (programmeId && programmeId !== 'all') url += `&programme_id=${programmeId}`;
      if (partenaireId && partenaireId !== 'all') url += `&partenaire_id=${partenaireId}`;
      
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
    if (programmeId && programmeId !== 'all') {
      const prog = programmes.find(p => p.id === programmeId);
      if (prog) parts.push(prog.nom);
    }
    if (partenaireId && partenaireId !== 'all') {
      const part = partenaires.find(p => p.id === partenaireId);
      if (part) parts.push(part.nom);
    }
    return parts.length > 0 ? ` - ${parts.join(' / ')}` : '';
  };

  return (
    <>
      <Card className="w-full shadow-sm hover-lift transition-smooth">
        <CardHeader className="pb-1 pt-2 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-500" size={16} />
              <div>
                <CardTitle className="text-sm">Insights IA</CardTitle>
                <CardDescription className="text-xs">Analyse par Gemini</CardDescription>
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
                  <SelectItem value="all">🌐 Tous programmes</SelectItem>
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
                  <SelectItem value="all">👥 Tous partenaires</SelectItem>
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

        <CardContent className="pt-0 pb-2 px-3">
          {!insights && !loading && (
            <div className="text-center py-2 text-gray-500">
              <Sparkles className="mx-auto mb-1 text-gray-300" size={20} />
              <p className="text-xs font-medium">Aucun insight • Cliquez "Générer"</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-2">
              <Loader2 className="mx-auto mb-1 animate-spin text-purple-500" size={20} />
              <p className="text-xs font-medium text-gray-700">Analyse en cours...</p>
            </div>
          )}

          {insights && insights.enabled && (
            <div className="space-y-1.5">
              {/* Résumé global - VERSION MINIMALE */}
              {insights.summary && (
                <div className="p-1.5 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded animate-scale-in transition-smooth">
                  <div className="flex items-start gap-1.5">
                    <Sparkles className="text-purple-500 flex-shrink-0 mt-0.5" size={14} />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-purple-900">
                        Résumé IA{getScopeLabel()}
                      </p>
                      <p className="text-xs text-purple-800 leading-tight">{insights.summary}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats + Bouton Voir détails */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>📊 {insights.stats?.total_tests || 0}</span>
                  <span>🔔 {insights.stats?.total_alertes || 0}</span>
                  <span>✨ {insights.insights?.length || 0}</span>
                </div>
                
                {insights.insights && insights.insights.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDetailsOpen(true)}
                    className="gap-1 h-6 text-xs px-2 py-0"
                  >
                    <Eye size={10} />
                    Détails
                  </Button>
                )}
              </div>

              {/* Message si aucun insight */}
              {(!insights.insights || insights.insights.length === 0) && (
                <div className="text-center py-2 text-gray-500">
                  <Info className="mx-auto mb-0.5 text-gray-300" size={16} />
                  <p className="text-xs">Aucun insight</p>
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
            <div className="text-center py-6">
              <AlertTriangle className="mx-auto mb-2 text-red-500" size={32} />
              <p className="text-sm text-red-600 font-medium mb-1">Erreur de génération</p>
              <p className="text-xs text-gray-600">{insights.message || insights.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog pour détails complets */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="text-purple-500" size={24} />
              Insights IA détaillés
            </DialogTitle>
            <DialogDescription>
              Analyse complète{getScopeLabel()} - {period === 'week' ? 'Dernière semaine' : 'Dernier mois'}
            </DialogDescription>
          </DialogHeader>

          {insights && insights.enabled && (
            <div className="space-y-4 mt-4">
              {/* Statistiques */}
              {insights.stats && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{insights.stats.total_tests || 0}</p>
                    <p className="text-xs text-gray-600">Tests effectués</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{insights.stats.total_alertes || 0}</p>
                    <p className="text-xs text-gray-600">Alertes détectées</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{insights.insights?.length || 0}</p>
                    <p className="text-xs text-gray-600">Insights générés</p>
                  </div>
                </div>
              )}

              {/* Insights détaillés */}
              {insights.insights && insights.insights.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Insights détaillés</h3>
                  {insights.insights.map((insight, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border ${getInsightBgColor(insight.type)} transition-all`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getInsightIcon(insight.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {insight.title}
                          </h4>
                          <p className="text-sm text-gray-700 mb-2">
                            {insight.description}
                          </p>
                          {insight.action && (
                            <div className="flex items-start gap-2 mt-3 p-3 bg-white/50 rounded border border-gray-200/50">
                              <span className="text-xs font-medium text-gray-600">💡 Action recommandée :</span>
                              <p className="text-xs text-gray-700 flex-1">
                                {insight.action}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Résumé global */}
              {insights.summary && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Sparkles className="text-purple-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-medium text-purple-900 mb-1">Résumé global</p>
                      <p className="text-sm text-purple-800">{insights.summary}</p>
                    </div>
                  </div>
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
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InsightsIA;
