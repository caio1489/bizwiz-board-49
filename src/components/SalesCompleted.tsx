import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  FileText, 
  Calendar, 
  DollarSign, 
  User, 
  Phone, 
  Mail,
  Building,
  Tag as TagIcon,
  Download,
  Search
} from 'lucide-react';
import { Sale, Tag } from '@/types/crm';
import { useAuth } from './AuthWrapper';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';

export const SalesCompleted: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sales, setSales] = useLocalStorage<Sale[]>(`sales-${user?.id}`, []);
  const [tags, setTags] = useLocalStorage<Tag[]>(`tags-${user?.id}`, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSale, setNewSale] = useState<Partial<Sale>>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    product: '',
    value: 0,
    tags: [],
    appointmentDate: '',
    notes: '',
  });

  const filteredSales = sales.filter(sale => 
    (user?.role === 'master' || sale.userId === user?.id) &&
    (sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     sale.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
     sale.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSale.customerName || !newSale.customerEmail || !newSale.product || !newSale.value) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const sale: Sale = {
      id: Date.now().toString(),
      customerName: newSale.customerName!,
      customerEmail: newSale.customerEmail!,
      customerPhone: newSale.customerPhone!,
      product: newSale.product!,
      value: newSale.value!,
      tags: newSale.tags || [],
      appointmentDate: newSale.appointmentDate,
      completedAt: new Date().toISOString(),
      userId: user?.id || '',
      notes: newSale.notes || '',
    };

    setSales([...sales, sale]);
    setNewSale({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      product: '',
      value: 0,
      tags: [],
      appointmentDate: '',
      notes: '',
    });
    setIsDialogOpen(false);
    
    toast({
      title: "Venda registrada!",
      description: "A venda foi registrada com sucesso",
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setNewSale(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Vendas Concluídas</h2>
          <p className="text-muted-foreground">Gerencie e acompanhe suas vendas finalizadas</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-success to-success text-success-foreground shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Nova Venda</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-card-foreground">Nome do Cliente *</label>
                  <Input
                    value={newSale.customerName || ''}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="Nome completo do cliente"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-card-foreground">Email *</label>
                  <Input
                    type="email"
                    value={newSale.customerEmail || ''}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-card-foreground">Telefone</label>
                  <Input
                    value={newSale.customerPhone || ''}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-card-foreground">Produto/Serviço *</label>
                  <Input
                    value={newSale.product || ''}
                    onChange={(e) => handleInputChange('product', e.target.value)}
                    placeholder="Nome do produto ou serviço"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-card-foreground">Valor da Venda *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newSale.value || ''}
                    onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-card-foreground">Data de Atendimento</label>
                  <Input
                    type="datetime-local"
                    value={newSale.appointmentDate || ''}
                    onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground">Observações</label>
                <Textarea
                  value={newSale.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Adicione observações sobre a venda..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="bg-gradient-to-r from-success to-success text-success-foreground"
                >
                  Registrar Venda
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-success-light rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Vendas</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary-muted rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vendas Realizadas</p>
                <p className="text-2xl font-bold text-primary">{filteredSales.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-warning-light rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold text-warning">
                  {filteredSales.length > 0 ? formatCurrency(totalSales / filteredSales.length) : 'R$ 0,00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar vendas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Sales List */}
      <div className="grid gap-4">
        {filteredSales.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">Nenhuma venda encontrada</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma venda corresponde à sua busca' : 'Registre sua primeira venda para começar'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSales.map((sale) => (
            <Card key={sale.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-card-foreground">{sale.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span>{sale.customerEmail}</span>
                    </div>
                    {sale.customerPhone && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span>{sale.customerPhone}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-card-foreground">{sale.product}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <DollarSign className="w-3 h-3 text-success" />
                      <span className="font-semibold text-success">{formatCurrency(sale.value)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>Concluída: {formatDate(sale.completedAt)}</span>
                    </div>
                    {sale.appointmentDate && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Atendimento: {formatDate(sale.appointmentDate)}</span>
                      </div>
                    )}
                    {sale.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {sale.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <TagIcon className="w-2 h-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Detalhes
                    </Button>
                  </div>
                </div>
                
                {sale.notes && (
                  <div className="mt-4 pt-4 border-t border-card-border">
                    <p className="text-sm text-muted-foreground">{sale.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};