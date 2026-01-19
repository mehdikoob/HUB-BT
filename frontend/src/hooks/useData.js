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
