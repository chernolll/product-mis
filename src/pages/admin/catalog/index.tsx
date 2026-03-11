import { ChevronDown, ChevronRight, Edit2, FileText, Folder, FolderOpen, FolderTree, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { addCatalog, type CatalogItem, deleteCatalog, updateCatalog } from '../../../api/catalog';
import { useCatalogStore } from '../../../store/catalogStore';

export default function CatalogPage() {
  const { catalogs, loading, fetchCatalogs, selectedCatalogId, setSelectedCatalogId } = useCatalogStore();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentCatalog, setCurrentCatalog] = useState<Partial<CatalogItem>>({});
  const [catalogName, setCatalogName] = useState('');

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleAdd = (parentId: number | null, level: number) => {
    if (level >= 3) {
      alert('最多允许创建3级目录。');
      return;
    }
    setModalMode('add');
    setCurrentCatalog({ parentId, level });
    setCatalogName('');
    setIsModalOpen(true);
  };

  const handleEdit = (catalog: CatalogItem) => {
    setModalMode('edit');
    setCurrentCatalog(catalog);
    setCatalogName(catalog.catalogName);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const catalogToDelete = catalogs.find((c) => c.catalogId === id) || findCatalog(catalogs, id);
    if (catalogToDelete?.children && catalogToDelete.children.length > 0) {
      alert('不能删除包含子目录的目录。');
      return;
    }

    if (window.confirm('确定要删除此目录吗？')) {
      try {
        const res = await deleteCatalog(id);
        if (res.isSuccess) {
          fetchCatalogs();
          if (selectedCatalogId === id) {
            setSelectedCatalogId(null);
          }
        } else {
          alert('删除目录失败');
        }
      } catch (e) {
        alert('删除目录时发生错误');
      }
    }
  };

  const findCatalog = (items: CatalogItem[], id: number): CatalogItem | undefined => {
    for (const item of items) {
      if (item.catalogId === id) return item;
      if (item.children) {
        const found = findCatalog(item.children as CatalogItem[], id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const handleSave = async () => {
    if (!catalogName.trim()) return;
    try {
      if (modalMode === 'add') {
        const res = await addCatalog({
          parentId: currentCatalog.parentId || null,
          catalogName: catalogName.trim(),
          level: (currentCatalog.level || 0) + 1,
        });
        if (res.isSuccess) {
          setIsModalOpen(false);
          fetchCatalogs();
        }
      } else {
        const res = await updateCatalog({
          catalogId: currentCatalog.catalogId!,
          catalogName: catalogName.trim(),
        });
        if (res.isSuccess) {
          setIsModalOpen(false);
          fetchCatalogs();
        }
      }
    } catch (e) {
      alert('保存目录时发生错误');
    }
  };

  const renderTree = (items: CatalogItem[], level = 0) => {
    return (
      <ul className={`space-y-1 ${level > 0 ? 'ml-6 border-l border-zinc-800 pl-2' : ''}`}>
        {items.map((item) => {
          const isExpanded = expandedIds.has(item.catalogId);
          const isSelected = selectedCatalogId === item.catalogId;
          const isLeaf = !item.children || item.children.length === 0;

          return (
            <li key={item.catalogId} className="relative">
              <div
                className={`flex items-center justify-between p-2 rounded-lg group transition-colors ${
                  isSelected ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-zinc-800 border border-transparent'
                }`}
              >
                <div
                  className="flex items-center gap-2 cursor-pointer flex-1"
                  onClick={() => {
                    if (!isLeaf) toggleExpand(item.catalogId);
                    setSelectedCatalogId(item.catalogId);
                  }}
                >
                  {!isLeaf ? (
                    isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    )
                  ) : (
                    <span className="w-4 h-4" />
                  )}
                  {isLeaf ? (
                    <FileText className={`w-5 h-5 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  ) : isExpanded ? (
                    <FolderOpen className={`w-5 h-5 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  ) : (
                    <Folder className={`w-5 h-5 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  )}
                  <span className={`text-sm ${isSelected ? 'font-medium text-indigo-300' : 'text-zinc-300'}`}>{item.catalogName}</span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.level < 3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(item.catalogId, item.level);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md"
                      title="添加子目录"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(item);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md"
                    title="编辑"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.catalogId);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {isExpanded && !isLeaf && renderTree(item.children as CatalogItem[], level + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">目录管理</h1>
          <p className="text-sm text-zinc-400 mt-1">管理您的目录结构（最多支持3级）。</p>
        </div>
        <button
          onClick={() => handleAdd(null, 0)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加根目录
        </button>
      </div>

      <div className="flex-1 bg-zinc-900 rounded-2xl border border-zinc-800 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : catalogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <FolderTree className="w-12 h-12 mb-4 opacity-20" />
            <p>暂无目录，请创建一个开始使用。</p>
          </div>
        ) : (
          renderTree(catalogs)
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">{modalMode === 'add' ? '添加目录' : '编辑目录'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">目录名称</label>
                <input
                  type="text"
                  value={catalogName}
                  onChange={(e) => setCatalogName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-zinc-600"
                  placeholder="请输入名称"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!catalogName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
