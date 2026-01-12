
import React, { useState } from 'react';
import { AppData, Product } from '../types';
import { PRODUCT_CATEGORIES, UNITS } from '../constants';
import { Search, Plus, Edit2, Trash2, ArrowUpDown, Package } from 'lucide-react';

interface InventoryProps {
  data: AppData;
  onSave: (product: Product) => void;
  onDelete: (id: string) => void;
}

const EmptyProduct: Product = {
  id: '',
  name: '',
  brand: '',
  category: PRODUCT_CATEGORIES[0],
  currentStock: 0,
  minStock: 10,
  unit: 'Unidade'
};

export const Inventory: React.FC<InventoryProps> = ({ data, onSave, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentProduct, setCurrentProduct] = useState<Product>(EmptyProduct);
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [sortOrder, setSortOrder] = useState<'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc'>('name-asc');

  const filteredProducts = data.products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'Todos' || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'name-desc') return b.name.localeCompare(a.name);
      if (sortOrder === 'stock-asc') return a.currentStock - b.currentStock;
      if (sortOrder === 'stock-desc') return b.currentStock - a.currentStock;
      return 0;
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productToSave = {
      ...currentProduct,
      id: currentProduct.id || crypto.randomUUID()
    };
    onSave(productToSave);
    setIsEditing(false);
    setCurrentProduct(EmptyProduct);
  };

  const handleEdit = (product: Product) => {
    setCurrentProduct(product);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover este produto do catálogo? O histórico será mantido.')) {
      onDelete(id);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {currentProduct.id ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <button 
            onClick={() => setIsEditing(false)}
            className="text-slate-500 hover:text-slate-700"
          >
            Cancelar
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Produto *</label>
            <input 
              required
              type="text" 
              placeholder="Ex: Fralda Geriátrica G"
              className="w-full p-2 border border-slate-300 rounded-md"
              value={currentProduct.name}
              onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Marca</label>
              <input 
                type="text" 
                className="w-full p-2 border border-slate-300 rounded-md"
                value={currentProduct.brand || ''}
                onChange={e => setCurrentProduct({...currentProduct, brand: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
              <select 
                className="w-full p-2 border border-slate-300 rounded-md"
                value={currentProduct.category}
                onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})}
              >
                {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Atual</label>
              <input 
                type="number" 
                min="0"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={currentProduct.currentStock}
                onChange={e => setCurrentProduct({...currentProduct, currentStock: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Mínimo</label>
              <input 
                type="number" 
                min="0"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={currentProduct.minStock}
                onChange={e => setCurrentProduct({...currentProduct, minStock: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
              <select 
                className="w-full p-2 border border-slate-300 rounded-md"
                value={currentProduct.unit}
                onChange={e => setCurrentProduct({...currentProduct, unit: e.target.value})}
              >
                 {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-4 justify-end pt-4">
            <button 
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-sm"
            >
              Salvar Produto
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-primary-600" />
            Controle de Estoque
          </h2>
          <p className="text-slate-500 text-sm">Gerencie o catálogo de produtos e seus níveis de estoque.</p>
        </div>
        <button 
          onClick={() => { setCurrentProduct(EmptyProduct); setIsEditing(true); }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 shadow-sm w-full md:w-auto justify-center"
        >
          <Plus size={20} />
          Novo Produto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar produto..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="md:col-span-3">
          <select 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="Todos">Todas as Categorias</option>
            {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="md:col-span-3 relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
            <ArrowUpDown size={18} />
          </div>
          <select 
            className="w-full pl-10 pr-4 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white appearance-none"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as any)}
          >
            <option value="name-asc">Nome (A-Z)</option>
            <option value="name-desc">Nome (Z-A)</option>
            <option value="stock-asc">Menor Estoque</option>
            <option value="stock-desc">Maior Estoque</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="p-4">Produto</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-center">Qtd. Atual</th>
                <th className="p-4 text-center">Min. Desejado</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => {
                const isLowStock = product.currentStock <= product.minStock;
                return (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{product.name}</div>
                      <div className="text-xs text-slate-400">{product.brand}</div>
                    </td>
                    <td className="p-4">{product.category}</td>
                    <td className="p-4 text-center font-bold text-lg">{product.currentStock} <span className="text-xs font-normal text-slate-400">{product.unit}</span></td>
                    <td className="p-4 text-center">{product.minStock}</td>
                    <td className="p-4 text-center">
                      {isLowStock ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Baixo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(product)} className="text-primary-600 hover:bg-primary-50 p-2 rounded-full">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            Nenhum produto encontrado.
          </div>
        )}
      </div>
    </div>
  );
};
