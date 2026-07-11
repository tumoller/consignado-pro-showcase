// Arquivo: src/pages/Instances.tsx

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { PlusCircle, Loader2 } from 'lucide-react';

// Componentes da UI
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InstanceRow } from '@/components/instances/InstanceRow'; // Importa o novo componente de linha

// Exportamos o tipo para que outros arquivos (como InstanceRow) possam usá-lo
export type UserInstance = {
  instance_id: string;
  name: string;
  token: string;
  workspace_id: number;
  status: string | null;
};

export default function Instances() {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Hook para buscar a lista de instâncias do Supabase
  const { data: instances, isLoading } = useQuery<UserInstance[]>({
    queryKey: ['instances', activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const { data, error } = await supabase
        .from('user_instances')
        .select('*')
        .eq('workspace_id', activeWorkspaceId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!activeWorkspaceId,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Hook para a ação de criar uma nova instância
  const createInstanceMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!activeWorkspaceId) throw new Error("Workspace não selecionado.");
      
      const apiResponse = await fetch('/api/wuzapi/create-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instancePhoneNumber: name }),
      });
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || "Falha ao criar instância na Wuzapi");
      }
      const { wuzapiData } = await apiResponse.json();

      const { error: dbError } = await supabase
        .from('user_instances')
        .insert({
          instance_id: wuzapiData.id,
          name: name,
          token: wuzapiData.token,
          workspace_id: activeWorkspaceId,
          status: 'disconnected',
        });
      if (dbError) {
        throw new Error(`Erro ao salvar no banco de dados: ${dbError.message}`);
      }
      return wuzapiData;
    },
    onSuccess: () => {
      toast.success("Instância criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['instances', activeWorkspaceId] });
      setIsModalOpen(false);
      setNewInstanceName('');
      setModalError(null);
    },
    onError: (error) => {
      console.error("Erro na mutação de criar instância:", error);
      setModalError(error.message);
      toast.error("Erro ao criar instância.", { description: error.message });
    },
  });

  const handleCreate = () => {
    if (!newInstanceName.trim()) {
      setModalError("O nome (número de telefone) é obrigatório.");
      return;
    }
    createInstanceMutation.mutate(newInstanceName.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Instâncias</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas conexões de WhatsApp</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Nova Instância</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Instância</DialogTitle>
              <DialogDescription>
                Insira o número de WhatsApp que será usado como nome e token da instância.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="instance-name">Número / Nome</Label>
              <Input
                id="instance-name"
                placeholder="5511999998888"
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
              />
              {modalError && <p className="text-sm text-destructive">{modalError}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button onClick={handleCreate} disabled={createInstanceMutation.isPending}>
                {createInstanceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !instances || instances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24">
                  Nenhuma instância encontrada.
                </TableCell>
              </TableRow>
            ) : (
              instances.map((instance) => (
                <InstanceRow key={instance.instance_id} instance={instance} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}