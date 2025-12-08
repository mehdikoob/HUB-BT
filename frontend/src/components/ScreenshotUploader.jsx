import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, X, Clipboard, Upload } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Label } from './ui/label';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ScreenshotUploader = ({ screenshots = [], onScreenshotsChange, maxScreenshots = 3 }) => {
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const handlePaste = async (e) => {
      // Ne traiter que si l'événement vient du formulaire
      const items = e.clipboardData?.items;
      if (!items) return;

      // Chercher une image dans le presse-papiers
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          
          // Vérifier la limite
          if (screenshots.length >= maxScreenshots) {
            toast.error(`Maximum ${maxScreenshots} captures autorisées`);
            return;
          }

          const file = item.getAsFile();
          if (!file) return;

          // Convertir en base64
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64Data = event.target.result;
            
            try {
              setUploading(true);
              
              // Upload au backend
              const response = await axios.post(
                `${API}/upload-screenshot`,
                {
                  image_data: base64Data,
                  filename: `screenshot-${Date.now()}.png`
                },
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                  }
                }
              );

              // Ajouter l'ID du fichier à la liste
              const newScreenshots = [...screenshots, response.data.file_id];
              onScreenshotsChange(newScreenshots);
              
              toast.success('Capture d\'écran ajoutée');
            } catch (error) {
              console.error('Erreur upload screenshot:', error);
              toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload');
            } finally {
              setUploading(false);
            }
          };
          
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    // Écouter l'événement paste sur le document
    document.addEventListener('paste', handlePaste);
    
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [screenshots, maxScreenshots, onScreenshotsChange]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier la limite
    if (screenshots.length >= maxScreenshots) {
      toast.error(`Maximum ${maxScreenshots} fichiers autorisés`);
      return;
    }

    // Valider le type de fichier
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Type de fichier non autorisé. Formats : JPG, PNG, PDF');
      return;
    }

    // Valider la taille (5MB max pour rester cohérent avec CTRL+V)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 5MB)');
      return;
    }

    setUploading(true);
    
    try {
      // Convertir en base64 pour utiliser le même endpoint
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target.result;
        
        try {
          const response = await axios.post(
            `${API}/upload-screenshot`,
            {
              image_data: base64Data,
              filename: file.name
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            }
          );

          const newScreenshots = [...screenshots, response.data.file_id];
          onScreenshotsChange(newScreenshots);
          
          toast.success('Fichier ajouté');
          e.target.value = ''; // Reset input
        } catch (error) {
          console.error('Erreur upload fichier:', error);
          toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload');
        } finally {
          setUploading(false);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      setUploading(false);
      toast.error('Erreur lors de la lecture du fichier');
    }
  };

  const removeScreenshot = async (index) => {
    const fileId = screenshots[index];
    
    try {
      // Supprimer du backend (optionnel - peut être fait lors de la suppression du test)
      await axios.delete(`${API}/screenshots/${fileId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const newScreenshots = screenshots.filter((_, i) => i !== index);
      onScreenshotsChange(newScreenshots);
      
      toast.success('Fichier supprimé');
    } catch (error) {
      console.error('Erreur suppression screenshot:', error);
      // Supprimer quand même de la liste locale
      const newScreenshots = screenshots.filter((_, i) => i !== index);
      onScreenshotsChange(newScreenshots);
    }
  };

  return (
    <div className="space-y-2" ref={formRef}>
      <Label className="flex items-center gap-2">
        <Clipboard className="h-4 w-4" />
        Pièces jointes {screenshots.length > 0 && `(${screenshots.length}/${maxScreenshots})`}
      </Label>
      
      <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ImageIcon className="h-4 w-4" />
            <span>
              <kbd className="px-2 py-1 bg-white border rounded text-xs font-mono">CTRL+V</kbd> ou
            </span>
          </div>
          
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || screenshots.length >= maxScreenshots}
              className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              📎 Parcourir
            </button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mb-2">
          Formats acceptés : JPG, PNG, PDF (max 5MB)
        </div>
        
        {uploading && (
          <div className="text-sm text-blue-600 mb-2">Upload en cours...</div>
        )}
        
        {screenshots.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {screenshots.map((fileId, index) => (
              <div key={index} className="relative group">
                <img
                  src={`${API}/screenshots/${fileId}?token=${localStorage.getItem('token')}`}
                  alt={`Capture ${index + 1}`}
                  className="w-full h-24 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => removeScreenshot(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                  {index + 1}/{maxScreenshots}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {screenshots.length === 0 && !uploading && (
          <div className="text-center text-sm text-gray-400 py-2">
            Aucune capture pour le moment
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenshotUploader;
