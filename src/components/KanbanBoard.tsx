import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MoreHorizontal, 
  Settings,
  Plus,
  AlertCircle,
  TrendingUp,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  Zap,
  List,
  LayoutGrid,
  Phone
} from 'lucide-react';
import { Lead, KanbanColumn } from '@/types/crm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthWrapper';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import { NewLeadModal } from './NewLeadModal';
import { LeadDetailModal } from './LeadDetailModal';
import { LeadListView } from './LeadListView';

const defaultColumns: KanbanColumn[] = [
  { id: 'new', title: 'Novos Leads', leads: [] },
  { id: 'contacted', title: 'Contatados', leads: [] },
  { id: 'qualified', title: 'Qualificados', leads: [] },
  { id: 'proposal', title: 'Proposta', leads: [] },
  { id: 'won', title: 'Fechado', leads: [] },
  { id: 'lost', title: 'Perdido', leads: [] },
];

const getColumnIcon = (columnId: string) => {
  switch (columnId) {
    case 'new': return Zap;
    case 'contacted': return Phone;
    case 'qualified': return Target;
    case 'proposal': return TrendingUp;
    case 'won': return CheckCircle2;
    case 'lost': return XCircle;
    default: return Clock;
  }
};

export const KanbanBoard: React.FC = () => {
  const navigate = useNavigate();
  const { user, allAssignableUsers } = useAuth();
  const { toast } = useToast();
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetailOpen, setLeadDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [loading, setLoading] = useState(true);

  // Fetch leads from Supabase
  useEffect(() => {
    if (!user) return;
    fetchLeads();
  }, [user]);

  // Realtime updates for leads
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLeads = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar leads",
          variant: "destructive",
        });
        return;
      }

      setLeads(data as Lead[] || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize columns with leads
  useEffect(() => {
    const updatedColumns = defaultColumns.map(column => ({
      ...column,
      leads: leads.filter(lead => lead.status === column.id)
    }));
    setColumns(updatedColumns);
  }, [leads, user]);

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    // Only allow master users to move leads between columns
    if (user?.role !== 'master') {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem mover leads entre etapas",
        variant: "destructive",
      });
      return;
    }

    const { source, destination } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const leadId = result.draggableId;
    const newStatus = destination.droppableId as Lead['status'];

    // Optimistically update UI
    const updatedLeads = leads.map(lead => 
      lead.id === leadId 
        ? { ...lead, status: newStatus, updated_at: new Date().toISOString() }
        : lead
    );
    
    setLeads(updatedLeads);

    try {
      // Update in database
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', leadId);

      if (error) {
        console.error('Error updating lead status:', error);
        // Revert optimistic update on error
        fetchLeads();
        toast({
          title: "Erro",
          description: "Erro ao atualizar status do lead",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Lead atualizado",
        description: `Lead movido para ${columns.find(c => c.id === newStatus)?.title}`,
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      fetchLeads();
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar lead",
        variant: "destructive",
      });
    }
  };

  const getColumnColor = (columnId: string) => {
    const colors = {
      new: 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-blue-100/50',
      contacted: 'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 shadow-orange-100/50',
      qualified: 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 shadow-purple-100/50',
      proposal: 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 shadow-indigo-100/50',
      won: 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 shadow-green-100/50',
      lost: 'border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 shadow-red-100/50',
    };
    return colors[columnId as keyof typeof colors] || 'border-border bg-muted/30';
  };

  const getBadgeColor = (columnId: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-700 border-blue-200 font-semibold',
      contacted: 'bg-orange-100 text-orange-700 border-orange-200 font-semibold',
      qualified: 'bg-purple-100 text-purple-700 border-purple-200 font-semibold',
      proposal: 'bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold',
      won: 'bg-green-100 text-green-700 border-green-200 font-semibold',
      lost: 'bg-red-100 text-red-700 border-red-200 font-semibold',
    };
    return colors[columnId as keyof typeof colors] || 'bg-muted text-muted-foreground border-border';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const handleLeadClick = (lead: Lead) => {
    // Navigate to individual lead page instead of modal
    navigate(`/lead/${lead.id}`);
  };

  const handleLeadsUpdate = (updatedLeads: Lead[]) => {
    setLeads(updatedLeads);
  };

  const allLeads = leads;

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen">
      {/* Header Actions */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-primary-dark flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Pipeline de Vendas</h2>
                  <p className="text-sm text-slate-600">Gerencie seus leads de forma inteligente</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-white/80 rounded-lg border border-slate-200 p-1">
                  <Button
                    variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('kanban')}
                    className="px-3 py-2"
                  >
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Kanban
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="px-3 py-2"
                  >
                    <List className="w-4 h-4 mr-2" />
                    Lista
                  </Button>
                </div>
                {user?.role !== 'master' && (
                  <div className="flex items-center text-sm text-amber-700 bg-amber-100/80 px-4 py-2 rounded-full border border-amber-200">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Visualização limitada - apenas admins editam
                  </div>
                )}
              </div>
            </div>
            <Button 
              onClick={() => setNewLeadModalOpen(true)}
              className="bg-gradient-to-r from-primary via-primary to-primary-dark text-white hover:shadow-xl hover:scale-105 transition-all duration-200 px-6 py-3 rounded-xl font-semibold shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Lead
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {viewMode === 'kanban' ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex space-x-6 overflow-x-auto pb-6">
              {columns.map((column) => {
                const IconComponent = getColumnIcon(column.id);
                const totalValue = column.leads?.reduce((sum, lead) => sum + (lead.value || 0), 0) || 0;
                
                return (
                  <div key={column.id} className="flex-shrink-0 w-80">
                    <div className={`rounded-2xl border-2 ${getColumnColor(column.id)} p-6 h-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getBadgeColor(column.id)} border-2`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-slate-800">
                              {column.title}
                            </h3>
                            {totalValue > 0 && (
                              <p className="text-sm font-semibold text-slate-600">
                                {formatCurrency(totalValue)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={`${getBadgeColor(column.id)} px-3 py-1 text-sm`}>
                            {column.leads?.length || 0}
                          </Badge>
                          {user?.role === 'master' && (
                            <Button variant="ghost" size="sm" className="hover:bg-white/60 rounded-xl p-2">
                              <Settings className="w-4 h-4 text-slate-600" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className={`space-y-4 min-h-[400px] transition-all duration-300 ease-in-out ${
                                snapshot.isDraggingOver && user?.role === 'master' 
                                  ? 'bg-white/60 rounded-xl ring-2 ring-primary/40 shadow-inner transform scale-[1.02]' 
                                  : ''
                              }`}
                            >
                            {column.leads?.map((lead, index) => (
                              <Draggable 
                                key={lead.id} 
                                draggableId={lead.id} 
                                index={index} 
                                isDragDisabled={user?.role !== 'master'}
                              >
                                {(provided, snapshot) => (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={() => handleLeadClick(lead)}
                                    className={`${user?.role === 'master' ? 'cursor-move' : 'cursor-pointer'} 
                                      hover:shadow-xl transition-all duration-300 ease-out border-0 
                                      bg-white/95 backdrop-blur-sm shadow-md hover:shadow-2xl
                                      ${snapshot.isDragging ? 'shadow-2xl rotate-1 scale-105 ring-2 ring-primary/30 z-50' : 'hover:scale-[1.02]'} 
                                      ${user?.role !== 'master' ? 'opacity-90' : ''}
                                      rounded-xl overflow-hidden group transform-gpu`}
                                  >
                                    <CardContent className="p-4">
                                      <div className="space-y-3">
                                         {/* Name and Value */}
                                         <div className="flex items-center justify-between">
                                           <h3 className="font-bold text-lg text-slate-800 group-hover:text-primary transition-colors line-clamp-1 flex-1">
                                             {lead.name}
                                           </h3>
                                           {lead.value && (
                                             <span className="text-sm font-semibold text-green-600 ml-2">
                                               {formatCurrency(lead.value)}
                                             </span>
                                           )}
                                         </div>

                                         {/* Company */}
                                         {lead.company && (
                                           <p className="text-sm text-slate-600 font-medium">
                                             {lead.company}
                                           </p>
                                         )}
                                         
                                         {/* Tags */}
                                         {lead.tags.length > 0 && (
                                           <div className="flex flex-wrap gap-1.5 mt-2">
                                             {lead.tags.slice(0, 2).map((tag) => (
                                               <Badge 
                                                 key={tag} 
                                                 variant="secondary" 
                                                 className="text-xs px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full font-medium"
                                               >
                                                 {tag}
                                               </Badge>
                                             ))}
                                             {lead.tags.length > 2 && (
                                               <Badge variant="outline" className="text-xs px-2 py-0.5 border-primary/30 text-primary/70 rounded-full">
                                                 +{lead.tags.length - 2}
                                               </Badge>
                                             )}
                                           </div>
                                         )}

                                         {/* Bottom info */}
                                         <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                                           <div className="flex items-center space-x-2">
                                             <span className="text-xs text-slate-600 font-medium">
                                               {formatDate(lead.created_at)}
                                             </span>
                                           </div>
                                           <div className="flex items-center space-x-2">
                                             <span className="text-xs text-slate-500 font-medium">
                                               {(() => {
                                                 const assignedUser = allAssignableUsers.find(u => u.user_id === lead.assigned_to);
                                                 return assignedUser ? assignedUser.name : 'Não atribuído';
                                               })()}
                                             </span>
                                             <Avatar className="w-6 h-6 border-2 border-white shadow-sm">
                                               <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary-dark text-white font-bold">
                                                 {(() => {
                                                   const assignedUser = allAssignableUsers.find(u => u.user_id === lead.assigned_to);
                                                   return assignedUser ? assignedUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
                                                 })()}
                                               </AvatarFallback>
                                             </Avatar>
                                           </div>
                                         </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            
                            {/* Empty state */}
                            {(!column.leads || column.leads.length === 0) && (
                              <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                  <IconComponent className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-sm text-slate-500 font-medium">Nenhum lead aqui</p>
                                <p className="text-xs text-slate-400">Arraste leads para esta etapa</p>
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        ) : (
          <LeadListView 
            leads={allLeads}
            onLeadClick={handleLeadClick}
            onLeadsUpdate={handleLeadsUpdate}
          />
        )}
      </div>

      {/* New Lead Modal */}
      <NewLeadModal 
        open={newLeadModalOpen} 
        onOpenChange={setNewLeadModalOpen}
        onLeadCreated={fetchLeads}
      />

      {/* Lead Detail Modal */}
      <LeadDetailModal 
        lead={selectedLead}
        open={leadDetailOpen}
        onOpenChange={setLeadDetailOpen}
      />
    </div>
  );
};