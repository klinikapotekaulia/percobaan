const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Enable parsing of JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from root directory
app.use(express.static(__dirname));

// SatuSehat Token Cache to avoid repeatedly hitting Kemenkes servers
let tokenCache = {};

/**
 * Retrieves a valid SatuSehat OAuth access token, caching it until expiry.
 */
async function getSatuSehatToken(clientId, clientSecret, env) {
  const cacheKey = `${clientId}_${env}`;
  const now = Date.now();
  
  if (tokenCache[cacheKey] && tokenCache[cacheKey].expiresAt > now) {
    return tokenCache[cacheKey].accessToken;
  }
  
  const authUrl = env === 'production' 
    ? 'https://api.kemkes.go.id/oauth2/v1/accesstoken'
    : 'https://api-sandbox.kemkes.go.id/oauth2/v1/accesstoken';
    
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Kemenkes Auth Error: ${response.status} - ${errText}`);
  }
  
  const data = await response.json();
  if (!data.access_token) {
    throw new Error('No access token returned in Kemenkes response');
  }
  
  // Cache token (expire slightly early by 60 seconds to prevent edge-case race conditions)
  const expiresInMs = (parseInt(data.expires_in || '3600', 10) - 60) * 1000;
  tokenCache[cacheKey] = {
    accessToken: data.access_token,
    expiresAt: now + expiresInMs
  };
  
  return data.access_token;
}

// Serve a config endpoint if needed for environment-based Firebase config (optional/fallback)
app.get('/api/config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDXuiTRwHttekv5iy6rk8RJA_pVL25v-U4",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "klinikapotekaulia-61641.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "klinikapotekaulia-61641",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "klinikapotekaulia-61641.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "857781555251",
    appId: process.env.FIREBASE_APP_ID || "1:857781555251:web:33dbb41f292026f9ef9346"
  });
});

// ============================================================
// SATUSEHAT KEMENKES SECURE PROXY ROUTES (HL7 FHIR Standard)
// ============================================================

// 1. Test Connection
app.post('/api/satusehat/test-connection', async (req, res) => {
  try {
    const { clientId, clientSecret, env } = req.body;
    if (!clientId || !clientSecret) {
      return res.status(400).json({ success: false, message: 'Client ID & Client Secret required' });
    }
    const token = await getSatuSehatToken(clientId, clientSecret, env);
    return res.json({ success: true, message: 'Authenticated successfully with SatuSehat' });
  } catch (err) {
    console.error('SatuSehat Test Connection Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Get Patient FHIR ID by NIK
app.post('/api/satusehat/patient/by-nik/:nik', async (req, res) => {
  try {
    const { nik } = req.params;
    const { clientId, clientSecret, env } = req.body;
    
    if (!clientId || !clientSecret) {
      return res.status(400).json({ success: false, message: 'Client ID & Client Secret required' });
    }
    
    const token = await getSatuSehatToken(clientId, clientSecret, env);
    const baseUrl = env === 'production' 
      ? 'https://api.kemkes.go.id/fhir-r4/v1'
      : 'https://api-sandbox.kemkes.go.id/fhir-r4/v1';
       
    const url = `${baseUrl}/Patient?identifier=https://fhir.kemkes.go.id/id/nik|${nik}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, message: `Kemenkes FHIR Error: ${errText}` });
    }
    
    const fhirData = await response.json();
    if (fhirData.entry && fhirData.entry.length > 0 && fhirData.entry[0].resource) {
      const patientId = fhirData.entry[0].resource.id;
      return res.json({ success: true, patientId: patientId, details: fhirData.entry[0].resource });
    } else {
      return res.json({ success: false, message: 'NIK tidak ditemukan di database SatuSehat' });
    }
  } catch (err) {
    console.error('SatuSehat Patient Lookup Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Create FHIR Encounter & Condition
app.post('/api/satusehat/encounter/create', async (req, res) => {
  try {
    const { 
      clientId, clientSecret, env, 
      patientId, patientName, doctorName, diagnosa, 
      organizationId, locationId 
    } = req.body;
    
    if (!clientId || !clientSecret) {
      return res.status(400).json({ success: false, message: 'Client ID & Client Secret required' });
    }
    
    const token = await getSatuSehatToken(clientId, clientSecret, env);
    const baseUrl = env === 'production' 
      ? 'https://api.kemkes.go.id/fhir-r4/v1'
      : 'https://api-sandbox.kemkes.go.id/fhir-r4/v1';
       
    // a. Create FHIR Encounter resource
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 1800000).toISOString(); // +30 mins
    
    const encounterPayload = {
      resourceType: "Encounter",
      status: "finished",
      class: {
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "AMB",
        display: "ambulatory"
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: patientName
      },
      period: {
        start: startTime,
        end: endTime
      },
      location: [
        {
          location: {
            reference: `Location/${locationId || 'f76b88b7-86c0-4286-9dc4-839e94cb02cb'}`,
            display: "Poliklinik Aulia"
          }
        }
      ],
      serviceProvider: {
        reference: `Organization/${organizationId || '100023456'}`
      }
    };
    
    const encRes = await fetch(`${baseUrl}/Encounter`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/fhir+json'
      },
      body: JSON.stringify(encounterPayload)
    });
    
    if (!encRes.ok) {
      const errText = await encRes.text();
      throw new Error(`Gagal membuat Encounter: ${errText}`);
    }
    
    const encounterData = await encRes.json();
    const encounterId = encounterData.id;
    
    // b. Create FHIR Condition resource (Diagnosis ICD-10)
    let icdCode = "Z00.0";
    let icdDisplay = "General medical examination";
    if (diagnosa) {
      const parts = diagnosa.split('-');
      icdCode = parts[0].trim();
      icdDisplay = parts[1] ? parts[1].trim() : diagnosa;
    }
    
    const conditionPayload = {
      resourceType: "Condition",
      clinicalStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: "active",
            display: "Active"
          }
         ]
      },
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/condition-category",
              code: "encounter-diagnosis",
              display: "Encounter Diagnosis"
            }
          ]
        }
      ],
      code: {
        coding: [
          {
            system: "http://hl7.org/fhir/sid/icd-10",
            code: icdCode,
            display: icdDisplay
          }
        ]
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: patientName
      },
      encounter: {
        reference: `Encounter/${encounterId}`
      }
    };
    
    const condRes = await fetch(`${baseUrl}/Condition`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/fhir+json'
      },
      body: JSON.stringify(conditionPayload)
    });
    
    let conditionId = '';
    if (condRes.ok) {
      const conditionData = await condRes.json();
      conditionId = conditionData.id;
    }
    
    return res.json({
      success: true,
      encounterId: encounterId,
      conditionId: conditionId
    });
  } catch (err) {
    console.error('SatuSehat Encounter Creation Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Fallback all other requests to index.html for SPA/routing support
app.get(/(.*)/, (req, res) => {
  // Jika request memiliki extension file (seperti .png, .css, .js), jangan dikembalikan index.html (return 404)
  if (path.extname(req.path)) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
