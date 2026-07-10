// src/components/propostas/KanbanColumn.tsx
import React, { useState } from 'react';
import { ProposalCard } from './ProposalCard';
import { Proposta, fmtBRL } from '@/hooks/useCrmData';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  status: string;
  title: string;
  propostas: Proposta[];
  onCardDrop: (id: number, targetStatus: string) => void;
  onCardClick: (proposta: Proposta) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  title,
  propostas,
  onCardDrop,
  onCardClick,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  // Calcula os totais da coluna
  const totalVolume = propostas.reduce((acc, p) => acc + (Number(p.saldo) || 0), 0);
  const totalComissao = propostas.reduce((acc, p) => acc + (Number(p.comissao) || 0), 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const proposalIdStr = e.dataTransfer.getData('text/plain');
    if (proposalIdStr) {
      onCardDrop(Number(proposalIdStr), status);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', id.toString());
  };

  // Cores de destaque para colunas especiais
  const isRedigitar = status.toLowerCase() === 'redigitar' || status.toLowerCase().includes('pendencia');
  const isPaga = status.toLowerCase().startsWith('pag');

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col rounded-xl border p-4 bg-muted/20 min-h-[500px] transition-colors duration-200 w-72 shrink-0 select-none",
        isDragOver && "bg-primary/5 border-primary/40",
        isRedigitar && "border-amber-500/20 bg-amber-500/[0.02]",
        isPaga && "border-emerald-500/20 bg-emerald-500/[0.02]"
      )}
    >
      {/* Cabeçalho da Coluna */}
      <div className="mb-4 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            {title}
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
              {propostas.length}
            </span>
          </h3>
        </div>

        {/* Somatórios rápidos */}
        {propostas.length > 0 && (
          <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground pt-1 border-b border-border/50 pb-2">
            <div>
              <div>Vol. Operado</div>
              <div className="font-medium text-foreground">{fmtBRL(totalVolume)}</div>
            </div>
            <div className="text-right">
              <div>Est. Comissão</div>
              <div className="font-medium text-success">{fmtBRL(totalComissao)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Cartões */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        {propostas.map((proposta) => (
          <ProposalCard
            key={proposta.id}
            proposta={proposta}
            onDragStart={handleDragStart}
            onClick={() => onCardClick(proposta)}
          />
        ))}
        {propostas.length === 0 && (
          <div className="h-24 border border-dashed border-border/50 rounded-lg flex items-center justify-center text-xs text-muted-foreground text-center p-4">
            Arraste propostas aqui
          </div>
        )}
      </div>
    </div>
  );
};
