import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  getCuriosidades, 
  deleteCuriosidade,
  getCuriosidadesCategories,
  createCuriosidadesCategory,
  updateCuriosidadesCategory,
  deleteCuriosidadesCategory,
  type Curiosidade,
  type CuriosidadeCategory
} from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Edit, Trash2, Plus, FileText, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CuriosidadesList() {
  const navigate = useNavigate();
  const [curiosidades, setCuriosidades] = useState<Curiosidade[]>([]);
  const [drafts, setDrafts] = useState<Curiosidade[]>([]);
  const [published, setPublished] = useState<Curiosidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [categories, setCategories] = useState<CuriosidadeCategory[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [editingCategory, setEditingCategory] = useState<CuriosidadeCategory | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const fetchCuriosidades = async () => {
    try {
      setLoading(true);
      const data = await getCuriosidades(true); // Include drafts
      setCuriosidades(data);
      setDrafts(data.filter(c => c.status === 'draft'));
      setPublished(data.filter(c => c.status === 'published'));
    } catch (error) {
      console.error('Error fetching curiosidades:', error);
      toast.error('Erro ao carregar curiosidades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuriosidades();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await getCuriosidadesCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Don't show error toast if table doesn't exist yet - just set empty array
      setCategories([]);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }

    try {
      await createCuriosidadesCategory(categoryName.trim(), categoryDescription.trim() || undefined);
      toast.success('Categoria criada com sucesso');
      setCategoryName('');
      setCategoryDescription('');
      setCategoryDialogOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast.error(error.message || 'Erro ao criar categoria');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryName.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }

    try {
      await updateCuriosidadesCategory(editingCategory.id, categoryName.trim(), categoryDescription.trim() || undefined);
      toast.success('Categoria atualizada com sucesso');
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDescription('');
      setCategoryDialogOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast.error(error.message || 'Erro ao atualizar categoria');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCuriosidadesCategory(id);
      toast.success('Categoria deletada com sucesso');
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.message || 'Erro ao deletar categoria');
    }
  };

  const openEditDialog = (category: CuriosidadeCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setCategoryDialogOpen(true);
  };

  const closeCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCuriosidade(id);
      toast.success('Curiosidade deletada com sucesso');
      setDeleteDialogOpen(null);
      fetchCuriosidades();
    } catch (error) {
      console.error('Error deleting curiosidade:', error);
      toast.error('Erro ao deletar curiosidade');
    }
  };

  const handleEdit = (curiosidade: Curiosidade) => {
    navigate(`/dashboard/curiosidades/${curiosidade.id}`);
  };

  const handleCreate = () => {
    navigate('/dashboard/curiosidades');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Curiosidades</h2>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Curiosidade
        </Button>
      </div>

      {/* Drafts Section */}
      {drafts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rascunhos ({drafts.length})
          </h3>
          <div className="space-y-4">
            {drafts.map((curiosidade) => (
              <Card key={curiosidade.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{curiosidade.title}</h3>
                      <Badge variant="secondary">Rascunho</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-sm text-muted-foreground">
                        Por: {curiosidade.author}
                      </span>
                      {curiosidade.category && (
                        <span className="text-sm text-muted-foreground">
                          • Categoria: {curiosidade.category.name}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        • {formatDate(curiosidade.created_at)}
                      </span>
                    </div>
                    <div 
                      className="text-sm text-muted-foreground line-clamp-3"
                      dangerouslySetInnerHTML={{ 
                        __html: curiosidade.body.length > 200 
                          ? curiosidade.body.substring(0, 200) + '...' 
                          : curiosidade.body 
                      }}
                    />
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(curiosidade)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(curiosidade.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deletar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Published Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Publicadas ({published.length})</h3>
        {published.length === 0 && curiosidades.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Nenhuma curiosidade criada ainda.</p>
            <p className="text-sm text-muted-foreground mt-2">Clique em "Nova Curiosidade" para começar.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {published.map((curiosidade) => (
              <Card key={curiosidade.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{curiosidade.title}</h3>
                      <Badge variant="default">Publicado</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-sm text-muted-foreground">
                        Por: {curiosidade.author}
                      </span>
                      {curiosidade.category && (
                        <span className="text-sm text-muted-foreground">
                          • Categoria: {curiosidade.category.name}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        • {formatDate(curiosidade.created_at)}
                      </span>
                    </div>
                    <div 
                      className="text-sm text-muted-foreground line-clamp-3"
                      dangerouslySetInnerHTML={{ 
                        __html: curiosidade.body.length > 200 
                          ? curiosidade.body.substring(0, 200) + '...' 
                          : curiosidade.body 
                      }}
                    />
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(curiosidade)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(curiosidade.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deletar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Categories Management Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Gerenciamento de Categorias
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Gerencie categorias para organizar suas curiosidades</p>
          </div>
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingCategory(null); setCategoryName(''); setCategoryDescription(''); }}>
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
                <DialogDescription>
                  {editingCategory ? 'Atualize as informações da categoria' : 'Crie uma nova categoria para organizar suas curiosidades'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="categoryName">Nome da Categoria *</Label>
                  <Input
                    id="categoryName"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Ex: História, Cultura, Religião..."
                  />
                </div>
                <div>
                  <Label htmlFor="categoryDescription">Descrição (opcional)</Label>
                  <Textarea
                    id="categoryDescription"
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    placeholder="Descrição da categoria..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeCategoryDialog}>
                  Cancelar
                </Button>
                <Button onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}>
                  {editingCategory ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-4">
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Nenhuma categoria criada ainda.</p>
              <p className="text-sm text-muted-foreground mt-2">Clique em "Nova Categoria" para começar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(category)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="flex-1">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirmar Exclusão</DialogTitle>
                          <DialogDescription>
                            Tem certeza que deseja excluir a categoria "{category.name}"? Esta ação não pode ser desfeita.
                            As curiosidades nesta categoria não serão deletadas, mas perderão a associação com a categoria.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">Cancelar</Button>
                          <Button variant="destructive" onClick={() => handleDeleteCategory(category.id)}>
                            Deletar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen !== null} onOpenChange={(open) => setDeleteDialogOpen(open ? deleteDialogOpen : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta curiosidade? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteDialogOpen && handleDelete(deleteDialogOpen)}
            >
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

