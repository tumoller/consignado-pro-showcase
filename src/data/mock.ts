// Dados mockados para o dashboard Consignado Pro

export interface KpiData {
  leadsAtivos: number;
  conversasAtivas: number;
  mensagensHoje: number;
  taxaResposta: number;
  variacaoLeads: number;
  variacaoConversas: number;
  variacaoMensagens: number;
  variacaoTaxa: number;
}

export interface TimeSeriesData {
  date: string;
  envios: number;
  respostas: number;
}

export interface ConversaData {
  id: string;
  nome: string;
  telefone: string;
  ultimaMensagem: string;
  status: 'aberta' | 'fechada';
  atualizadoEm: string;
}

// KPIs principais
export const kpiData: KpiData = {
  leadsAtivos: 1247,
  conversasAtivas: 89,
  mensagensHoje: 324,
  taxaResposta: 67.8,
  variacaoLeads: 12.5,
  variacaoConversas: -3.2,
  variacaoMensagens: 8.7,
  variacaoTaxa: 4.1
};

// Dados de série temporal para gráficos
export const timeSeriesData: TimeSeriesData[] = [
  { date: '2025-08-22', envios: 120, respostas: 78 },
  { date: '2025-08-23', envios: 145, respostas: 92 },
  { date: '2025-08-24', envios: 89, respostas: 56 },
  { date: '2025-08-25', envios: 167, respostas: 108 },
  { date: '2025-08-26', envios: 134, respostas: 89 },
  { date: '2025-08-27', envios: 198, respostas: 142 },
  { date: '2025-08-28', envios: 156, respostas: 98 },
  { date: '2025-08-29', envios: 324, respostas: 187 }
];

// Dados das últimas conversas
export const ultimasConversas: ConversaData[] = [
  {
    id: '1',
    nome: 'Maria Silva',
    telefone: '+5511987654321',
    ultimaMensagem: 'Gostaria de mais informações sobre o empréstimo',
    status: 'aberta',
    atualizadoEm: '2025-08-29 14:35'
  },
  {
    id: '2',
    nome: 'João Santos',
    telefone: '+5511876543210',
    ultimaMensagem: 'Qual é a taxa de juros atual?',
    status: 'aberta',
    atualizadoEm: '2025-08-29 13:28'
  },
  {
    id: '3',
    nome: 'Ana Costa',
    telefone: '+5511765432109',
    ultimaMensagem: 'Obrigada pelas informações!',
    status: 'fechada',
    atualizadoEm: '2025-08-29 12:45'
  },
  {
    id: '4',
    nome: 'Pedro Oliveira',
    telefone: '+5511654321098',
    ultimaMensagem: 'Preciso de um prazo maior para decidir',
    status: 'aberta',
    atualizadoEm: '2025-08-29 11:22'
  },
  {
    id: '5',
    nome: 'Carla Mendes',
    telefone: '+5511543210987',
    ultimaMensagem: 'Quando posso receber o valor?',
    status: 'aberta',
    atualizadoEm: '2025-08-29 10:15'
  },
  {
    id: '6',
    nome: 'Roberto Lima',
    telefone: '+5511432109876',
    ultimaMensagem: 'Documentos enviados por email',
    status: 'aberta',
    atualizadoEm: '2025-08-29 09:30'
  },
  {
    id: '7',
    nome: 'Luciana Rocha',
    telefone: '+5511321098765',
    ultimaMensagem: 'Não tenho interesse no momento',
    status: 'fechada',
    atualizadoEm: '2025-08-28 16:45'
  },
  {
    id: '8',
    nome: 'Fernando Dias',
    telefone: '+5511210987654',
    ultimaMensagem: 'Vou analisar a proposta',
    status: 'aberta',
    atualizadoEm: '2025-08-28 15:20'
  }
];

// Função para simular loading
export const simulateLoading = (delay = 500) => {
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Formatar números para exibição
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('pt-BR').format(num);
};

// Formatar percentual
export const formatPercentage = (num: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(num / 100);
};

// Formatar data
export const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
};