// src/components/propostas/ProposalKanban.tsx
import React from 'react';
import { KanbanColumn } from './KanbanColumn';
import { Proposta } from '@/hooks/useCrmData';
import { Loader2 } from 'lucide-react';

interface ProposalKanbanProps {
  propostas: Proposta[];
  isLoading: boolean;
  onCardClick: (id: number) => void;
  onStatusChange: (id: number, newStatus: string) => void;
}

// Colunas do Kanban - Chave do Banco vs Título Visível
const KANBAN_COLUMNS = [
  { status: 'Não iniciada', title: 'Não Iniciada' },
  { status: 'Digitada', title: 'Digitada' },
  { status: 'REDIGITAR', title: 'REDIGITAR (Pendência)' },
  { status: 'Aprovada', title: 'Aprovada / Averbando' },
  { status: 'Paga', title: 'Paga' },
  { status: 'Cancelada', title: 'Cancelada' },
];

export const ProposalKanban: React.FC<ProposalKanbanProps> = ({
  propostas,
  isLoading,
  onCardClick,
  onStatusChange,
}) => {
  if (isLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Agrupa as propostas por coluna
  const getPropostasByStatus = (statusKey: string) => {
    return propostas.filter((p) => {
      const pStatus = (p.status || '').toLowerCase().trim();
      const sKey = statusKey.toLowerCase().trim();

      // Mapeamento flexível
      if (sKey === 'paga' && pStatus.startsWith('pag')) return true;
      if (sKey === 'cancelada' && pStatus.startsWith('canc')) return true;
      if (sKey === 'não iniciada' && (pStatus === 'não iniciada' || pStatus === 'nao iniciada' || pStatus === '')) return true;
      
      // Fallback para correspondência exata
      return pStatus === sKey;
    });
  };

  const handleCardDrop = (id: number, targetStatus: string) => {
    onStatusChange(id, targetStatus);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 select-none scrollbar-thin">
      {KANBAN_COLUMNS.map((col) => {
        const filtered = getPropostasByStatus(col.status);
        return (
          <KanbanColumn
            key={col.status}
            status={col.status}
            title={col.title}
            propostas={filtered}
            onCardDrop={handleCardDrop}
            onCardClick={onCardClick}
          />
        );
      })}
    </div>
  );
};
