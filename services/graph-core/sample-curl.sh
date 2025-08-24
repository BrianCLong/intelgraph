curl -X POST http://localhost:3001/api/v1/entities/Person \
  -H 'Content-Type: application/json' \
  -d '{"attributes":{"name":"Alice","email":"a@example.com"}}'

curl -X POST http://localhost:3001/api/v1/er/candidates \
  -H 'Content-Type: application/json' \
  -d '{"entities":[{"id":"1","type":"Person","attributes":{"name":"Alice","email":"a@example.com"}},{"id":"2","type":"Person","attributes":{"name":"Alicia","email":"a@example.com"}}]}'
