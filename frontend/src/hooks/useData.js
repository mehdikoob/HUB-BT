import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Helper pour obtenir le token
const getToken = () => localStorage.getItem('token');
const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

// ==================== PROGRAMMES ====================
export const useProgrammes = () => {
  return useQuery({
    queryKey: ['programmes'],
    queryFn: async () => {
      const response = await axios.get(`${API}/programmes`, { headers: authHeader() });
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - les programmes changent rarement
  });
};

// ==================== PARTENAIRES (liste complète pour les selects) ====================
export const usePartenairesAll = () => {
  return useQuery({
    queryKey: ['partenaires', 'all'],
    queryFn: async () => {
      const response = await axios.get(`${API}/partenaires`, { headers: authHeader() });
      // Trier par ordre alphabétique
      return response.data.sort((a, b) => 
        a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ==================== PARTENAIRES PAGINÉS ====================
export const usePartenairesPaginated = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['partenaires', 'paginated', page, limit],
    queryFn: async () => {
      const response = await axios.get(`${API}/partenaires`, {
        params: { paginate: true, page, limit },
        headers: authHeader()
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes pour les données paginées
  });
};

// ==================== SETTINGS ====================
export const useSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newSettings) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API}/settings`, newSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalider le cache des settings après mise à jour
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
};

// ==================== INVALIDATION HELPERS ====================
export const useInvalidatePartenaires = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['partenaires'] });
};

export const useInvalidateProgrammes = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['programmes'] });
};

// ==================== IDENTIFIANTS MYSTÈRE ====================
export const useIdentifiants = (programmeId = null) => {
  return useQuery({
    queryKey: ['identifiants', programmeId],
    queryFn: async () => {
      const params = programmeId ? { programme_id: programmeId } : {};
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/identifiants`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// ==================== TESTS SITE ====================
// Helper pour convertir mois/année en dates
const monthYearToDateRange = (monthYear) => {
  if (!monthYear) return { start: '', end: '' };
  const [year, month] = monthYear.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0, 23, 59, 59);
  return {
    start: firstDay.toISOString(),
    end: lastDay.toISOString()
  };
};

export const useTestsSite = (filters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['tests-site', filters, page, limit],
    queryFn: async () => {
      const params = { paginate: true, page, limit };
      if (filters.programme_id) params.programme_id = filters.programme_id;
      if (filters.partenaire_id) params.partenaire_id = filters.partenaire_id;
      if (filters.date_debut) {
        const range = monthYearToDateRange(filters.date_debut);
        params.date_debut = range.start;
      }
      if (filters.date_fin) {
        const range = monthYearToDateRange(filters.date_fin);
        params.date_fin = range.end;
      }
      
      const response = await axios.get(`${API}/tests-site`, { 
        params,
        headers: authHeader()
      });
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - les tests changent plus souvent
    keepPreviousData: true, // Garde les anciennes données pendant le chargement de nouvelles
  });
};

export const useCreateTestSite = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (testData) => {
      const response = await axios.post(`${API}/tests-site`, testData, {
        headers: authHeader()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests-site'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateTestSite = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await axios.put(`${API}/tests-site/${id}`, data, {
        headers: authHeader()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests-site'] });
    },
  });
};

export const useDeleteTestSite = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      await axios.delete(`${API}/tests-site/${id}`, {
        headers: authHeader()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests-site'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// ==================== TESTS LIGNE ====================
export const useTestsLigne = (filters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['tests-ligne', filters, page, limit],
    queryFn: async () => {
      const params = { paginate: true, page, limit };
      if (filters.programme_id) params.programme_id = filters.programme_id;
      if (filters.partenaire_id) params.partenaire_id = filters.partenaire_id;
      if (filters.date_debut) {
        const range = monthYearToDateRange(filters.date_debut);
        params.date_debut = range.start;
      }
      if (filters.date_fin) {
        const range = monthYearToDateRange(filters.date_fin);
        params.date_fin = range.end;
      }
      
      const response = await axios.get(`${API}/tests-ligne`, { 
        params,
        headers: authHeader()
      });
      return response.data;
    },
    staleTime: 1 * 60 * 1000,
    keepPreviousData: true,
  });
};

export const useCreateTestLigne = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (testData) => {
      const response = await axios.post(`${API}/tests-ligne`, testData, {
        headers: authHeader()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests-ligne'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateTestLigne = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await axios.put(`${API}/tests-ligne/${id}`, data, {
        headers: authHeader()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests-ligne'] });
    },
  });
};

export const useDeleteTestLigne = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      await axios.delete(`${API}/tests-ligne/${id}`, {
        headers: authHeader()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests-ligne'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// ==================== DASHBOARD ====================
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await axios.get(`${API}/stats/dashboard`, {
        headers: authHeader()
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// ==================== ALERTES ====================
export const useCreateAlerte = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alerteData) => {
      const response = await axios.post(`${API}/alertes`, alerteData, {
        headers: authHeader()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
