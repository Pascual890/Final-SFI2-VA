const WebSocket = require('ws');
const easymidi  = require('easymidi');

const wssP5      = new WebSocket.Server({ port: 8081 });
const wssStrudel = new WebSocket.Server({ port: 8080 });
const midiOut    = new easymidi.Output('StrudelMIDI');

let p5Clients = [];

wssP5.on('connection', (ws) => {
  p5Clients.push(ws);
  console.log(`[p5] conectado. Total: ${p5Clients.length}`);

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type !== 'orbs_update') return;
      const ORB_MAP = [
        { ccX:10, ccY:11 }, { ccX:12, ccY:13 },
        { ccX:14, ccY:15 }, { ccX:16, ccY:17 }
      ];
      data.orbs.forEach((orb, i) => {
        if (i >= ORB_MAP.length) return;
        midiOut.send('cc', { controller: ORB_MAP[i].ccX, value: Math.round(orb.x * 127), channel: 0 });
        midiOut.send('cc', { controller: ORB_MAP[i].ccY, value: Math.round(orb.y * 127), channel: 0 });
      });
    } catch(e) {}
  });

  ws.on('close', () => {
    p5Clients = p5Clients.filter(c => c !== ws);
  });
});

wssStrudel.on('connection', (ws) => {
  console.log('[Strudel] conectado al puerto 8080');

  ws.on('message', (msg) => {
    const raw = msg.toString();

    // LOG — muestra los primeros 300 chars de cada mensaje de Strudel
    console.log('[Strudel msg]', raw.slice(0, 300));

    // Reenviar al p5
    p5Clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    });
  });

  ws.on('close', () => console.log('[Strudel] desconectado'));
});

console.log('🔍 Bridge DEBUG activo — p5:8081 | Strudel:8080');