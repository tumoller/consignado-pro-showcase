# Relatório de Análise Técnica e Planejamento de Implementação — Frontend Consignado Pro

## Resumo Executivo
O objetivo deste documento é apresentar o mapeamento de tela a tela, o diagnóstico de estilo e a especificação técnica para a modernização do frontend do sistema **Consignado Pro**. 

A auditoria revelou um sistema baseado em React, Tailwind CSS e Supabase com bom potencial, porém limitado a operações de leitura de dados ("Read-Only"). Para atender à rotina real de um correspondente bancário (Corban), o sistema precisa evoluir de um visualizador estático de importações do Notion para uma plataforma operacional interativa. Este relatório detalha a reestruturação de roteamento, a implementação de um guia de estilo robusto baseado em HSL tokens (corrigindo bugs de opacidade do Tailwind), a arquitetura visual para suporte à esteira financeira de consignados (incluindo o pipeline Kanban de propostas) e a modelagem técnica dos novos componentes React e mutações de estado.

---

## 1. Mapeamento e Análise Crítica das Telas (R1)

### 1.1 Análise Detalhada das Telas Atuais

O roteamento da aplicação está declarado em `src/App.tsx` sob o layout comum `<AppShell>` e sob a proteção de assinatura `<SubscriptionGuard>`. Abaixo está a análise crítica das telas ativas e inativas identificadas na auditoria do código-fonte:

| Tela / Rota | Arquivo React | Função Atual | Avaliação Operacional & Crítica de UX |
| :--- | :--- | :--- | :--- |
| **Visão Geral** (`/`) | `src/pages/Index.tsx` | Dashboard com gráficos e KPIs gerais. | **Adequada**. Oferece boa visão macro dos totais de propostas pagas, comissões pendentes e volume geral, mas carece de filtros por período e atalhos rápidos para ações comuns. |
| **Contatos** (`/contatos`) | `src/pages/Contatos.tsx` | Listagem tabular de leads/clientes do Supabase. | **Incompleta**. Permite buscar clientes e abrir uma ficha de detalhes (`ContactSheet`), porém é **100% estática**: não há botão para cadastrar novos contatos ou atualizar dados do cliente. |
| **Propostas** (`/propostas`) | `src/pages/Propostas.tsx` | Tabela estática de contratos com KPIs. | **Limitada**. A visualização linear de propostas não traduz a complexidade da esteira de crédito consignado. O usuário precisa de uma visualização estilo funil (Kanban). Falta também um formulário de digitação manual de propostas. |
| **Follow-ups** (`/followups`) | `src/pages/FollowUps.tsx` | Gerenciador de tarefas e agendamento de retorno. | **Adequada**. Permite o controle de tarefas de cobrança e lembretes para clientes, essencial para o reengajamento comercial. |
| **Conversas** (`/conversas`) | `src/pages/Conversas.tsx` | Visualização passiva de mensagens do WhatsApp. | **Deficiente**. Trata-se de uma listagem em tempo real de contatos que enviaram mensagens, porém a tela de chat não permite o envio de respostas nem a leitura do histórico completo de conversas. |
| **Instâncias** (`/instances`) | `src/pages/Instances.tsx` | Gestão de conexões da API do WhatsApp (Wuzapi). | **Adequada**. É a tela técnica que permite criar, parear via QR Code e monitorar instâncias do WhatsApp. |
| **Integrações** (`/integracoes`) | `src/pages/Integracoes.tsx` | Código 100% comentado. | **Inoperante**. O arquivo está desativado na árvore de rotas, mas o item de menu "Integrações" continua visível, gerando um link quebrado que redireciona para a home. |
| **Campanhas** (`/campanhas`) | `src/pages/Campanhas.tsx` | Interface preliminar para disparo. | **Passiva**. Requer integração com formulários reais de segmentação de base de contatos. |
| **Automação** (`/automacao`) | `src/pages/Automacao.tsx` | Configuração de regras e webhooks. | **Básica**. Requer revisão de fluxos interativos. |

### 1.2 Justificativa para Consolidação e Ajuste de Rotas

1. **Remoção de Código Morto (`Integracoes.tsx`)**: O arquivo `src/pages/Integracoes.tsx` contém implementações obsoletas de conexão de instâncias de WhatsApp usando hooks antigos. Ele deve ser removido do projeto.
2. **Correção do Menu Lateral (`Sidebar.tsx`)**: O link "Integrações" no menu lateral (`Sidebar.tsx`) aponta para `/integracoes`. Como essa rota não está mapeada no `App.tsx`, o React Router intercepta a navegação e redireciona o usuário de volta à tela inicial (`/`), causando a sensação de link quebrado. O link deve ser deletado do menu. O item "Instâncias" (`/instances`) deve ser mantido e renomeado para **"Conexão WhatsApp"** (ou "WhatsApp"), consolidando a interface técnica em um único termo compreensível para o correspondente.
3. **Criação da Rota do Simulador (`/simulador`)**: Falta uma tela de entrada para novos atendimentos. Recomenda-se criar a rota `/simulador` mapeando para a página `Simulador.tsx` para centralizar a atração de leads, simulação financeira direta e consulta de margens.

### 1.3 Referências de Mercado e Melhores Práticas (UX/Negócio)

*   **Promosys**: Plataforma de referência para corbans focada em produtividade. Ela integra em uma única interface a consulta de margem Dataprev (INSS) ou SouGov (Siape), a simulação direta comparativa entre bancos (mostrando coeficientes de tabelas de comissão) e o redirecionamento dos dados para digitação. O Consignado Pro deve incorporar esse fluxo unificado de simulação e busca de margem para evitar que o operador precise copiar/colar dados entre múltiplos portais.
*   **Storm Tecnologia**: Destaca-se pelo gerenciamento avançado do pipeline de propostas in Kanban, com badges de status claros, divisão por etapas de averbação e controle automático de pendências. A interface do Consignado Pro deve imitar essa clareza visual, transformando a tabela de propostas em um quadro onde os contratos bloqueados por pendência física/documental fiquem destacados visualmente para ação do operador.

---

## 2. Auditoria e Diretrizes de Design Tokens (R2)

### 2.1 Diagnóstico do Sistema de Estilos Atual

O sistema de estilos foi auditado e apresenta as seguintes inconsistências e pontos de atenção:
1.  **Cores Hardcoded em Telas**: O projeto ignora os tokens de tema em vários arquivos e utiliza classes padrão do Tailwind, prejudicando o suporte ao modo escuro (Dark Mode). Exemplos encontrados:
    *   `src/pages/Login.tsx`: Uso de `bg-gray-100` (fundo cinza fixo) e `text-red-500` / `text-green-500` para status de erro/sucesso.
    *   `src/pages/NotFound.tsx`: Uso de `bg-gray-100` e `text-gray-600`.
    *   `src/components/layout/Sidebar.tsx`: Classe `bg-gray-500/30` hardcoded na animação de esqueleto.
2.  **Omissão de Status no Dark Mode (`src/index.css`)**: Os tokens de feedback visual (`--success`, `--warning`, `--destructive`, `--info`) estão declarados apenas no escopo `:root` (Light Mode). O bloco `.dark` não possui essas definições, gerando perda total de contraste e legibilidade para alertas e badges em modo escuro.
3.  **Incompatibilidade com Modificadores de Opacidade do Tailwind**: Em `tailwind.config.ts`, as cores estão mapeadas como:
    ```typescript
    success: 'hsl(var(--success))'
    ```
    No Tailwind v3, envelopar o token com a função `hsl(...)` impede a inserção dinâmica de opacidade nas classes de utilidade. O correto é exportar apenas os valores brutos das variáveis HSL na configuração e deixar o compilador do Tailwind tratar a opacidade através da variável `<alpha-value>`.

### 2.2 Guia de Estilos e Tokens HSL Recomendados

Para atingir uma estética minimalista, elegante e de alta legibilidade, propõe-se a seguinte estrutura de Design Tokens em `src/index.css`:

```css
@layer base {
  :root {
    /* Superfícies e Base */
    --background: 210 20% 98%;
    --foreground: 222.2 84% 4.9%;

    /* Painéis e Cards */
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --card-border: 220 13% 91%;

    /* Popovers e Modais */
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    /* Cores de Destaque / Marca (Royal Blue) */
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --primary-hover: 221.2 83.2% 45%;

    /* Superfícies Secundárias */
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    /* Estados e Textos Muted */
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    /* Tokens de Feedback Visual (Ajustados para Contraste WCAG 2.1) */
    --success: 142.1 76.2% 36.3%;
    --success-foreground: 355.7 100% 97.3%;
    --warning: 38 92% 50%;
    --warning-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --info: 199 89% 48%;
    --info-foreground: 210 40% 98%;

    /* Contornos, Inputs e Focus */
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;

    /* Barra Lateral Fiel ao Estilo Premium */
    --sidebar-background: 222.2 84% 4.9%;
    --sidebar-foreground: 210 40% 98%;
    --sidebar-primary: 221.2 83.2% 53.3%;
    --sidebar-primary-foreground: 210 40% 98%;
    --sidebar-accent: 217.2 32.6% 17.5%;
    --sidebar-accent-foreground: 210 40% 98%;
    --sidebar-border: 217.2 32.6% 12%;
    --sidebar-muted: 215 20.2% 40%;

    --radius: 0.5rem;
  }

  .dark {
    /* Dark Mode - Superfícies Suaves (Não 100% pretas para evitar fadiga ocular) */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --card: 222.2 84% 7%;
    --card-foreground: 210 40% 98%;
    --card-border: 217.2 32.6% 17.5%;

    --popover: 222.2 84% 7%;
    --popover-foreground: 210 40% 98%;

    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --primary-hover: 217.2 91.2% 65%;

    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;

    /* Ajuste de Contraste de Feedback para Modo Escuro */
    --success: 142.1 70.6% 45.3%;
    --success-foreground: 222.2 47.4% 11.2%;
    --warning: 38 92% 50%;
    --warning-foreground: 222.2 47.4% 11.2%;
    --destructive: 350 89% 60%;
    --destructive-foreground: 210 40% 98%;
    --info: 199 89% 55%;
    --info-foreground: 222.2 47.4% 11.2%;

    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;

    --sidebar-background: 222.2 84% 3.5%;
    --sidebar-foreground: 210 40% 98%;
    --sidebar-primary: 217.2 91.2% 59.8%;
    --sidebar-primary-foreground: 222.2 47.4% 11.2%;
    --sidebar-accent: 217.2 32.6% 12%;
    --sidebar-accent-foreground: 210 40% 98%;
    --sidebar-border: 217.2 32.6% 8%;
    --sidebar-muted: 215 20.2% 35%;
  }
}
```

### 2.3 Resolução Técnica do Bug de Opacidade

Para suportar modificadores de opacidade (como `bg-success/10`), o arquivo `tailwind.config.ts` deve mapear as cores utilizando o marcador `<alpha-value>`. Exemplo recomendado:

```typescript
colors: {
  border: 'hsl(var(--border) / <alpha-value>)',
  input: 'hsl(var(--input) / <alpha-value>)',
  ring: 'hsl(var(--ring) / <alpha-value>)',
  background: 'hsl(var(--background) / <alpha-value>)',
  foreground: 'hsl(var(--foreground) / <alpha-value>)',
  primary: {
    DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
    foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
    hover: 'hsl(var(--primary-hover) / <alpha-value>)'
  },
  success: {
    DEFAULT: 'hsl(var(--success) / <alpha-value>)',
    foreground: 'hsl(var(--success-foreground) / <alpha-value>)'
  },
  destructive: {
    DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
    foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
  },
}
```

### 2.4 Tipografia e Diretrizes de Layout/Espaçamento

*   **Tipografia**:
    *   **Fonte Principal**: Adicionar `"Geist Sans", "Inter", sans-serif` como fonte padrão na configuração do Tailwind (`fontFamily.sans`).
    *   **Fonte Numérica**: Adicionar `"Geist Mono", SFMono-Regular, monospace` para campos numéricos (CPF, matriculas, valores financeiros de propostas) para evitar desalinhamento visual em listas.
    *   **Escala Tipográfica**: Cabeçalhos principais devem usar `text-3xl font-bold tracking-tight text-foreground` com uma descrição de suporte em `text-muted-foreground text-sm`. Headers de cartões de KPI devem usar `text-lg font-semibold`.
*   **Espaçamento e Margens**:
    *   **Padding Externo**: Uniformizar todas as telas de dashboard com `p-6` (`24px`) de padding nas bordas da página.
    *   **Grids**: Utilizar espaçamento padronizado `gap-6` em visualizações de cartões ou layouts com múltiplas colunas.
    *   **Bordas**: Substituir bordas cinzas arbitrárias por `border-border`, garantindo finura (`border`) e suavidade (`rounded-lg` / `0.5rem`).

---

## 3. Mapeamento da Rotina Financeira no Frontend (R3)

### 3.1 A Esteira Operacional do Correspondente Bancário (Corban)

Para que a ferramenta apoie efetivamente a rotina diária do correspondente, o frontend deve suportar visualmente a seguinte esteira:

```
[Captura/Importação de Lead]
             │
             ▼
   [Simulador de Crédito] ◄───► [Consulta de Margem INSS/Siape (Dataprev)]
             │
             ▼
  [Digitação da Proposta]
             │
             ▼
[Funil Kanban de Propostas] ◄───► [Ações Rápidas via WhatsApp (Cobrança)]
             │
             ▼
 [Conciliação de Comissões]
```

1.  **Captura e Triagem de Leads**:
    *   Importação em lote de planilhas e higienização de dados.
    *   Inclusão rápida de leads manuais diretamente na listagem de contatos.
2.  **Simulação de Cenários**:
    *   Simulador financeiro que calcula o valor líquido a liberar ("troco") a partir da margem livre inserida.
    *   Suporte às operações: **Margem Livre (Novo)**, **Portabilidade**, **Refinanciamento** e **RCC/RMC (Cartões)**.
3.  **Consulta de Margem e Benefício**:
    *   Integração visual de consultas automáticas de benefício (INSS/Dataprev) exibindo o histórico de empréstimos do cliente (descontos de parcelas e margem disponível) de forma formatada.
4.  **Digitação do Contrato**:
    *   Formulário para inserir dados do contrato físico/digital (Banco parceiro, tabela de taxas, comissão prevista em percentual, número da proposta interna do banco).
5.  **Acompanhamento de Status (INSS/SIAPE/FGTS)**:
    *   Fluxo visual de progresso onde propostas mudam de status conforme a liberação bancária (ex: em análise, link gerado, averbada, paga).
6.  **Cálculo e Conciliação Financeira**:
    *   Relatórios consolidados mostrando a diferença entre a comissão estimada na digitação e a comissão real repassada pelo banco/promotora.

### 3.2 Design Recomendado do Kanban de Propostas

O painel Kanban deve substituir a tabela passiva como visão principal de progresso de vendas na rota `/propostas`. As diretrizes de design são:

*   **Lanes (Colunas de Status)**:
    1.  *Não Iniciada (Lead / Simulação)*: Contratos em prospecção ou com simulações abertas.
    2.  *Digitada / Em Análise*: Contratos já transmitidos aos sistemas do banco parceiro.
    3.  *REDIGITAR (Pendência)*: Propostas bloqueadas por pendência de documentos ou assinatura digital. (Esta coluna deve ter coloração de alerta `bg-amber-500/10` de borda).
    4.  *Aprovada / Aguardando Averb*: Proposta pré-aprovada pelo banco aguardando averbação do órgão conveniado (Dataprev, SouGov, etc.).
    5.  *Paga (Concluída)*: Crédito depositado na conta do cliente. (Borda verde de sucesso `bg-emerald-500/10`).
    6.  *Cancelada / Glosada*: Contratos estornados ou invalidados.
*   **Cabeçalhos de Coluna Informativos**:
    *   Cada coluna deve exibir o total de propostas (ex: `5 propostas`), o **Volume Financeiro Total** (soma dos saldos de empréstimo) e a **Comissão Estimada Total** daquela etapa, fornecendo ao dono do Corban uma visão clara do fluxo de caixa previsto.
*   **Interações de Drag-and-Drop**:
    *   Ao arrastar um cartão de proposta para outra coluna, o sistema atualiza o status no banco de dados Supabase e recalcula os KPIs consolidados no topo da página.
    *   O clique simples no cartão abre um painel lateral detalhado (`ProposalDetailSheet`) com o histórico de notas e ações rápidas (ex: botão para enviar mensagem de WhatsApp ao cliente cobrando assinatura).

---

## 4. Avaliação e Planejamento de Componentes React (R4)

### 4.1 Auditoria da Estrutura Atual de Componentes

*   **`src/components/ui/DataTable.tsx`**: Contém uma boa estrutura base com loading skeletons e paginação. Deve ser adaptado para substituir as tabelas personalizadas (manualmente escritas com tag `<table>` nativa) presentes em `Propostas.tsx` e `Contatos.tsx`.
*   **`src/components/instances/`**: Estrutura modular correta para gerenciamento do WhatsApp via Wuzapi. Deve ser referenciada como "Conexão WhatsApp" para fins de usabilidade.
*   **Ausência de Elementos de Escrita**: O projeto não contém componentes de formulário dinâmicos para criação de novos registros em Supabase, sendo necessária a criação de modais de inserção.

### 4.2 Especificação dos Novos Componentes do Kanban

Para suportar o pipeline interativo de propostas e a transição da estrutura do Notion, recomenda-se criar os seguintes componentes em `src/components/propostas/`:

#### A. Componente `ProposalKanban.tsx`
*   **Tipo**: Componente Principal da Visualização.
*   **Função**: Renderiza a grade de colunas. Utiliza drag-and-drop nativo HTML5 para evitar o acoplamento de bibliotecas externas pesadas e propiciar melhor performance.
*   **Props**:
    ```typescript
    interface ProposalKanbanProps {
      propostas: Proposta[];
      isLoading: boolean;
      onCardClick: (id: number) => void;
      onStatusChange: (id: number, newStatus: string) => void;
    }
    ```

#### B. Componente `KanbanColumn.tsx`
*   **Tipo**: Sub-componente Drop-Zone.
*   **Função**: Representa cada lane do Kanban. Filtra e exibe os cartões associados ao status correspondente. Soma e exibe o volume de crédito (`saldo`) e comissões previstas.
*   **Props**:
    ```typescript
    interface KanbanColumnProps {
      status: string;
      title: string;
      propostas: Proposta[];
      onCardDrop: (id: number, targetStatus: string) => void;
      onCardClick: (id: number) => void;
    }
    ```

#### C. Componente `ProposalCard.tsx`
*   **Tipo**: Sub-componente Draggable Card.
*   **Função**: Exibe dados compactos da proposta. Implementa os atributos `draggable="true"` e trata o evento `onDragStart`.
*   **Elementos Exibidos**:
    *   Nome do Contato/Cliente (`contacts.nome`).
    *   Matrícula/Benefício ou Tipo de Convênio.
    *   Resumo da Operação (ex: "Portabilidade - PAN para AGIBANK").
    *   Parcela e Valor do Contrato (`saldo`).
    *   Badges de sub-status (ex: "Aguardando Assinatura").
*   **Props**:
    ```typescript
    interface ProposalCardProps {
      proposta: Proposta;
      onDragStart: (e: React.DragEvent, id: number) => void;
      onClick: () => void;
    }
    ```

#### D. Componente `ProposalFormDialog.tsx`
*   **Tipo**: Dialog Modal (Radix/Shadcn).
*   **Função**: Formulário de criação/edição de propostas.
*   **Requisitos Especiais**:
    *   **Autocomplete de Clientes**: Um combobox interativo com filtro baseado no hook de busca de contatos. Ao invés de digitar o nome do cliente textualmente, o operador deve selecionar um contato existente da base relacional do Supabase (para evitar registros órfãos que ocorriam na planilha do Notion).
    *   Se o cliente não existir, deve permitir a abertura de um formulário de cadastro rápido de contato dentro do próprio dialog.
    *   **Cálculo da Comissão**: Exibir um campo calculado e travado (Read-Only) mostrando o valor final estimado da comissão a partir do input de `saldo * cms_pct / 100`, de modo a simular o comportamento da coluna gerada no banco de dados.

### 4.3 Mapeamento de Estado e Mutações (`src/hooks/useCrmData.ts`)

A lógica de sincronização com o banco de dados Supabase e gerenciamento de cache via TanStack Query deve ser expandida em `src/hooks/useCrmData.ts` com as seguintes implementações:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// 1. Mutação para Atualizar Status da Proposta (com Optimistic UI)
export function useUpdatePropostaStatus(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { error } = await supabase
        .from('propostas')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    // Atualização otimista da UI para drag-and-drop instantâneo
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['propostas', workspaceId] });
      const previousPropostas = queryClient.getQueryData<Proposta[]>(['propostas', workspaceId]);

      if (previousPropostas) {
        queryClient.setQueryData<Proposta[]>(
          ['propostas', workspaceId],
          previousPropostas.map((p) => (p.id === id ? { ...p, status } : p))
        );
      }
      return { previousPropostas };
    },
    onError: (err, variables, context) => {
      if (context?.previousPropostas) {
        queryClient.setQueryData(['propostas', workspaceId], context.previousPropostas);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas', workspaceId] });
    },
  });
}

// 2. Mutação para Salvar/Criar Proposta
export function useSaveProposta(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (proposta: Omit<Proposta, 'id' | 'created_at' | 'comissao'> & { id?: number }) => {
      const isUpdate = !!proposta.id;
      const payload = {
        ...proposta,
        workspace_id: workspaceId,
        updated_at: new Date().toISOString(),
      };

      if (isUpdate) {
        const { id, ...data } = payload;
        const { error } = await supabase.from('propostas').update(data).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('propostas').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas', workspaceId] });
    },
  });
}

// 3. Mutação para Deletar Proposta
export function useDeleteProposta(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('propostas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas', workspaceId] });
    },
  });
}
```

### 4.4 Regras de Validação de Input e Transição do Notion

Na transição dos dados brutos do Notion para o banco de dados via formulário frontend, devem ser aplicadas as seguintes validações e máscaras:

1.  **CPF (`contacts.cpf`)**:
    *   *Máscara*: Auto-formatação em tempo de digitação no formato `###.###.###-##`.
    *   *Validação*: Validador de CPF (Zod schema regex `/^\d{3}\.\d{3}\.\d{3}-\d{2}$/` e validação matemática de dígitos verificadores) para impedir novos cadastros inválidos que corrompam a base.
2.  **Telefone (`contacts.phone_number`)**:
    *   *Máscara*: Auto-formatação em `(XX) XXXXX-XXXX`.
    *   *Tratamento*: Limpeza automática de prefixos adicionais (como `+55` ou `55`) no envio à API, salvando somente os dígitos necessários para correspondência direta com o WhatsApp API (Wuzapi).
3.  **Moeda / Valores Financeiros (`propostas.saldo`, `propostas.parcela`)**:
    *   *Máscara*: Máscara monetária BRL (R$ 1.000,00).
    *   *Parser*: Conversão automática de strings formatadas para valores decimais de ponto flutuante antes de submeter ao Supabase.
4.  **Tabela de Comissão (`propostas.cms_pct`)**:
    *   *Validação*: Limitar valor máximo (ex: de `0` a `100` por cento) com no máximo duas casas decimais. O campo comissão da proposta deve ser marcado como somente leitura, deixando claro que a geração do valor de comissão física ocorre via trigger nativa do banco baseada em `saldo` e `cms_pct`.
5.  **Averb Date (`propostas.data_cip_averb`)**:
    *   *Componente*: Utilizar o component `Calendar` (DatePicker Shadcn) retornando string de data padrão ISO `YYYY-MM-DD` ou `null`.
