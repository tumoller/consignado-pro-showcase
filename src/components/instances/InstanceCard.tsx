// src/components/instances/InstanceCard.tsx (VERSÃO COMPLETA E CORRIGIDA)

import React, { useEffect, useState } from 'react';
import { toast } from "sonner";
import { CircleDot, Power, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UserInstance } from '@/pages/Instances';
import { ConnectAndQrButton } from './actions/ConnectAndQrButton';
// Importar outros botões de ação aqui quando forem criados

type WuzapiStatus = 'connected' | 'connecting' | 'disconnected' | 'loading' | 'error' | 'unknown';

export function InstanceCard({ instance }: { instance: UserInstance }) {
  const [status, setStatus] = useState<WuzapiStatus>('loading');

  const fetchStatus = async () => {
    // A MUDANÇA CRÍTICA: Não muda o status para 'loading' se já estamos no meio de uma ação
    // Isso evita que o botão seja destruído.
    if (status !== 'connecting') {
      setStatus('loading');
    }
    try {
      const res = await fetch('/api/wuzapi/get-status', {
        method: 'GET',
        headers: { 'token': instance.token },
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Token inválido ou não autorizado.");
        throw new Error("Falha ao buscar status da Wuzapi");
      }
      const data = await res.json();
      setStatus(data.status || 'unknown');
    } catch (err: any) {
      setStatus('error');
      toast.error(`Status para ${instance.name}`, { description: err.message });
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [instance.token]);

  const getStatusVariant = (): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'connected': return "default";
      case 'connecting': return "secondary";
      case 'disconnected': return "destructive";
      case 'error': return "destructive";
      default: return "outline";
    }
  };

  const getStatusText = (): string => {
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
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div>
          {/* Renderização condicional dos botões de ação */}
          {(status === 'disconnected' || status === 'error' || status === 'connecting') && (
            <ConnectAndQrButton 
              instanceToken={instance.token} 
              onSuccess={() => setStatus('connecting')} // Apenas muda o status visual
            />
          )}
          {status === 'connected' && (
            <Button variant="destructive" size="sm">
              <Power className="mr-2 h-4 w-4" /> Desconectar
            </Button>
          )}
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchStatus} disabled={status === 'loading'}>
              <CircleDot className="h-4 w-4" />
            </Button>
            {/* O botão de deletar virá aqui */}
        </div>
      </CardFooter>
    </Card>
  );
}