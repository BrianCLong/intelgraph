# Architecture

```
[Gateway] --graphql--> [Clients]
   |\
   | \--socket.io--> [Collab]
   |         \
   |          --> [Redis]
   \--http--> [Files]
```
