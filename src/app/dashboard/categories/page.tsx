// ============================
// Categories Management (Admin)
// ============================
// Create, edit, and delete categories with color coding and ordering.

'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { repo } from '@/lib/repository';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';
import toast from 'react-hot-toast';

const COLORS = ['#E50914', '#2196F3', '#4CAF50', '#FF5722', '#9C27B0', '#FFC107', '#00BCD4', '#E91E63'];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [editing, setEditing] = useState<Category | null>(null);

  const load = async () => setCategories(await repo.getCategories());

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!name.trim()) return;
    if (editing) {
      await repo.updateCategory(editing.id, { name: name.trim(), description, color });
      toast.success('Category updated');
    } else {
      const created = await repo.createCategory({
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        description,
        color,
        image: '',
        isActive: true,
        order: categories.length + 1,
      });
      toast.success('Category created');
    }
    setName('');
    setDescription('');
    setColor(COLORS[0]);
    setEditing(null);
    load();
  };

  const remove = async (category: Category) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    await repo.deleteCategory(category.id);
    toast.success('Category deleted');
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Categories</h1>
        <p className="text-netflix-gray text-sm">{categories.length} categories</p>
      </div>

      {/* Create / Edit Form */}
      <div className="bg-netflix-dark/50 border border-white/5 rounded-xl p-6 space-y-4">
        <h3 className="text-white font-semibold">{editing ? 'Edit Category' : 'New Category'}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-netflix-gray text-xs block mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Anime"
              className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none focus:border-white/40"
            />
          </div>
          <div>
            <label className="text-netflix-gray text-xs block mb-1.5">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn('w-7 h-7 rounded-full transition-transform', color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-110')}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="text-netflix-gray text-xs block mb-1.5">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description of the category"
            className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none focus:border-white/40"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={!name.trim()}
            className="flex items-center gap-2 bg-netflix-red hover:bg-red-700 text-white font-medium rounded-lg px-6 py-2.5 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {editing ? 'Save Changes' : 'Create Category'}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setName(''); setDescription(''); }} className="text-netflix-gray hover:text-white px-4 transition-colors">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div key={category.id} className="bg-netflix-dark/50 border border-white/5 rounded-xl p-5 hover:border-white/15 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" style={{ color: category.color }} />
                <span className="text-white font-medium">{category.name}</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditing(category); setName(category.name); setDescription(category.description); setColor(category.color); }}
                  className="p-1.5 text-netflix-gray hover:text-white transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => remove(category)} className="p-1.5 text-netflix-gray hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-netflix-gray text-sm line-clamp-2">{category.description || 'No description'}</p>
            <p className="text-netflix-gray text-xs mt-2">{category.videoCount} videos · slug: /{category.slug}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
