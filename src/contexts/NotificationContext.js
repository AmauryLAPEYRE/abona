import React, { createContext, useState, useContext, useEffect } from 'react';
import { firestore } from '../firebase';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Charger les notifications de l'utilisateur
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const unsubscribe = firestore
      .collection('notifications')
      .where('userId', '==', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot(snapshot => {
        const notificationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        
        setNotifications(notificationsData);
        setUnreadCount(notificationsData.filter(notif => !notif.read).length);
        setLoading(false);
      }, error => {
        console.error("Erreur lors du chargement des notifications:", error);
        setLoading(false);
      });
      
    return unsubscribe;
  }, [currentUser]);

  // Marquer une notification comme lue
  const markAsRead = async (notificationId) => {
    if (!currentUser) return;
    
    try {
      await firestore
        .collection('notifications')
        .doc(notificationId)
        .update({
          read: true
        });
    } catch (error) {
      console.error("Erreur lors du marquage de la notification:", error);
    }
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    if (!currentUser || notifications.length === 0) return;
    
    try {
      const batch = firestore.batch();
      
      notifications.forEach(notification => {
        if (!notification.read) {
          const notifRef = firestore.collection('notifications').doc(notification.id);
          batch.update(notifRef, { read: true });
        }
      });
      
      await batch.commit();
    } catch (error) {
      console.error("Erreur lors du marquage de toutes les notifications:", error);
    }
  };

  // Supprimer une notification
  const deleteNotification = async (notificationId) => {
    if (!currentUser) return;
    
    try {
      await firestore
        .collection('notifications')
        .doc(notificationId)
        .delete();
    } catch (error) {
      console.error("Erreur lors de la suppression de la notification:", error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}