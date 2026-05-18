import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Transaction } from '../types';
import { DollarSign, ArrowDownRight, ArrowUpRight, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import WithdrawDialog from '../components/WithdrawDialog';

export default function Statistics() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'SEMANA' | 'MES'>('MES');
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  useEffect(() => {
    // Escuchar caja
    const unsubCaja = onSnapshot(doc(db, 'settings', 'cashRegister'), (doc) => {
      if (doc.exists()) {
        setBalance(doc.data().balance || 0);
      }
    });

    // Escuchar transacciones
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubTrans = onSnapshot(q, (snapshot) => {
      const trans: Transaction[] = [];
      snapshot.forEach(doc => {
        trans.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(trans);
      setLoading(false);
    });

    return () => {
      unsubCaja();
      unsubTrans();
    };
  }, []);

  // Filtrar por período (Simplificado para el mockup: asumimos mes actual o últimos 7 días)
  const now = new Date();
  const periodTransactions = transactions.filter(t => {
    if (!t.date) return false;
    const tDate = t.date.toDate();
    if (period === 'MES') {
      return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    } else {
      const msInWeek = 7 * 24 * 60 * 60 * 1000;
      return (now.getTime() - tDate.getTime()) <= msInWeek;
    }
  });

  const totalVentas = periodTransactions.filter(t => t.type === 'Ingreso').reduce((sum, t) => sum + t.amount, 0);
  const totalGastos = periodTransactions.filter(t => t.type === 'Egreso' && t.method === 'COMPRA').reduce((sum, t) => sum + t.amount, 0);
  const ganancia = totalVentas - totalGastos;

  const ultimasTransacciones = periodTransactions.slice(0, 10);

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-primary">Cargando estadísticas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-title font-bold text-foreground">Estadísticas y Finanzas</h1>
          <p className="text-muted-foreground mt-1">Análisis de rendimiento del negocio</p>
        </div>
        
        <button 
          onClick={() => setIsWithdrawOpen(true)}
          className="flex items-center justify-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-md hover:bg-muted transition-colors text-sm font-medium"
        >
          <DollarSign size={16} className="text-muted-foreground" />
          Registrar Retiro
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted/50 p-1 rounded-lg w-fit border border-border">
        <button 
          onClick={() => setPeriod('SEMANA')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === 'SEMANA' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Últimos 7 días
        </button>
        <button 
          onClick={() => setPeriod('MES')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === 'MES' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Este Mes
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-muted-foreground text-sm font-medium">Ventas ({period === 'MES' ? 'Mes' : 'Semana'})</p>
            <div className="bg-primary/10 p-2 rounded-md">
              <ArrowDownRight className="text-primary" size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-foreground">{totalVentas.toFixed(2)} Bs</h3>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-muted-foreground text-sm font-medium">Compras de Stock</p>
            <div className="bg-red-500/10 p-2 rounded-md">
              <ArrowUpRight className="text-red-500" size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-foreground">{totalGastos.toFixed(2)} Bs</h3>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-5">
            <TrendingUp size={80} />
          </div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <p className="text-muted-foreground text-sm font-medium">Ganancia Bruta</p>
            <div className="bg-green-500/10 p-2 rounded-md">
              <TrendingUp className="text-green-500" size={18} />
            </div>
          </div>
          <h3 className={`text-2xl font-bold relative z-10 ${ganancia >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {ganancia >= 0 ? '+' : ''}{ganancia.toFixed(2)} Bs
          </h3>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-primary/80 text-sm font-medium">Caja Actual (En vivo)</p>
            <div className="bg-primary/20 p-2 rounded-md">
              <DollarSign className="text-primary" size={18} />
            </div>
          </div>
          <h3 className="text-3xl font-title font-bold text-primary">{balance.toFixed(2)} Bs</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Placeholder */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm min-h-[300px] flex flex-col">
          <h3 className="font-title text-lg font-semibold mb-4">Resumen Visual</h3>
          <div className="flex-1 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground bg-muted/20">
            <div className="text-center">
              <LineChartIcon className="mx-auto mb-2 opacity-50" size={32} />
              <p>El gráfico se renderizará aquí</p>
              <p className="text-xs mt-1">(Requiere biblioteca de gráficos como Recharts)</p>
            </div>
          </div>
        </div>

        {/* Últimas Transacciones */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="font-title text-lg font-semibold mb-4 flex items-center gap-2">
            <CalendarIcon size={18} className="text-primary" />
            Últimos Movimientos
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {ultimasTransacciones.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No hay movimientos en este período</p>
            ) : (
              ultimasTransacciones.map(t => (
                <div key={t.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`p-1.5 rounded-full shrink-0 ${t.type === 'Ingreso' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}>
                      {t.type === 'Ingreso' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-foreground truncate" title={t.description}>{t.description}</p>
                      <p className="text-[10px] text-muted-foreground">{t.date ? t.date.toDate().toLocaleDateString('es-BO') : ''}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${t.type === 'Ingreso' ? 'text-primary' : 'text-foreground'}`}>
                    {t.type === 'Ingreso' ? '+' : '-'}{t.amount.toFixed(1)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isWithdrawOpen && (
        <WithdrawDialog onClose={() => setIsWithdrawOpen(false)} />
      )}
    </div>
  );
}

// Icono auxiliar para el placeholder
function LineChartIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  )
}
