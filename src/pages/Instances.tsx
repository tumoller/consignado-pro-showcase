// src/pages/Instances.tsx (VERSÃO FINAL E CORRETA)

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { PlusCircle, Loader2 } from 'lucide-react';

// Componentes da UI
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InstanceCard } from '../components/instances/InstanceCard';

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

  // BUSCA DE DADOS (JÁ ESTÁ CORRETA)
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
  });

  // ==================================================================
  // MUTATION DE CRIAÇÃO (A VERSÃO CORRETA)
  // ==================================================================
  const createInstanceMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!activeWorkspaceId) throw new Error("Workspace não selecionado.");

      // PASSO 1: Chamar nossa API de backend para criar na Wuzapi
      const apiResponse = await fetch('/api/wuzapi/create-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instancePhoneNumber: name }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        // Lança um erro para ser pego pelo onError da mutation
        throw new Error(errorData.error || "Falha ao criar instância na Wuzapi");
      }
      const { wuzapiData } = await apiResponse.json();

      // PASSO 2: Se o passo 1 funcionou, salvar a nova instância no Supabase
      const { error: dbError } = await supabase
        .from('user_instances')
        .insert({
          instance_id: wuzapiData.id,
          name: name,
          token: wuzapiData.token,
          workspace_id: activeWorkspaceId,
          status: 'disconnected', // Status inicial sempre será desconectado
        });

      if (dbError) {
        // Se salvar no DB falhar, idealmente deveríamos deletar da Wuzapi (lógica futura)
        throw new Error(`Erro ao salvar no banco de dados: ${dbError.message}`);
      }
      
      return wuzapiData;
    },
    onSuccess: () => {
      toast.success("Instância criada com sucesso!");
      // Invalida a query para que a lista na tela se atualize com a nova instância
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
        <h1 className="text-3xl font-bold">Instâncias</h1>
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
              {modalError && <p className="text-sm text-red-500">{modalError}</p>}
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !instances || instances.length === 0 ? (
        <div className="text-center py-10">
          <p>Nenhuma instância encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instances.map((instance) => (
            <InstanceCard key={instance.instance_id} instance={instance} />
          ))}
        </div>
      )}
    </div>
  );
}