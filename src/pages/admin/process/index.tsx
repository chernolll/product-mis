import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Edit2, Eye, FileText, Folder, FolderOpen, Image as ImageIcon, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { CatalogItem } from '../../../api/catalog';
import { deleteProcess, type ProcessRecord } from '../../../api/process';
import { useCatalogStore } from '../../../store/catalogStore';
import { useProcessStore } from '../../../store/processStore';

export default function ProcessPage() {
  const { catalogs, fetchCatalogs, selectedCatalogId, setSelectedCatalogId } = useCatalogStore();
  const { processes, loading, fetchProcesses } = useProcessStore();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewProcess, setPreviewProcess] = useState<ProcessRecord | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  useEffect(() => {
    if (selectedCatalogId) {
      fetchProcesses(selectedCatalogId);
    }
  }, [selectedCatalogId, fetchProcesses]);

  // 自动展开包含selectedCatalogId的目录
  useEffect(() => {
    if (selectedCatalogId) {
      const expandToCatalog = (items: CatalogItem[], targetId: number): void => {
        for (const item of items) {
          if (item.catalogId === targetId) {
            return;
          }
          if (item.children && item.children.length > 0) {
            const childHasTarget = item.children.some(
              (child) => child.catalogId === targetId || child.children?.some((grandchild) => grandchild.catalogId === targetId),
            );
            if (childHasTarget) {
              setExpandedIds((prev) => new Set(prev).add(item.catalogId));
              expandToCatalog(item.children, targetId);
            }
          }
        }
      };
      expandToCatalog(catalogs, selectedCatalogId);
    }
  }, [selectedCatalogId, catalogs]);

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除此步骤吗？')) {
      try {
        const res = await deleteProcess(id);
        if (res.isSuccess && selectedCatalogId) {
          fetchProcesses(selectedCatalogId);
        } else {
          toast.error('删除步骤失败');
        }
      } catch (_e) {
        toast.error('删除步骤时发生错误');
      }
    }
  };

  const renderTree = (items: CatalogItem[], level = 0) => {
    return (
      <ul className={`space-y-1 ${level > 0 ? 'ml-4 border-l border-zinc-800 pl-2' : ''}`}>
        {items.map((item) => {
          const isExpanded = expandedIds.has(item.catalogId);
          const isSelected = selectedCatalogId === item.catalogId;
          const isLeaf = !item.children || item.children.length === 0;

          return (
            <li key={item.catalogId} className="relative">
              <div
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-zinc-800 border border-transparent'
                }`}
                onClick={() => {
                  if (!isLeaf) toggleExpand(item.catalogId);
                  if (isLeaf) setSelectedCatalogId(item.catalogId);
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
                  <FileText className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                ) : isExpanded ? (
                  <FolderOpen className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                ) : (
                  <Folder className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                )}
                <span className={`text-sm ${isSelected ? 'font-medium text-indigo-300' : 'text-zinc-300'}`}>{item.catalogName}</span>
              </div>
              {isExpanded && !isLeaf && renderTree(item.children as CatalogItem[], level + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="h-screen flex gap-6 overflow-hidden">
      {/* Sidebar for Catalog Selection */}
      <div className="w-64 bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex flex-col shrink-0">
        <h2 className="text-sm font-semibold text-zinc-100 mb-4 uppercase tracking-wider">选择目录</h2>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {catalogs.length === 0 ? <p className="text-sm text-zinc-500 text-center mt-4">暂无目录。</p> : renderTree(catalogs)}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-900 rounded-2xl border border-zinc-800 p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">步骤管理</h1>
            <p className="text-sm text-zinc-400 mt-1">{selectedCatalogId ? '管理所选目录的步骤。' : '请在左侧选择一个子目录以管理其步骤。'}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/admin/process/edit?catalogId=${selectedCatalogId}`)}
            disabled={!selectedCatalogId}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            添加步骤
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!selectedCatalogId ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <FolderOpen className="w-12 h-12 mb-4 opacity-20" />
              <p>请在左侧选择一个子目录。</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : processes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
              <p>该目录下暂无步骤。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {processes.map((process) => (
                <div
                  key={process.processDetailId}
                  className="group relative bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden hover:shadow-xl hover:shadow-black/40 transition-all duration-300 aspect-[4/3]"
                >
                  {process.newImageUrl ? (
                    <img
                      src={process.newImageUrl}
                      alt="Process"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-zinc-600">
                      <ImageIcon className="w-12 h-12 opacity-50" />
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80" />

                  {/* Actions */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-[-10px] group-hover:translate-y-0 duration-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewProcess(process);
                        setIsPreviewOpen(true);
                      }}
                      className="p-2 bg-black/50 backdrop-blur-md text-green-400 rounded-xl hover:bg-black/70 hover:text-green-300 transition-colors shadow-lg"
                      title="预览"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/admin/process/edit?id=${process.processDetailId}&catalogId=${selectedCatalogId}`)}
                      className="p-2 bg-black/50 backdrop-blur-md text-blue-400 rounded-xl hover:bg-black/70 hover:text-blue-300 transition-colors shadow-lg"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(process.processDetailId)}
                      className="p-2 bg-black/50 backdrop-blur-md text-red-400 rounded-xl hover:bg-black/70 hover:text-red-300 transition-colors shadow-lg"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col justify-end">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-medium rounded-lg backdrop-blur-md border border-indigo-500/20">
                        步骤 {process.sortFiled}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && previewProcess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-8 backdrop-blur-sm"
            onClick={() => setIsPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="flex w-full max-w-6xl h-full max-h-[85vh] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left: Steps */}
              <div className="w-1/6 min-w-75 p-6 overflow-y-auto custom-scrollbar border-r border-zinc-800">
                <div className="text-white">
                  {Array.from({ length: Math.max(previewProcess.titles?.length || 0, previewProcess.descriptions?.length || 0) }).map((_, index) => (
                    <div key={index} className="mb-6">
                      <h3 className="text-lg font-bold mb-2">{previewProcess.titles?.[index] || `步骤 ${index + 1}`}</h3>
                      <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                        {previewProcess.descriptions?.[index] || '暂无描述'}
                      </div>
                    </div>
                  ))}
                  {!previewProcess.titles?.length && !previewProcess.descriptions?.length && (
                    <div className="text-zinc-500 text-sm">暂无步骤信息</div>
                  )}
                </div>
              </div>
              {/* Right: Image */}
              <div className="flex-1 flex items-center justify-center pb-4 bg-[#060606] relative">
                <img
                  src={previewProcess.newImageUrl || previewProcess.imageUrl}
                  className="w-full h-full object-contain object-top-left"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
            <button
              className="absolute top-6 right-6 text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 p-2 rounded-xl transition-all"
              onClick={() => setIsPreviewOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
