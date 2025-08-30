// /api/wuzapi/create-instance.js (VERSÃO CORRIGIDA E COMPLETA)

import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // O frontend envia 'instancePhoneNumber'
  const { instancePhoneNumber } = req.body;

  if (!instancePhoneNumber) {
    return res.status(400).json({ error: 'instancePhoneNumber is required' });
  }

  // Variáveis de ambiente do backend (sem VITE_)
  const WUZAPI_URL = process.env.WUZAPI_URL;
  const ADMIN_TOKEN = process.env.WUZAPI_ADMIN_TOKEN;
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL_FOR_WUZAPI;

  if (!WUZAPI_URL || !ADMIN_TOKEN) {
    console.error("[create-instance] Variáveis de ambiente do servidor não configuradas.");
    return res.status(500).json({ error: 'Configuração do servidor incompleta.' });
  }

  // O corpo da requisição para a Wuzapi
  const requestBody = {
    name: instancePhoneNumber,  // Usamos o número como nome
    token: instancePhoneNumber, // E como token
    events: "Message", // Ou "All" se preferir
    // Adiciona o webhook apenas se ele existir
    ...(N8N_WEBHOOK_URL && { webhook: N8N_WEBHOOK_URL }),
  };

  try {
    const wuzapiResponse = await fetch(`${WUZAPI_URL}/admin/users`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Authorization': `${ADMIN_TOKEN}`, // A doc antiga usava 'Authorization', não 'Bearer'
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const wuzapiData = await wuzapiResponse.json();

    // Tratamento de erro robusto, como no seu código antigo
    if (!wuzapiResponse.ok) {
      console.error("[create-instance] Erro da API Wuzapi:", wuzapiData);
      const errorMessage = wuzapiData.data?.error || wuzapiData.error || wuzapiData.message || 'Falha ao criar instância na Wuzapi';
      return res.status(wuzapiResponse.status).json({ error: errorMessage, details: wuzapiData });
    }

    // Validação da resposta de sucesso
    if (!wuzapiData.data || !wuzapiData.data.id) {
        console.error('[create-instance] Resposta de sucesso da Wuzapi inválida (sem data.id).', wuzapiData);
        return res.status(500).json({ error: 'Resposta de sucesso da Wuzapi inválida.' });
    }

    // Sucesso!
    return res.status(201).json({ // Retorna 201 Created, como no seu código antigo
      message: "Instância criada com sucesso na Wuzapi",
      wuzapiData: wuzapiData.data, // Retorna apenas o objeto 'data'
    });

  } catch (error) {
    console.error("[create-instance] Erro interno:", error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}