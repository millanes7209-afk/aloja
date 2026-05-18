import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Vendedor' | string;
  status: 'Activo' | 'Inactivo';
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData({ id: userDoc.id, ...userDoc.data() } as AppUser);
          } else {
            setUserData({
              id: user.uid,
              email: user.email || '',
              name: user.displayName || user.email?.split('@')[0] || 'Usuario',
              role: 'Vendedor',
              status: 'Activo',
            });
          }
        } catch (error) {
          console.error('Error cargando datos del usuario:', error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
