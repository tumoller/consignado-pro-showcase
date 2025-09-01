// /api/wuzapi/delete-instance.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const { instanceToken } = req.body;
  const ADMIN_TOKEN = process.env.WUZAPI_ADMIN_TOKEN;
  const WUZAPI_URL = process.env.WUZAPI_URL;

  try {
    // A Wuzapi usa o token da instância como nome para deletar
    await fetch(`${WUZAPI_URL}/instance/delete?instanceName=${instanceToken}`, {
      method: 'DELETE',
      headers: { 'apikey': ADMIN_TOKEN }, // A rota de delete usa 'apikey'
    });
    // A rota de delete da Wuzapi geralmente não retorna um corpo em caso de sucesso
    return res.status(200).json({ message: 'Instância deletada na Wuzapi.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}