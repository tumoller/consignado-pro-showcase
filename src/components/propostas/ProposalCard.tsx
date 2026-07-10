// src/components/propostas/ProposalCard.tsx
import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { FileText, Landmark, Wallet } from 'lucide-react';
import { Proposta, fmtBRL, fmtCpf } from '@/hooks/useCrmData';

interface ProposalCardProps {
  proposta: Proposta;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onClick: () => void;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  proposta,
  onDragStart,
  onClick,
}) => {
  const comissaoVal = proposta.comissao ?? 0;
  const clienteNome = proposta.contacts?.nome || 'Cliente Sem Nome';
  const clienteCpf = proposta.contacts?.cpf ? fmtCpf(proposta.contacts.cpf) : '';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, proposta.id)}
      onClick={onClick}
      className="cursor-grab active:cursor-grabbing transition-transform duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      <Card className="border border-card-border bg-card text-card-foreground select-none overflow-hidden">
        <CardContent className="p-4 space-y-3">
          {/* Header do Card */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-semibold text-sm truncate text-foreground" title={clienteNome}>
                {clienteNome}
              </h4>
              <p className="text-xs text-muted-foreground font-mono">{clienteCpf || '—'}</p>
            </div>
            {proposta.operacao && (
              <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                {proposta.operacao}
              </Badge>
            )}
          </div>

          {/* Detalhes da Proposta */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Landmark className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">
                {proposta.bco_op || 'Banco não informado'}
                {proposta.bco_port && <span className="text-[10px]"> → {proposta.bco_port}</span>}
              </span>
            </div>
            {proposta.produto && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{proposta.produto}</span>
              </div>
            )}
          </div>

          {/* Valores Financeiros */}
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] text-muted-foreground">Operação</div>
              <div className="font-semibold text-foreground">{fmtBRL(proposta.saldo)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end">
                <Wallet className="h-3 w-3 text-success" />
                Comissão {proposta.cms_pct != null ? `(${proposta.cms_pct}%)` : ''}
              </div>
              <div className="font-bold text-success">{fmtBRL(comissaoVal)}</div>
            </div>
          </div>

          {/* Sub-status (Se houver) */}
          {proposta.sub_status && proposta.sub_status !== proposta.status && (
            <div className="pt-1.5 flex justify-end">
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {proposta.sub_status}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
