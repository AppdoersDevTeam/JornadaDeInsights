import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  getCuriosidadeById, 
  createCuriosidade, 
  updateCuriosidade,
  uploadAttachment,
  getCuriosidadesCategories,
  type Curiosidade,
  type CuriosidadeCategory
} from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Eye, Upload, X, File } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function CuriosidadeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [categoryId, setCategoryId] = useState<string>('__none__');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [categories, setCategories] = useState<CuriosidadeCategory[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (id) {
      loadCuriosidade();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const data = await getCuriosidadesCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const loadCuriosidade = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await getCuriosidadeById(id, true); // Include drafts
      setTitle(data.title);
      setAuthor(data.author);
      setCategoryId(data.category_id || '__none__');
      setBody(data.body);
      setStatus(data.status || 'draft');
      setAttachments(data.attachments || []);
    } catch (error) {
      console.error('Error loading curiosidade:', error);
      toast.error('Erro ao carregar curiosidade');
      navigate('/dashboard?tab=curiosidades');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish: boolean = false) => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (!author.trim()) {
      toast.error('Autor é obrigatório');
      return;
    }

    if (!body.trim()) {
      toast.error('Conteúdo é obrigatório');
      return;
    }

    try {
      setSaving(true);
      const newStatus = publish ? 'published' : 'draft';

      // Convert __none__ to null for database
      const finalCategoryId = categoryId === '__none__' ? null : categoryId;
      
      if (id) {
        await updateCuriosidade(
          id,
          title.trim(),
          author.trim(),
          finalCategoryId,
          body.trim(),
          newStatus,
          attachments
        );
        toast.success(publish ? 'Curiosidade publicada com sucesso!' : 'Rascunho salvo com sucesso!');
      } else {
        const newCuriosidade = await createCuriosidade(
          title.trim(),
          author.trim(),
          finalCategoryId,
          body.trim(),
          newStatus,
          attachments
        );
        toast.success(publish ? 'Curiosidade publicada com sucesso!' : 'Rascunho salvo com sucesso!');
        navigate(`/dashboard/curiosidades/${newCuriosidade.id}`);
      }
    } catch (error) {
      console.error('Error saving curiosidade:', error);
      toast.error('Erro ao salvar curiosidade');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const uploadPromises = Array.from(files).map(async (file) => {
        // If we have an ID, upload to that curiosidade, otherwise create a temp one
        if (id) {
          return await uploadAttachment(file, id);
        } else {
          // For new curiosidades, we'll need to save first or use a temp approach
          toast.error('Salve o rascunho primeiro antes de adicionar anexos');
          throw new Error('Save draft first');
        }
      });

      const urls = await Promise.all(uploadPromises);
      setAttachments([...attachments, ...urls]);
      toast.success('Anexos adicionados com sucesso!');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      if (!error.message.includes('Save draft first')) {
        toast.error('Erro ao fazer upload dos anexos');
      }
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image'],
      ['clean']
    ],
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard?tab=curiosidades')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">
            {id ? 'Editar Curiosidade' : 'Nova Curiosidade'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === 'published' ? 'default' : 'secondary'}>
            {status === 'published' ? 'Publicado' : 'Rascunho'}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Digite o título da curiosidade"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="author">Autor *</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Nome do autor"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria (opcional)</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Label htmlFor="body">Conteúdo *</Label>
            <div className="mt-2">
              <ReactQuill
                theme="snow"
                value={body}
                onChange={setBody}
                modules={quillModules}
                placeholder="Digite o conteúdo da curiosidade..."
                style={{ minHeight: '400px' }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Anexos</Label>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={!id || uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!id) {
                      toast.error('Salve o rascunho primeiro antes de adicionar anexos');
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={!id || uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Enviando...' : 'Adicionar Anexos'}
                </Button>
                {!id && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Salve o rascunho primeiro para adicionar anexos
                  </p>
                )}
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Anexos Adicionados</Label>
                <div className="space-y-2">
                  {attachments.map((url, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate max-w-md"
                        >
                          {url.split('/').pop()}
                        </a>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Rascunho'}
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <Eye className="h-4 w-4 mr-2" />
            {saving ? 'Publicando...' : 'Publicar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

