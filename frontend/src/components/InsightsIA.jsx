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
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/insights/generate?period=${period}`, {
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-purple-500" size={24} />
            <div>
              <CardTitle>Insights IA</CardTitle>
              <CardDescription>Analyse intelligente propulsée par Gemini</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">📊 Dernière semaine</SelectItem>
                <SelectItem value="month">📅 Dernier mois</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={generateInsights} 
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Génération...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Générer
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!insights && !loading && (
          <div className="text-center py-12 text-gray-500">
            <Sparkles className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-lg font-medium mb-2">Aucun insight généré</p>
            <p className="text-sm">Cliquez sur "Générer" pour obtenir une analyse IA de vos données</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="mx-auto mb-4 animate-spin text-purple-500" size={48} />
            <p className="text-lg font-medium text-gray-700">Analyse en cours...</p>
            <p className="text-sm text-gray-500 mt-2">L'IA analyse vos données (5-10 secondes)</p>
          </div>
        )}

        {insights && insights.enabled && (
          <div className="space-y-4">
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
                  <p className="text-xs text-gray-600">Insights IA</p>
                </div>
              </div>
            )}

            {/* Insights générés */}
            {insights.insights && insights.insights.length > 0 ? (
              <div className="space-y-3">
                {insights.insights.map((insight, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border ${getInsightBgColor(insight.type)} transition-all hover:shadow-md`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {insight.title}
                        </h3>
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
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Info className="mx-auto mb-2 text-gray-300" size={32} />
                <p className="text-sm">Aucun insight significatif trouvé pour cette période</p>
              </div>
            )}

            {/* Résumé global */}
            {insights.summary && (
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
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
              <p className="text-xs text-gray-400 text-right mt-4">
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
