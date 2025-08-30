// src/components/instances/InstanceCard.tsx (VERSÃO CORRIGIDA)

import React, { useEffect, useState } from 'react';
import { toast } from "sonner";
import { QrCode, CircleDot, Power, AlertTriangle, Loader2, Wifi, Trash2 } from 'lucide-react';

// Componentes da UI
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { UserInstance } from '@/pages/Instances';

type WuzapiStatus = 'connected' | 'connecting' | 'disconnected' | 'loading' | 'error' | 'unknown';

export function InstanceCard({ instance }: { instance: UserInstance }) {
  const [status, setStatus] = useState<WuzapiStatus>('loading');

  const fetchStatus = async () => {
    setStatus('loading');
    try {
      // 1. Buscar status atual
      console.log('[InstanceCard] Buscando status para token:', instance.token);
      const res = await fetch('/api/wuzapi/get-status', {
        method: 'GET', 
        headers: {
          'token': instance.token,
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Falha ao buscar status");
      }
      const data = await res.json();
      console.log('[InstanceCard] Status retornado:', data.status);
      // Se estiver desconectado, tenta conectar
      if (data.status === 'disconnected') {
        toast.info('Instância desconectada. Tentando conectar...');
        const connectRes = await fetch('/api/wuzapi/connect-instance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ instanceToken: instance.token }),
        });
        const connectData = await connectRes.json();
        if (!connectRes.ok) {
          throw new Error(connectData.error || 'Erro ao conectar instância');
        }
        toast.success('Instância conectada! Atualizando status...');
        // Busca status novamente após conectar
        const res2 = await fetch('/api/wuzapi/get-status', {
          method: 'GET',
          headers: {
            'token': instance.token,
          },
        });
        const data2 = await res2.json();
        setStatus(data2.status || 'unknown');
        console.log('[InstanceCard] Status após conectar:', data2.status);
        return;
      }
      setStatus(data.status || 'unknown');
    } catch (err: any) {
      console.error(`[InstanceCard] Erro ao buscar status para ${instance.name}:`, err);
      setStatus('error');
      toast.error(`Não foi possível obter o status para ${instance.name}.`, {
        description: err.message
      });
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [instance.token]);

  const getStatusVariant = () => {
    switch (status) {
      case 'connected': return "default";
      case 'connecting': return "secondary";
      case 'disconnected': return "destructive";
      case 'error': return "destructive";
      default: return "outline";
    }
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'connected': return "Conectado";
      case 'connecting': return "Conectando";
      case 'disconnected': return "Desconectado";
      case 'loading': return "Verificando...";
      case 'error': return "Erro";
      default: return "Desconhecido";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="font-bold truncate">{instance.name}</CardTitle>
          <Badge variant={getStatusVariant()} className="capitalize">
            {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : getStatusText()}
          </Badge>
        </div>
        <CardDescription>ID: {instance.instance_id}</CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'error' && <p className="text-sm text-destructive flex items-center"><AlertTriangle className="h-4 w-4 mr-2" />Não foi possível obter o status.</p>}
        {/* Adicionar mais informações aqui no futuro */}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={status === 'loading'}>
          <CircleDot className="mr-2 h-4 w-4" /> Atualizar
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso irá deletar permanentemente a instância.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90">
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}