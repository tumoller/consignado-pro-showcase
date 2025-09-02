// Arquivo: src/components/instances/InstanceRow.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Power, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { ConnectAndQrButton } from './actions/ConnectAndQrButton';
import type { UserInstance } from '@/pages/Instances'; // Importa o tipo da página pai

type WuzapiStatus = 'connected' | 'connecting' | 'disconnected' | 'loading' | 'error' | 'unknown';

export function InstanceRow({ instance }: { instance: UserInstance }) {
  const [status, setStatus] = useState<WuzapiStatus>('loading');

  const fetchStatus = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/wuzapi/get-status', {
        method: 'GET',
        headers: { 'token': instance.token },
      });
      if (!res.ok) throw new Error("Falha ao buscar status");
      const data = await res.json();
      setStatus(data.status || 'unknown');
    } catch (err) {
      setStatus('error');
    }
  }, [instance.token]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

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
    <TableRow>
      <TableCell>
        <div className="font-medium">{instance.name}</div>
        <div className="text-xs text-muted-foreground">{instance.instance_id}</div>
      </TableCell>
      <TableCell>
        <Badge variant={getStatusVariant()} className="capitalize">
          {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : getStatusText()}
        </Badge>
      </TableCell>
      <TableCell className="flex items-center gap-2">
        {status === 'connected' && (
          <Button variant="destructive" size="sm">
            <Power className="mr-2 h-4 w-4" />Desconectar
          </Button>
        )}
        {(status === 'disconnected' || status === 'error' || status === 'connecting') && (
          <ConnectAndQrButton instanceToken={instance.token} onSuccess={fetchStatus} />
        )}
        <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={fetchStatus} disabled={status === 'loading'}>
          {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </TableCell>
    </TableRow>
  );
}