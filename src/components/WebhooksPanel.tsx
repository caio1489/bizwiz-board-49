import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Webhook, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Copy, 
  Trash2,
  Settings,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Webhook as WebhookType } from '@/types/crm';
import { useAuth } from './AuthWrapper';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';

export const WebhooksPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useLocalStorage<WebhookType[]>(`webhooks-${user?.id}`, []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState<Partial<WebhookType>>({
    name: '',
    url: '',
    type: 'incoming',
    events: [],
    isActive: true,
  });

  const availableEvents = {
    incoming: [
      'lead.created',
      'lead.updated', 
      'form.submitted',
      'contact.new'
    ],
    outgoing: [
      'lead.status.changed',
      'sale.completed',
      'user.action',
      'pipeline.moved'
    ]
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWebhook.name || !newWebhook.url) {
      toast({
        title: "Erro",
        description: "Preencha nome e URL do webhook",
        variant: "destructive",
      });
      return;
    }

    const webhook: WebhookType = {
      id: Date.now().toString(),
      name: newWebhook.name!,
      url: newWebhook.url!,
      type: newWebhook.type as 'incoming' | 'outgoing',
      events: newWebhook.events || [],
      isActive: newWebhook.isActive || true,
      createdAt: new Date().toISOString(),
    };

    setWebhooks([...webhooks, webhook]);
    setNewWebhook({
      name: '',
      url: '',
      type: 'incoming',
      events: [],
      isActive: true,
    });
    setIsDialogOpen(false);
    
    toast({
      title: "Webhook criado!",
      description: "O webhook foi configurado com sucesso",
    });
  };

  const toggleWebhook = (id: string) => {
    const updatedWebhooks = webhooks.map(webhook =>
      webhook.id === id 
        ? { ...webhook, isActive: !webhook.isActive }
        : webhook
    );
    setWebhooks(updatedWebhooks);
    
    toast({
      title: "Webhook atualizado",
      description: "Status do webhook foi alterado",
    });
  };

  const deleteWebhook = (id: string) => {
    setWebhooks(webhooks.filter(webhook => webhook.id !== id));
    toast({
      title: "Webhook removido",
      description: "O webhook foi excluído com sucesso",
    });
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "URL copiada!",
      description: "URL do webhook copiada para a área de transferência",
    });
  };

  const testWebhook = async (webhook: WebhookType) => {
    if (webhook.type === 'outgoing') {
      try {
        const testData = {
          event: 'test.webhook',
          timestamp: new Date().toISOString(),
          data: {
            message: 'Este é um teste do webhook',
            user_id: user?.id,
            test: true
          }
        };

        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'no-cors',
          body: JSON.stringify(testData),
        });

        toast({
          title: "Teste enviado",
          description: "Dados de teste foram enviados para o webhook",
        });
      } catch (error) {
        toast({
          title: "Erro no teste",
          description: "Não foi possível testar o webhook",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Webhook de entrada",
        description: "Use este URL para receber dados de sistemas externos",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Webhooks</h2>
          <p className="text-muted-foreground">Configure integrações automáticas com sistemas externos</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Novo Webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Webhook</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-card-foreground">Nome do Webhook</label>
                <Input
                  value={newWebhook.name || ''}
                  onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
                  placeholder="Ex: Formulário de contato"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground">Tipo</label>
                <Select
                  value={newWebhook.type}
                  onValueChange={(value) => setNewWebhook({...newWebhook, type: value as 'incoming' | 'outgoing', events: []})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incoming">
                      <div className="flex items-center space-x-2">
                        <ArrowDownLeft className="w-4 h-4 text-success" />
                        <span>Entrada (Receber dados)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="outgoing">
                      <div className="flex items-center space-x-2">
                        <ArrowUpRight className="w-4 h-4 text-primary" />
                        <span>Saída (Enviar dados)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground">Campos do Lead</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['name', 'email', 'phone', 'company', 'value', 'source', 'tags', 'notes'].map((field) => (
                    <div key={field} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={field}
                        checked={newWebhook.events?.includes(`lead.${field}`) || false}
                        onChange={(e) => {
                          const events = newWebhook.events || [];
                          if (e.target.checked) {
                            setNewWebhook({...newWebhook, events: [...events, `lead.${field}`]});
                          } else {
                            setNewWebhook({...newWebhook, events: events.filter(event => event !== `lead.${field}`)});
                          }
                        }}
                      />
                      <label htmlFor={field} className="text-sm capitalize">{field}</label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {newWebhook.type === 'incoming' 
                    ? 'Campos que serão aceitos para criar leads automaticamente'
                    : 'Campos que serão enviados quando houver mudanças no lead'
                  }
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-primary to-primary-dark">
                  Criar Webhook
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-success-light bg-success-light/5">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-success-light rounded-lg flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-card-foreground">Webhooks de Entrada</h3>
                <p className="text-sm text-muted-foreground">Receba leads e dados de formulários externos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary-muted bg-primary-muted/5">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-muted rounded-lg flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-card-foreground">Webhooks de Saída</h3>
                <p className="text-sm text-muted-foreground">Envie notificações para sistemas externos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks List */}
      <div className="space-y-4">
        {webhooks.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Webhook className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">Nenhum webhook configurado</h3>
              <p className="text-muted-foreground">
                Crie seu primeiro webhook para integrar com sistemas externos
              </p>
            </CardContent>
          </Card>
        ) : (
          webhooks.map((webhook) => (
            <Card key={webhook.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      webhook.type === 'incoming' 
                        ? 'bg-success-light' 
                        : 'bg-primary-muted'
                    }`}>
                      {webhook.type === 'incoming' ? (
                        <ArrowDownLeft className={`w-5 h-5 ${
                          webhook.type === 'incoming' ? 'text-success' : 'text-primary'
                        }`} />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-card-foreground">{webhook.name}</h3>
                        <Badge variant={webhook.isActive ? "default" : "secondary"}>
                          {webhook.isActive ? (
                            <div className="flex items-center space-x-1">
                              <Activity className="w-3 h-3" />
                              <span>Ativo</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Inativo</span>
                            </div>
                          )}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {webhook.type === 'incoming' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono truncate max-w-md">
                        {webhook.url}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criado em {new Date(webhook.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyUrl(webhook.url)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testWebhook(webhook)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>

                    <Switch
                      checked={webhook.isActive}
                      onCheckedChange={() => toggleWebhook(webhook.id)}
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteWebhook(webhook.id)}
                      className="text-destructive hover:bg-destructive-light"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Instructions */}
      <Card className="border-warning-light bg-warning-light/5">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            <span>Como usar os webhooks</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium text-card-foreground">Webhooks de Entrada:</h4>
              <p className="text-sm text-muted-foreground">
                Use a URL do webhook criado para receber dados de formulários, landing pages ou outros sistemas. 
                Exemplo de POST para criar lead automaticamente: 
              </p>
              <div className="bg-muted/50 rounded-lg p-3 mt-2 font-mono text-xs">
                <div>POST https://vwegyduejazsqawtidsn.supabase.co/functions/v1/webhook-lead</div>
                <div className="mt-2">Content-Type: application/json</div>
                <div className="mt-2">{"{"}</div>
                <div>&nbsp;&nbsp;"name": "João Silva",</div>
                <div>&nbsp;&nbsp;"email": "joao@email.com",</div>
                <div>&nbsp;&nbsp;"phone": "(11) 99999-9999",</div>
                <div>&nbsp;&nbsp;"company": "Empresa X",</div>
                <div>&nbsp;&nbsp;"value": 5000,</div>
                <div>&nbsp;&nbsp;"source": "Site",</div>
                <div>&nbsp;&nbsp;"tags": ["interessado", "premium"],</div>
                <div>&nbsp;&nbsp;"notes": "Interessado no produto premium"</div>
                <div>{"}"}</div>
              </div>
            </div>
          <div>
            <h4 className="font-medium text-card-foreground">Webhooks de Saída:</h4>
            <p className="text-sm text-muted-foreground">
              Configure URLs de destino para onde o CRM enviará notificações automáticas sobre 
              mudanças de status dos leads, vendas concluídas e outras ações importantes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};