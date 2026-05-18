import { Link, Outlet, useLocation } from 'react-router-dom';
import { Package, LineChart, Users, ArrowLeftRight, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../lib/firebase';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';

export default function AppLayout() {
  const location = useLocation();
  const { currentUser, userData } = useAuth();
  const [balance, setBalance] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'cashRegister'), (doc) => {
      if (doc.exists()) {
        setBalance(doc.data().balance || 0);
      }
    });
    return () => unsub();
  }, []);

  const navItems = [
    { name: 'Inventario', path: '/', icon: Package },
    { name: 'Transacciones', path: '/transacciones', icon: ArrowLeftRight },
  ];

  if (userData?.role !== 'empleado') {
    navItems.push({ name: 'Estadísticas', path: '/estadisticas', icon: LineChart });
    navItems.push({ name: 'Usuarios', path: '/usuarios', icon: Users });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header Sticky */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🥷</span>
              <span className="font-title text-2xl font-bold text-primary tracking-widest hidden sm:inline-block">ALOJA</span>
            </Link>
            
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map(item => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Pill Caja */}
            <div className="bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full flex items-center gap-2">
              <span className="text-xs text-primary/70 font-medium uppercase tracking-wider hidden sm:inline">Caja</span>
              <span className="text-primary font-bold">{balance.toFixed(2)} Bs</span>
            </div>

            {/* Desktop User Action */}
            <div className="hidden sm:flex items-center gap-4 border-l border-border pl-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium leading-none">{userData?.name || currentUser?.email}</span>
                <span className="text-xs text-muted-foreground mt-1">{userData?.role}</span>
              </div>
              <button
                onClick={() => auth.signOut()}
                className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-md hover:bg-destructive/10"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-2 text-muted-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <nav className="flex flex-col p-4 space-y-2">
              {navItems.map(item => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
              <div className="pt-4 mt-2 border-t border-border flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{userData?.name || currentUser?.email}</span>
                  <span className="text-xs text-muted-foreground">{userData?.role}</span>
                </div>
                <button
                  onClick={() => auth.signOut()}
                  className="flex items-center gap-2 text-destructive text-sm font-medium px-3 py-2 rounded-md hover:bg-destructive/10"
                >
                  <LogOut size={16} />
                  Salir
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
