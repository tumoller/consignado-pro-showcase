// /api/wuzapi/connect-instance.js (VERSÃO FINAL E CORRETA)
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { instanceToken } = req.body;
  if (!instanceToken) {
    return res.status(400).json({ error: 'instanceToken is required' });
  }

  const WUZAPI_URL = process.env.WUZAPI_URL;
  if (!WUZAPI_URL) {
    return res.status(500).json({ error: 'Wuzapi URL not configured' });
  }

  try {
    const wuzapiResponse = await fetch(`${WUZAPI_URL}/session/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify({
        "Subscribe": ["Message"],
        "Immediate": true
      }),
    });

    const wuzapiData = await wuzapiResponse.json();

    // ==================================================================
    // A LÓGICA CORRIGIDA ESTÁ AQUI
    // ==================================================================
    if (!wuzapiResponse.ok) {
      // Verificamos PRIMEIRO se o "erro" é, na verdade, um sucesso para nós.
      if (wuzapiData.error?.includes("already connected")) {
        console.log("[connect-instance] Instância já conectada. Tratando como sucesso para prosseguir.");
        // Retornamos 200 OK para que o frontend continue para o próximo passo.
        return res.status(200).json({ message: "Instance was already connected." });
      }
      // Se for qualquer outro erro, aí sim nós o lançamos.
      throw new Error(wuzapiData.message || 'Failed to connect instance');
    }

    return res.status(200).json({ message: "Instance connected successfully", wuzapiData });

  } catch (error) {
    console.error("[connect-instance] Error:", error);
    return res.status(500).json({ error: error.message });
  }
}