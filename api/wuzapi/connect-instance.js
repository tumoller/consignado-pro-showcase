
// /api/wuzapi/connect-instance.js
import fetch from 'node-fetch'; // ADICIONE ESTA LINHA
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { instanceToken } = req.body;

  if (!instanceToken) {
    return res.status(400).json({ error: 'instanceToken is required' });
  }

  const WUZAPI_URL = process.env.WUZAPI_URL;

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

    if (!wuzapiResponse.ok) {
      // Tratamento do caso especial "already connected"
      if (wuzapiData.message && wuzapiData.message.includes("already connected")) {
        return res.status(200).json({ status: "success", message: "Instance already connected." });
      }
      return res.status(wuzapiResponse.status).json({ 
        error: wuzapiData.message || 'Failed to connect instance', 
        wuzapiData 
      });
    }

    return res.status(200).json({
      message: "Instance connected successfully",
      wuzapiData: wuzapiData,
    });

  } catch (error) {
    console.error("Internal error in /api/wuzapi/connect-instance:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
