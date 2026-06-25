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
  uploadCoverImage,
  getCuriosidadesCategories,
  type CuriosidadeCategory
} from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Eye, Upload, X, File, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/context/language-context';

export function CuriosidadeEditorPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [author, setAuthor] = useState('');
  const [categoryId, setCategoryId] = useState<string>('__none__');
  const [body, setBody] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [categories, setCategories] = useState<CuriosidadeCategory[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

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

  const htmlToPlain = (html: string) => {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    return (d.textContent || d.innerText || '').trim();
  };

  const loadCuriosidade = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await getCuriosidadeById(id, true); // Include drafts
      setTitle(data.title ?? '');
      setTitleEn(data.title_en ?? '');
      setAuthor(data.author);
      setCategoryId(data.category_id || '__none__');
      setBody(data.body ?? '');
      setBodyEn(data.body_en ?? '');
      setStatus(data.status || 'draft');
      setAttachments(data.attachments || []);
      setCoverImage(data.cover_image || null);
    } catch (error) {
      console.error('Error loading curiosidade:', error);
      toast.error(t('admin.curiosidades.loadError', 'Could not load post'));
      navigate('/dashboard?tab=curiosidades');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish: boolean = false) => {
    if (!author.trim()) {
      toast.error(t('admin.curiosidades.authorRequired', 'Author is required'));
      return;
    }

    const ptTitle = title.trim();
    const ptBodyText = htmlToPlain(body);
    const enTitle = titleEn.trim();
    const enBodyText = htmlToPlain(bodyEn);
    const ptComplete = Boolean(ptTitle && ptBodyText);
    const enComplete = Boolean(enTitle && enBodyText);

    if (!ptComplete && !enComplete) {
      toast.error(
        t(
          'admin.curiosidades.needOneLocale',
          'Add a full Portuguese title and body, or a full English title and body (or both).',
        ),
      );
      return;
    }

    try {
      setSaving(true);
      const newStatus = publish ? 'published' : 'draft';

      // Convert __none__ to null for database
      const finalCategoryId = categoryId === '__none__' ? null : categoryId;

      const titlePt = ptComplete ? ptTitle : null;
      const bodyPt = ptComplete ? body.trim() : null;
      const titleEnDb = enComplete ? enTitle : null;
      const bodyEnDb = enComplete ? bodyEn.trim() : null;
      
      if (id) {
        await updateCuriosidade(
          id,
          titlePt,
          author.trim(),
          finalCategoryId,
          bodyPt,
          newStatus,
          attachments,
          coverImage,
          titleEnDb,
          bodyEnDb
        );
        toast.success(publish ? t('admin.curiosidades.publishSuccess', 'Post published successfully!') : t('admin.curiosidades.draftSaved', 'Draft saved successfully!'));
      } else {
        const newCuriosidade = await createCuriosidade(
          titlePt,
          author.trim(),
          finalCategoryId,
          bodyPt,
          newStatus,
          attachments,
          coverImage,
          titleEnDb,
          bodyEnDb
        );
        toast.success(publish ? t('admin.curiosidades.publishSuccess', 'Post published successfully!') : t('admin.curiosidades.draftSaved', 'Draft saved successfully!'));
        navigate(`/dashboard/curiosidades/${newCuriosidade.id}`);
      }
    } catch (error) {
      console.error('Error saving curiosidade:', error);
      toast.error(t('admin.curiosidades.saveError', 'Could not save post'));
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
          toast.error(t('admin.curiosidades.editor.saveDraftFirstAttachments', 'Save a draft first before adding attachments'));
          throw new Error('Save draft first');
        }
      });

      const urls = await Promise.all(uploadPromises);
      setAttachments([...attachments, ...urls]);
      toast.success(t('admin.curiosidades.editor.attachmentsUploaded', 'Attachments added successfully!'));
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      if (!error.message.includes('Save draft first')) {
        toast.error(t('admin.curiosidades.editor.uploadAttachmentsFail', 'Could not upload attachments'));
      }
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('admin.curiosidades.editor.imageFileRequired', 'Please select an image file'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('admin.curiosidades.editor.coverImageMaxSize', 'Image must be 5MB or smaller'));
      return;
    }

    try {
      setUploadingCover(true);
      
      // If we have an ID, upload to that curiosidade, otherwise create a temp one
      if (id) {
        const url = await uploadCoverImage(file, id);
        setCoverImage(url);
        toast.success(t('admin.curiosidades.editor.coverImageAdded', 'Cover image added successfully!'));
      } else {
        toast.error(t('admin.curiosidades.editor.saveDraftFirstCover', 'Save a draft first before adding a cover image'));
      }
      
      // Reset file input
      if (coverImageInputRef.current) {
        coverImageInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading cover image:', error);
      if (!error.message?.includes('Save draft first')) {
        toast.error(t('admin.curiosidades.editor.uploadCoverFail', 'Could not upload cover image'));
      }
    } finally {
      setUploadingCover(false);
    }
  };

  const removeCoverImage = () => {
    setCoverImage(null);
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
            {t('curiosidade.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold">
            {id ? t('admin.curiosidades.editor.editTitle', 'Edit post') : t('admin.curiosidades.editor.newTitle', 'New post')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === 'published' ? 'default' : 'secondary'}>
            {status === 'published' ? t('admin.curiosidades.status.published', 'Published') : t('admin.curiosidades.status.draft', 'Draft')}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              {t(
                'admin.curiosidades.bilingualEditorHint',
                'Fill Portuguese, English, or both. Visitors see the version that matches the site language, with fallback to the other language if needed.',
              )}
            </p>
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
              <h2 className="text-sm font-semibold mb-3">
                {t('admin.curiosidades.sectionPt', 'Portuguese (Brazil)')}
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">{t('admin.curiosidades.titlePt', 'Title (Portuguese)')}</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('admin.curiosidades.titlePtPlaceholder', 'Portuguese title')}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="body">{t('admin.curiosidades.bodyPt', 'Content (Portuguese)')}</Label>
                  <div className="mt-2">
                    <ReactQuill
                      theme="snow"
                      value={body}
                      onChange={setBody}
                      modules={quillModules}
                      placeholder={t('admin.curiosidades.bodyPtPlaceholder', 'Portuguese article…')}
                      style={{ minHeight: '280px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
              <h2 className="text-sm font-semibold mb-3">
                {t('admin.curiosidades.sectionEn', 'English')}
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="titleEn">{t('admin.curiosidades.titleEn', 'Title (English)')}</Label>
                  <Input
                    id="titleEn"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder={t('admin.curiosidades.titleEnPlaceholder', 'English title')}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bodyEn">{t('admin.curiosidades.bodyEn', 'Content (English)')}</Label>
                  <div className="mt-2">
                    <ReactQuill
                      theme="snow"
                      value={bodyEn}
                      onChange={setBodyEn}
                      modules={quillModules}
                      placeholder={t('admin.curiosidades.bodyEnPlaceholder', 'English article…')}
                      style={{ minHeight: '280px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="author">{t('admin.curiosidades.authorLabel', 'Author')} *</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder={t('admin.curiosidades.authorPlaceholder', 'Author name')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="category">{t('admin.curiosidades.categorySelect', 'Category (optional)')}</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('admin.curiosidades.categoryPlaceholder', 'Select a category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('admin.curiosidades.categoryNone', 'No category')}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name_en?.trim() ? `${cat.name} — ${cat.name_en}` : cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>{t('admin.curiosidades.editor.coverImage', 'Cover image')}</Label>
              <div className="mt-2 space-y-4">
                {coverImage ? (
                  <div className="relative">
                    <img 
                      src={coverImage} 
                      alt="Cover" 
                      className="w-full h-64 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeCoverImage}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('admin.curiosidades.editor.remove', 'Remove')}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={coverImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageUpload}
                      className="hidden"
                      id="cover-image-upload"
                      disabled={!id || uploadingCover}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (!id) {
                          toast.error(t('admin.curiosidades.editor.saveDraftFirstCover', 'Save a draft first before adding a cover image'));
                          return;
                        }
                        coverImageInputRef.current?.click();
                      }}
                      disabled={!id || uploadingCover}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {uploadingCover ? t('admin.curiosidades.editor.uploading', 'Uploading...') : t('admin.curiosidades.editor.addCoverImage', 'Add cover image')}
                    </Button>
                    {!id && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('admin.curiosidades.editor.saveDraftFirstHintCover', 'Save a draft first to add a cover image')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>{t('admin.curiosidades.editor.attachments', 'Attachments')}</Label>
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
                      toast.error(t('admin.curiosidades.editor.saveDraftFirstAttachments', 'Save a draft first before adding attachments'));
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={!id || uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? t('admin.curiosidades.editor.uploading', 'Uploading...') : t('admin.curiosidades.editor.addAttachments', 'Add attachments')}
                </Button>
                {!id && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('admin.curiosidades.editor.saveDraftFirstHintAttachments', 'Save a draft first to add attachments')}
                  </p>
                )}
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>{t('admin.curiosidades.editor.attachmentsAdded', 'Added attachments')}</Label>
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
            {saving ? t('admin.curiosidades.editor.saving', 'Saving...') : t('admin.curiosidades.editor.saveDraft', 'Save draft')}
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <Eye className="h-4 w-4 mr-2" />
            {saving ? t('admin.curiosidades.editor.publishing', 'Publishing...') : t('admin.curiosidades.editor.publish', 'Publish')}
          </Button>
        </div>
      </div>
    </div>
  );
}

