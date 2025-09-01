// /api/wuzapi/get-qrcode.js (VERSÃO CORRETA)
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // 1. O método da API é POST, pois recebe o token no corpo
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { instanceToken } = req.body;
  if (!instanceToken) {
    return res.status(400).json({ error: 'Token da instância é obrigatório.' });
  }

  const WUZAPI_URL = process.env.WUZAPI_URL;
  if (!WUZAPI_URL) {
    return res.status(500).json({ error: 'URL da Wuzapi não configurada no servidor.' });
  }

  try {
    // 2. A chamada para a Wuzapi é GET, como na documentação
    const wuzapiResponse = await fetch(`${WUZAPI_URL}/session/qr`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'token': instanceToken,
      },
    });

    const wuzapiData = await wuzapiResponse.json();

    if (!wuzapiResponse.ok || !wuzapiData.success) {
      const errorMessage = wuzapiData.message || wuzapiData.error || 'Erro ao obter QR Code da Wuzapi';
      return res.status(wuzapiResponse.status).json({ error: errorMessage, details: wuzapiData });
    }

    if (!wuzapiData.data || !wuzapiData.data.QRCode) {
      return res.status(500).json({ error: 'Resposta da Wuzapi não contém o QRCode esperado.', details: wuzapiData });
    }
    
    return res.status(200).json({ 
      message: 'QR Code obtido com sucesso', 
      qrCodeBase64: wuzapiData.data.QRCode 
    });

  } catch (error) {
    console.error('[API /get-qrcode] Erro interno:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}