const payload = { id: 'dup-test-1', species: 'cow', sex: 'female', birthDate: '2020-01-01' };
const url = 'http://localhost:8000/api/AnimalIdentity/registerAnimal';

async function run() {
  for (let i = 1; i <= 2; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      console.log('Attempt', i, 'status=', res.status);
      try {
        console.log(JSON.parse(text));
      } catch (e) {
        console.log(text);
      }
    } catch (err) {
      console.error('ERROR', err.message || err);
    }
  }
}

run();
