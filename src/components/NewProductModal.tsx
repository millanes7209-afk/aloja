import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Image as ImageIcon } from 'lucide-react';

// Función para comprimir la imagen en el cliente
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Comprimir a WebP o JPEG con 0.6 de calidad (muy ligero)
          const dataUrl = canvas.toDataURL('image/webp', 0.6);
          resolve(dataUrl);
        } else {
          reject(new Error("Failed to get canvas context"));
        }
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function NewProductModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('SIN CATEGORÍA');
  const [salePrice, setSalePrice] = useState('');
  const [isDivisible, setIsDivisible] = useState(false);
  const [unitsPerPack, setUnitsPerPack] = useState('');
  const [unitSalePrice, setUnitSalePrice] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !salePrice) return;
    
    setLoading(true);
    try {
      let imageUrl = '';

      if (imageFile) {
        // Comprimir y convertir a Base64
        imageUrl = await compressImage(imageFile);
      }

      await addDoc(collection(db, 'products'), {
        name,
        category: category || 'SIN CATEGORÍA',
        costPrice: 0,
        salePrice: Number(salePrice),
        stock: 0,
        stockUnidades: 0,
        isDivisible,
        unitsPerPack: isDivisible ? Number(unitsPerPack) : 0,
        unitSalePrice: isDivisible ? Number(unitSalePrice) : 0,
        image: imageUrl // Guarda la cadena Base64 en Firestore directamente
      });
      onClose();
    } catch (error) {
      console.error('Error agregando producto: ', error);
      alert('Hubo un error al guardar el producto. La imagen puede ser demasiado grande incluso comprimida.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
          <h3 className="text-xl font-title text-primary">Nuevo Producto</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Subir Imagen */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Imagen del Producto</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-md bg-muted border border-dashed border-border flex items-center justify-center shrink-0 overflow-hidden">
                {imageFile ? (
                  <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={24} className="text-muted-foreground/50" />
                )}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImageFile(e.target.files[0]);
                  }
                }}
                className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">La imagen se comprimirá automáticamente para no saturar la base de datos.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nombre del Producto</label>
            <input 
              required
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="Ej. Coca Cola 2L"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Categoría</label>
              <input 
                type="text" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="SIN CATEGORÍA"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Precio Venta (Paq/Bs)</label>
              <input 
                required
                type="number" 
                min="0" step="0.1"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="isDivisible"
              checked={isDivisible}
              onChange={(e) => setIsDivisible(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-background accent-primary"
            />
            <label htmlFor="isDivisible" className="text-sm font-medium text-foreground cursor-pointer">
              ¿Se vende por unidad suelta?
            </label>
          </div>

          {isDivisible && (
            <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-md border border-border">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Unidades por Paq.</label>
                <input 
                  required={isDivisible}
                  type="number" 
                  min="1"
                  value={unitsPerPack}
                  onChange={(e) => setUnitsPerPack(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Ej. 6"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Precio Venta (Unid/Bs)</label>
                <input 
                  required={isDivisible}
                  type="number" 
                  min="0" step="0.1"
                  value={unitSalePrice}
                  onChange={(e) => setUnitSalePrice(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors font-medium"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
