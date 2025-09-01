// server.js (VERSÃO CORRIGIDA COM IMPORT)

import dotenv from 'dotenv'; // 1. Importe o dotenv
import express from 'express';
import getQrCodeHandler from './api/wuzapi/get-qrcode.js'; // 1. IMPORTE A NOVA ROTA
import deleteInstanceHandler from './api/wuzapi/delete-instance.js';


dotenv.config(); // 2. Chame dotenv.config() para carregar as variáveis de ambiente

// Importe suas funções de API
import getStatusHandler from './api/wuzapi/get-status.js';
import createInstanceHandler from './api/wuzapi/create-instance.js';
import connectInstanceHandler from './api/wuzapi/connect-instance.js';
// Adicione outras rotas de API aqui

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Defina as rotas da sua API
app.get('/api/wuzapi/get-status', getStatusHandler);
app.post('/api/wuzapi/create-instance', createInstanceHandler);
app.post('/api/wuzapi/connect-instance', connectInstanceHandler);
app.post('/api/wuzapi/get-qrcode', getQrCodeHandler);
app.post('/api/wuzapi/delete-instance', deleteInstanceHandler);

// Adicione outras rotas aqui

// Inicie o servidor da API
app.listen(PORT, () => {
  console.log(`🚀 Servidor da API rodando na porta ${PORT}`);
});