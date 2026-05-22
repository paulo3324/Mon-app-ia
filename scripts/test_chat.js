(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Test : Quels sont les avantages du pacte Dutreil pour une PME familiale ?" }),
    });

    const text = await res.text();
      const fs = require('fs');
      const out = { status: res.status, body: text };
      fs.writeFileSync('scripts/test_chat_result.json', JSON.stringify(out, null, 2), 'utf8');
      console.log('WROTE scripts/test_chat_result.json');
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
})();
