const payload = { id: 'dup-test-1', species: 'cow', sex: 'female', birthDate: '2020-01-01' };
const urls = [
  'http://localhost:5173/api/AnimalIdentity/registerAnimal',
  'http://localhost:8000/api/AnimalIdentity/registerAnimal'
];

async function run() {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      console.log('---', url, 'status=', res.status);
      try {
        console.log(JSON.parse(text));
      } catch (e) {
        console.log(text);
      }
    } catch (err) {
      console.error('ERROR', url, err.message || err);
    }
  }
}

run();
