// Todos los tipos son puramente TypeScript (sin imports de runtime)
// para evitar problemas de resolución de módulos en Vite

export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  stockUnidades: number;
  isDivisible: boolean;
  unitsPerPack: number;
  unitSalePrice: number;
  image?: string;
}

export interface TransactionItem {
  productId: string;
  name: string;
  quantity: number;
  salePrice: number;
  costPrice: number;
  mode: 'pack' | 'unit';
}

export interface Transaction {
  id: string;
  amount: number;
  // Usando any para el Timestamp de Firestore para evitar imports de runtime aquí
  date: any;
  description: string;
  items: TransactionItem[];
  method: string;
  type: 'Ingreso' | 'Egreso';
  userId: string;
  userName: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Vendedor' | string;
  status: 'Activo' | 'Inactivo';
}

// Alias para compatibilidad
export type User = AppUser;

export interface CashRegister {
  balance: number;
}
