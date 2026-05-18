import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AppUser } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { UserCircle, Shield, KeyRound, AlertTriangle } from 'lucide-react';

export default function Users() {
  const { userData } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = userData?.role === 'Admin';

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedUsers: AppUser[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() } as AppUser);
      });
      setUsers(fetchedUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePasswordChange = (userId: string) => {
    if (userId === userData?.id) {
      alert("Aquí podrías abrir un modal para actualizar tu propia contraseña usando updatePassword() de Firebase Auth.");
    } else {
      alert("Para cambiar la contraseña de otro usuario se requiere una Cloud Function de Firebase Admin SDK. Funcionalidad próximamente.");
    }
  };

  const displayedUsers = isAdmin ? users : users.filter(u => u.id === userData?.id);

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-primary">Cargando usuarios...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-title font-bold text-foreground">Gestión de Usuarios</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? 'Administra las cuentas y roles del sistema' : 'Tu perfil de usuario'}
        </p>
      </div>

      {!isAdmin && (
        <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-md flex items-start gap-3">
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          <div className="text-sm">
            <p className="font-bold">Vista Limitada</p>
            <p className="opacity-90">No eres administrador. Solo puedes ver y editar tu propia cuenta.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedUsers.map(user => (
          <div key={user.id} className="bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden flex flex-col">
            {/* Top color bar depending on role */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${user.role === 'Admin' ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
            
            <div className="flex items-start gap-4 mb-6 mt-2">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-title font-bold text-foreground uppercase border border-border shrink-0 shadow-inner">
                {user.name ? user.name.charAt(0) : <UserCircle size={32} className="text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-foreground truncate" title={user.name}>{user.name}</h3>
                <p className="text-sm text-muted-foreground truncate" title={user.email}>{user.email}</p>
                
                <div className="flex gap-2 mt-2">
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold flex items-center gap-1 w-fit ${
                    user.role === 'Admin' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted text-muted-foreground border border-border'
                  }`}>
                    {user.role === 'Admin' && <Shield size={10} />}
                    {user.role}
                  </span>
                  
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold w-fit ${
                    user.status === 'Activo' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'
                  }`}>
                    {user.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-border flex justify-end gap-2">
              <button 
                onClick={() => handlePasswordChange(user.id)}
                className="flex items-center gap-1.5 text-xs font-medium bg-background border border-border hover:border-primary/50 text-foreground px-3 py-2 rounded-md transition-colors w-full justify-center"
              >
                <KeyRound size={14} />
                Cambiar Contraseña
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
