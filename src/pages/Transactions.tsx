import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Transaction } from '../types';
import { ArrowDownRight, ArrowUpRight, Clock, User as UserIcon, Calendar, Info } from 'lucide-react';

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'VENTAS' | 'COMPRAS'>('ALL');

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trans: Transaction[] = [];
      snapshot.forEach(doc => {
        trans.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(trans);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const ventas = transactions.filter(t => t.type === 'Ingreso');
  const compras = transactions.filter(t => t.type === 'Egreso' && t.method === 'COMPRA'); // Asumimos método 'COMPRA' vs 'RETIRO'

  const totalVentas = ventas.reduce((sum, t) => sum + t.amount, 0);
  const totalCompras = compras.reduce((sum, t) => sum + t.amount, 0);

  const displayedTransactions = transactions.filter(t => {
    if (filter === 'ALL') return true;
    if (filter === 'VENTAS') return t.type === 'Ingreso';
    if (filter === 'COMPRAS') return t.type === 'Egreso'; // Podría incluir retiros
    return true;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-primary">Cargando transacciones...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-title font-bold text-foreground">Transacciones</h1>

      {/* Resumen Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Total Ingresos (Ventas)</p>
              <h3 className="text-3xl font-bold text-green-500">{totalVentas.toFixed(2)} Bs</h3>
            </div>
            <div className="bg-green-500/10 p-3 rounded-full">
              <ArrowDownRight className="text-green-500" size={24} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">{ventas.length} transacciones registradas</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Total Egresos (Compras/Retiros)</p>
              <h3 className="text-3xl font-bold text-red-500">{totalCompras.toFixed(2)} Bs</h3>
            </div>
            <div className="bg-red-500/10 p-3 rounded-full">
              <ArrowUpRight className="text-red-500" size={24} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">{compras.length} compras registradas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6">
        <button 
          onClick={() => setFilter('ALL')}
          className={`pb-2 text-sm font-medium transition-colors ${filter === 'ALL' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Todas
        </button>
        <button 
          onClick={() => setFilter('VENTAS')}
          className={`pb-2 text-sm font-medium transition-colors ${filter === 'VENTAS' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Ventas ({ventas.length})
        </button>
        <button 
          onClick={() => setFilter('COMPRAS')}
          className={`pb-2 text-sm font-medium transition-colors ${filter === 'COMPRAS' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Egresos ({transactions.length - ventas.length})
        </button>
      </div>

      {/* Listado */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {displayedTransactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No hay transacciones para mostrar.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayedTransactions.map((t) => (
              <div key={t.id} className="p-4 sm:p-6 hover:bg-muted/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 p-2 rounded-full shrink-0 ${t.type === 'Ingreso' ? 'bg-primary/10' : 'bg-red-500/10'}`}>
                      {t.type === 'Ingreso' 
                        ? <ArrowDownRight className="text-primary" size={20} /> 
                        : <ArrowUpRight className="text-red-500" size={20} />
                      }
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-base">{t.description}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {t.date ? t.date.toDate().toLocaleString('es-BO') : 'Pendiente...'}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserIcon size={12} />
                          {t.userName || 'Sistema'}
                        </span>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-foreground border border-border font-medium text-[10px] uppercase">
                          {t.method}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0 ml-12 sm:ml-0">
                    <span className={`text-xl font-bold font-title ${t.type === 'Ingreso' ? 'text-primary' : 'text-red-500'}`}>
                      {t.type === 'Ingreso' ? '+' : '-'}{t.amount.toFixed(2)} Bs
                    </span>
                  </div>
                </div>

                {/* Items Detallados si existen */}
                {t.items && t.items.length > 0 && (
                  <div className="mt-4 ml-12 p-3 bg-background rounded-md border border-border/50 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-2 flex items-center gap-1"><Info size={12}/> Detalle de productos:</p>
                    <ul className="space-y-1">
                      {t.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between border-b border-border/30 pb-1 last:border-0 last:pb-0">
                          <span>{item.quantity} {item.mode === 'pack' ? 'paq.' : 'unid.'} x {item.name}</span>
                          <span>{(item.quantity * item.salePrice).toFixed(2)} Bs</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
