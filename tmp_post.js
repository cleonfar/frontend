const http = require('http')
const data = JSON.stringify({ id: 'test-1', species: 'sheep', sex: 'male', birthDate: '2020-01-01' })
const opts = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
  host: 'localhost',
  port: 8000,
  path: '/api/AnimalIdentity/registerAnimal'
}
const req = http.request(opts, res => {
  console.log('status', res.statusCode)
  let d = ''
  res.on('data', c => (d += c))
  res.on('end', () => console.log('body', d))
})
req.on('error', e => console.error('err', e.message))
req.write(data)
req.end()
