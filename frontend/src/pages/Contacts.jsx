import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await axios.get(`${API}/contacts/all`);
      setContacts(response.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des contacts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div data-testid="contacts-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Work Sans' }}>
          Répertoire des contacts
        </h1>
        <p className="text-gray-600">Liste centralisée de tous les contacts partenaires</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Partenaire
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Contact principal
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Programme(s) lié(s)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr key={contact.partenaire_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{contact.partenaire_nom}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.contact_email ? (
                        <a
                          href={`mailto:${contact.contact_email}`}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
                        >
                          <Mail size={16} />
                          {contact.contact_email}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Non renseigné</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{contact.programmes}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {contacts.length === 0 && (
        <Card className="border-0 shadow-sm mt-4">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 text-lg">Aucun contact disponible</p>
            <p className="text-sm text-gray-400 mt-2">Ajoutez des contacts aux partenaires pour les voir apparaître ici</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Contacts;
