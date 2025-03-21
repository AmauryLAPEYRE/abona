import React, { useState, useEffect } from 'react';
import { firestore } from '../../firebase';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await firestore.collection('users').get();
        
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setUsers(usersData);
        setLoading(false);
      } catch (err) {
        setError("Erreur lors du chargement des utilisateurs");
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await firestore.collection('users').doc(userId).update({
        role: newRole
      });
      
      // Mettre à jour l'état local
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, role: newRole } 
          : user
      ));
    } catch (err) {
      setError(`Erreur lors de la mise à jour du rôle: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Chargement des utilisateurs...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Gestion des utilisateurs</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}
      
      {users.length === 0 ? (
        <p>Aucun utilisateur trouvé.</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Nom
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Email
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Rôle
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date d'inscription
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select 
                      value={user.role} 
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="user">Utilisateur</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.createdAt?.toDate ? 
                        new Date(user.createdAt.toDate()).toLocaleDateString() : 
                        'N/A'
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;