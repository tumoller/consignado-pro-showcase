// /api/wuzapi/get-status.js (VERSÃO FINAL COM EXPORT DEFAULT)
import fetch from 'node-fetch'; // ADICIONE ESTA LINHA
// Esta função já está no formato correto para ser importada pelo server.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const instanceToken = req.headers['token'];

  if (!instanceToken) {
    return res.status(400).json({ error: 'Header "token" is required' });
  }

  const WUZAPI_URL = process.env.WUZAPI_URL;

  try {
    const wuzapiResponse = await fetch(`${WUZAPI_URL}/session/status`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'token': instanceToken,
      },
    });

    const wuzapiData = await wuzapiResponse.json();

    if (!wuzapiResponse.ok) {
      return res.status(wuzapiResponse.status).json({ 
        error: wuzapiData.message || 'Failed to get status from Wuzapi', 
        wuzapiData 
      });
    }

    let status = 'unknown';
    const statusData = wuzapiData.data;

    if (statusData?.connected === true && statusData?.loggedIn === true) {
      status = 'connected';
    } else if (statusData?.connected === true && statusData?.loggedIn === false) {
      status = 'connecting';
    } else if (statusData?.connected === false) {
      status = 'disconnected';
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      message: "Status obtido com sucesso",
      status: status,
      wuzapiData: statusData,
    });

  } catch (error) {
    console.error("Internal error in /api/wuzapi/get-status:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}