import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  Bold,
  FlipHorizontal,
  FlipVertical,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Square,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { domToJpeg } from 'modern-screenshot';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addProcess, getUploadUrl, queryProcess, updateProcess, uploadToOSS } from '../../../api/process';
import { useProcessStore } from '../../../store/processStore';

type ElementType = 'text' | 'rect' | 'arrow';
interface EditorElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color: string;
  fontSize?: number;
  fontWeight?: string;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
}

export default function ProcessEditPage() {
  const [searchParams] = useSearchParams();
  const catalogId = searchParams.get('catalogId');
  const processId = searchParams.get('id');
  const navigate = useNavigate();

  const { processes, fetchProcesses } = useProcessStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Left Panel: Titles & Descriptions
  const [steps, setSteps] = useState<{ title: string; description: string }[]>([{ title: '', description: '' }]);

  const [sortField, setSortField] = useState(1);
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImageToView, setPreviewImageToView] = useState<string>('');
  const [previewType, setPreviewType] = useState<'original' | 'edited' | null>(null);

  // Center Panel: DOM Editor
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const loadProcessData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await queryProcess(Number(catalogId));
      if (res.isSuccess) {
        const process = res.data?.find((p) => p.processDetailId === Number(processId));
        if (process) {
          const loadedSteps = Math.max(process.titles?.length || 0, process.descriptions?.length || 0);
          if (loadedSteps > 0) {
            const newSteps = [];
            for (let i = 0; i < loadedSteps; i++) {
              newSteps.push({
                title: process.titles?.[i] || '',
                description: process.descriptions?.[i] || '',
              });
            }
            setSteps(newSteps);
          }
          setSortField(process.sortFiled || 1);
          setOriginalImageUrl(process.imageUrl || '');
          setPreviewUrl(process.newImageUrl || '');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [catalogId, processId]);

  useEffect(() => {
    if (!catalogId) {
      navigate('/admin/process');
      return;
    }
    if (processes.length === 0) {
      fetchProcesses(Number(catalogId));
    }
    if (processId) {
      loadProcessData();
    } else {
      setSortField(processes.length + 1);
    }
  }, [catalogId, processId, fetchProcesses, navigate, loadProcessData, processes.length]);

  useEffect(() => {
    if (!containerRef.current || !naturalSize) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const availableW = width - 48; // 24px padding * 2
      const availableH = height - 48;
      const scale = Math.min(availableW / naturalSize.width, availableH / naturalSize.height, 1);
      setZoom(scale);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [naturalSize]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOriginalImage(file);
    const reader = new FileReader();
    reader.onload = (f) => {
      setOriginalImageUrl(f.target?.result as string);
      setElements([]); // clear elements on new image
      setPreviewUrl('');
    };
    reader.readAsDataURL(file);
  };

  const addElement = (type: ElementType) => {
    if (!naturalSize) return;
    const id = Date.now().toString();
    const centerX = naturalSize.width / 2;
    const centerY = naturalSize.height / 2;

    const newEle: EditorElement = {
      id,
      type,
      x: centerX - 100,
      y: centerY - 50,
      width: 200,
      height: 100,
      color: '#ef4444',
    };

    if (type === 'text') {
      newEle.text = '双击编辑文字';
      newEle.fontSize = 48;
      newEle.fontWeight = 'normal';
    } else if (type === 'arrow') {
      newEle.scaleX = 1;
      newEle.scaleY = 1;
      newEle.rotation = 0;
    }

    setElements([...elements, newEle]);
    setActiveElementId(id);
  };

  const updateElement = (id: string, updates: Partial<EditorElement>) => {
    setElements(elements.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter((e) => e.id !== id));
    if (activeElementId === id) setActiveElementId(null);
  };

  const handleRotateStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();

    const node = document.getElementById(`element-${id}`);
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - centerX;
      const dy = moveEvent.clientY - centerY;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      angle += 90; // Adjust so top is 0 degrees
      if (angle < 0) angle += 360;
      updateElement(id, { rotation: Math.round(angle) });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeElementId) {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
        deleteElement(activeElementId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeElementId, elements]);

  const generatePreview = useCallback(async () => {
    if (!editorRef.current || !naturalSize) return null;
    try {
      setActiveElementId(null);
      await new Promise((r) => setTimeout(r, 100)); // wait for selection ring to disappear
      const dataUrl = await domToJpeg(editorRef.current, {
        quality: 0.9,
        width: naturalSize.width,
        height: naturalSize.height,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });
      setPreviewUrl(dataUrl);
      return dataUrl;
    } catch (e) {
      console.error('Preview generation failed', e);
      return null;
    }
  }, [naturalSize]);

  const handleSave = async () => {
    if (!originalImageUrl) {
      alert('请上传一张原始图片。');
      return;
    }
    // if (steps.some(s => !s.title || !s.description)) {
    //   alert('请填写所有步骤的标题和描述。');
    //   return;
    // }

    setSaving(true);
    try {
      let finalPreviewUrl = previewUrl;
      if (elements.length > 0 || !previewUrl) {
        const generatedUrl = await generatePreview();
        if (generatedUrl) {
          finalPreviewUrl = generatedUrl;
        }
      }

      let newImageFile: File | null = null;
      if (finalPreviewUrl?.startsWith('data:image')) {
        const blob = await (await fetch(finalPreviewUrl)).blob();
        newImageFile = new File([blob], 'edited.jpg', { type: 'image/jpeg' });
      }

      let origImageName = '';
      let newImageName = '';

      if (originalImage) {
        const origUrlRes = await getUploadUrl();
        await uploadToOSS(origUrlRes.data.targetUrl, originalImage);
        origImageName = origUrlRes.data.imageName;
      } else {
        const getFileName = (url: string) => {
          if (!url) return '';
          const parts = url.split('/');
          return parts[parts.length - 1].split('?')[0];
        };
        origImageName = getFileName(originalImageUrl);
      }

      if (newImageFile) {
        const newUrlRes = await getUploadUrl();
        await uploadToOSS(newUrlRes.data.targetUrl, newImageFile);
        newImageName = newUrlRes.data.imageName;
      } else {
        const getFileName = (url: string) => {
          if (!url) return '';
          const parts = url.split('/');
          return parts[parts.length - 1].split('?')[0];
        };
        newImageName = getFileName(previewUrl);
      }

      const payload = {
        titles: steps.map((s) => s.title),
        descriptions: steps.map((s) => s.description),
        content: steps.map((s) => s.title).join('') + steps.map((s) => s.description).join(''),
        catalogId: Number(catalogId),
        sortFiled: sortField,
        imageName: origImageName,
        newImageName: newImageName || origImageName,
      };

      if (processId) {
        const res = await updateProcess({ ...payload, processDetailId: Number(processId) });
        if (!res.isSuccess) throw new Error(res.message || '更新步骤失败');
      } else {
        const res = await addProcess(payload);
        if (!res.isSuccess) throw new Error(res.message || '添加步骤失败');
      }
    } catch (e: any) {
      console.error(e);
      alert('保存步骤失败');
    } finally {
      setSaving(false);
    }
  };

  const activeElement = elements.find((e) => e.id === activeElementId);
  const sortOptions = Array.from({ length: processId ? processes.length : processes.length + 1 }, (_, i) => i + 1);

  // useEffect(() => {
  //   if (!naturalSize) return;
  //   const t = setInterval(() => {
  //     generatePreview();
  //   }, 1000);
  //   generatePreview();
  //   return () => {
  //     clearInterval(t);
  //   };
  // }, [naturalSize, generatePreview]);

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0 bg-zinc-950">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate('/admin/process')} className="p-2 hover:bg-zinc-900 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">{processId ? '编辑步骤' : '添加新步骤'}</h1>
            <p className="text-sm text-zinc-400 mt-1">编辑此步骤的图片和详细信息。</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存步骤
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel: Titles & Descriptions */}
        <div className="w-1/6 min-w-75 border-r border-zinc-800 flex flex-col bg-zinc-900 shrink-0">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
            <h2 className="font-semibold text-zinc-100">步骤文案</h2>
            <button
              type="button"
              onClick={() => setSteps([...steps, { title: '', description: '' }])}
              className="text-indigo-400 hover:text-indigo-300 p-1 hover:bg-indigo-500/20 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {steps.map((step, index) => (
              <div key={index} className="space-y-4 relative group">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">标题 {index + 1}</h3>
                  {steps.length > 1 && (
                    <button
                      onClick={() => setSteps(steps.filter((_, i) => i !== index))}
                      className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  value={step.title}
                  onChange={(e) => {
                    const newSteps = [...steps];
                    newSteps[index].title = e.target.value;
                    setSteps(newSteps);
                  }}
                  placeholder="输入标题"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 outline-none focus:border-indigo-500 transition-colors"
                />
                <textarea
                  value={step.description}
                  onChange={(e) => {
                    const newSteps = [...steps];
                    newSteps[index].description = e.target.value;
                    setSteps(newSteps);
                  }}
                  placeholder="输入文案描述"
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white/80 text-sm leading-relaxed whitespace-pre-wrap resize-none outline-none focus:border-indigo-500 transition-colors custom-scrollbar"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel: DOM Editor */}
        <div className="flex-1 relative flex flex-col bg-[#060606] overflow-hidden" ref={containerRef} onClick={() => setActiveElementId(null)}>
          {/* Toolbar */}
          <div
            className="absolute top-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex items-center p-1.5 gap-1 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => addElement('rect')}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
              title="添加矩形框"
            >
              <Square className="w-5 h-5" />
            </button>
            <button
              onClick={() => addElement('arrow')}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
              title="添加引导线"
            >
              <ArrowUpRight className="w-5 h-5" />
            </button>
            <button onClick={() => addElement('text')} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors" title="添加文字">
              <Type className="w-5 h-5" />
            </button>

            {activeElementId && activeElement && (
              <>
                <div className="w-px h-6 bg-zinc-800 mx-1" />
                <input
                  type="color"
                  value={activeElement.color}
                  onChange={(e) => updateElement(activeElementId, { color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                  title="颜色"
                />
                {activeElement.type === 'text' && (
                  <>
                    <input
                      type="number"
                      value={activeElement.fontSize}
                      onChange={(e) => updateElement(activeElementId, { fontSize: Number(e.target.value) })}
                      className="w-16 px-2 py-1 bg-zinc-950 text-zinc-100 border border-zinc-700 rounded text-sm outline-none"
                      title="字体大小"
                    />
                    <button
                      onClick={() => updateElement(activeElementId, { fontWeight: activeElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
                      className={`p-1.5 rounded transition-colors ${activeElement.fontWeight === 'bold' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                      title="加粗"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                  </>
                )}
                {activeElement.type === 'arrow' && (
                  <>
                    <div className="w-px h-6 bg-zinc-800 mx-1" />

                    <button
                      onClick={() => updateElement(activeElementId, { scaleX: (activeElement.scaleX || 1) * -1 })}
                      className="p-1.5 rounded text-zinc-400 hover:bg-zinc-800 transition-colors"
                      title="水平翻转"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateElement(activeElementId, { scaleY: (activeElement.scaleY || 1) * -1 })}
                      className="p-1.5 rounded text-zinc-400 hover:bg-zinc-800 transition-colors"
                      title="垂直翻转"
                    >
                      <FlipVertical className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => deleteElement(activeElementId)}
                  className="p-1.5 rounded text-red-400 hover:bg-red-500/20 transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Editor Area */}
          <div className="flex-1 overflow-auto pt-6 custom-scrollbar">
            {originalImageUrl ? (
              <div
                style={{
                  width: naturalSize ? naturalSize.width * zoom : 'auto',
                  height: naturalSize ? naturalSize.height * zoom : 'auto',
                }}
                className="relative shrink-0"
              >
                <div
                  ref={editorRef}
                  className="absolute top-0 left-0 origin-top-left shadow-2xl bg-transparent"
                  style={{
                    width: naturalSize?.width || 0,
                    height: naturalSize?.height || 0,
                    transform: `scale(${zoom})`,
                  }}
                >
                  <img
                    src={originalImageUrl}
                    className="w-full h-full pointer-events-none block object-contain object-top-left"
                    crossOrigin="anonymous"
                    onLoad={(e) => {
                      setNaturalSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight });
                    }}
                  />
                  {elements.map((ele) => {
                    const isActive = ele.id === activeElementId;
                    return (
                      <Rnd
                        key={ele.id}
                        scale={zoom}
                        position={{ x: ele.x, y: ele.y }}
                        size={{ width: ele.width, height: ele.height }}
                        minWidth={ele.type === 'arrow' ? 1 : 10}
                        minHeight={ele.type === 'arrow' ? 1 : 10}
                        onDragStop={(_e, d) => updateElement(ele.id, { x: d.x, y: d.y })}
                        onResizeStop={(_e, _direction, ref, _delta, position) => {
                          updateElement(ele.id, {
                            width: parseFloat(ref.style.width),
                            height: parseFloat(ref.style.height),
                            ...position,
                          });
                        }}
                        onClick={(e: any) => {
                          e.stopPropagation();
                          setActiveElementId(ele.id);
                        }}
                        className={isActive ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950' : ''}
                        style={{ zIndex: isActive ? 10 : 1 }}
                        bounds="parent"
                        cancel=".rotate-handle"
                      >
                        <div id={`element-${ele.id}`} className="w-full h-full relative">
                          {ele.type === 'rect' && <div style={{ width: '100%', height: '100%', border: `4px solid ${ele.color}` }} />}
                          {ele.type === 'text' && (
                            <textarea
                              value={ele.text}
                              onChange={(e) => updateElement(ele.id, { text: e.target.value })}
                              style={{
                                width: '100%',
                                height: '100%',
                                color: ele.color,
                                fontSize: `${ele.fontSize}px`,
                                fontWeight: ele.fontWeight,
                                background: 'transparent',
                                border: 'none',
                                resize: 'none',
                                outline: 'none',
                                fontFamily: 'Inter, sans-serif',
                                lineHeight: 1.2,
                                overflow: 'hidden',
                                cursor: isActive ? 'text' : 'move',
                              }}
                            />
                          )}
                          {ele.type === 'arrow' && (
                            <div
                              style={{ width: '100%', height: '100%', transform: `rotate(${ele.rotation || 0}deg)`, transformOrigin: 'center' }}
                              className="relative"
                            >
                              {isActive && (
                                <div
                                  className="rotate-handle absolute -top-8 left-1/2 w-6 h-6 bg-zinc-800 border-2 border-indigo-500 rounded-full cursor-crosshair flex items-center justify-center -translate-x-1/2 z-50 shadow-lg"
                                  onMouseDown={(e) => handleRotateStart(e, ele.id)}
                                  title="拖拽旋转"
                                >
                                  <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                                  <div className="absolute top-full left-1/2 w-0.5 h-4 bg-indigo-500 -translate-x-1/2" />
                                </div>
                              )}
                              <svg
                                width="100%"
                                height="100%"
                                style={{ overflow: 'visible', transform: `scaleX(${ele.scaleX || 1}) scaleY(${ele.scaleY || 1})` }}
                              >
                                <defs>
                                  <marker id={`arrowhead-${ele.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill={ele.color} />
                                  </marker>
                                </defs>
                                <line x1="0" y1="0" x2="100%" y2="100%" stroke={ele.color} strokeWidth="6" markerEnd={`url(#arrowhead-${ele.id})`} />
                              </svg>
                            </div>
                          )}
                        </div>
                      </Rnd>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/20 gap-4">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                  <ImageIcon size={40} className="opacity-20" />
                </div>
                <p className="text-sm font-medium">请在右侧上传原始图片</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Sort & Upload & Preview */}
        <div className="w-80 border-l border-zinc-800 flex flex-col bg-zinc-900 shrink-0 p-6 overflow-y-auto space-y-8 custom-scrollbar">
          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">排序</label>
            <select
              value={sortField}
              onChange={(e) => setSortField(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors appearance-none"
            >
              {sortOptions.map((opt) => (
                <option key={opt} value={opt}>
                  第 {opt} 步
                </option>
              ))}
            </select>
          </div>

          {/* Upload */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-zinc-300">原始图片 *</label>
              {originalImageUrl && (
                <label className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md transition-colors cursor-pointer">
                  重新上传
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>
            {!originalImageUrl ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 hover:border-indigo-500 rounded-xl cursor-pointer bg-zinc-950 transition-colors group">
                <ImageIcon className="w-8 h-8 text-zinc-500 mb-2 group-hover:text-indigo-400 transition-colors" />
                <span className="text-sm text-zinc-400 group-hover:text-indigo-300 transition-colors">点击上传图片</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            ) : (
              <div className="w-full aspect-video bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden flex items-center justify-center group relative">
                <img
                  src={originalImageUrl}
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={() => {
                    setPreviewType('original');
                    setPreviewImageToView(originalImageUrl);
                    setIsPreviewOpen(true);
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="text-white text-sm font-medium">点击放大预览</span>
                </div>
                {/* <label className="absolute bottom-2 right-2 bg-zinc-900/80 hover:bg-zinc-800 text-white text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors border border-zinc-700 pointer-events-auto">
                  重新上传
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label> */}
              </div>
            )}
          </div>

          {/* Preview */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-zinc-300">效果预览</label>
              <button
                onClick={generatePreview}
                className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md transition-colors"
              >
                刷新预览
              </button>
            </div>
            <div
              className="w-full aspect-video bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden cursor-pointer flex items-center justify-center group relative"
              onClick={() => {
                if (previewUrl) {
                  setPreviewType('edited');
                  setPreviewImageToView(previewUrl);
                  setIsPreviewOpen(true);
                }
              }}
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-medium">点击放大预览</span>
                  </div>
                </>
              ) : (
                <span className="text-xs text-zinc-600">暂无预览</span>
              )}
            </div>
          </div>

          
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && previewImageToView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-8 backdrop-blur-sm"
            onClick={() => setIsPreviewOpen(false)}
          >
            {previewType === 'edited' ? (
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
                    {steps.map((step, index) => (
                      <div key={index} className="mb-6">
                        <h3 className="text-lg font-bold mb-2">{step.title || `步骤 ${index + 1}`}</h3>
                        <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{step.description || '暂无描述'}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Right: Image */}
                <div className="flex-1 flex items-center justify-center pb-4 bg-[#060606] relative">
                  <img src={previewImageToView} className="w-full h-full object-contain object-top-left" referrerPolicy="no-referrer" />
                </div>
              </motion.div>
            ) : (
              <motion.img
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                src={previewImageToView}
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )}
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
