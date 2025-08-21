/* eslint-disable */
/* tslint:disable */

/**
 * Mock Service Worker.
 * @see https://github.com/mswjs/msw
 * - Please do NOT modify this file.
 * - Please do NOT serve this file on production.
 */

const INTEGRITY_CHECKSUM = '02f4ad4a2ca366cc'
const IS_MOCKED_RESPONSE = Symbol('isMockedResponse')
const activeClientIds = new Set()

self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', async function (event) {
  const clientId = event.source.id

  if (!clientId || !event.data) {
    return
  }

  const message = JSON.parse(event.data)

  switch (message.type) {
    case 'MOCK_ACTIVATE': {
      activeClientIds.add(clientId)
      sendToClient(clientId, {
        type: 'MOCKING_ENABLED',
        payload: true,
      })
      break
    }

    case 'MOCK_DEACTIVATE': {
      activeClientIds.delete(clientId)
      break
    }

    case 'INTEGRITY_CHECK_REQUEST': {
      sendToClient(clientId, {
        type: 'INTEGRITY_CHECK_RESPONSE',
        payload: INTEGRITY_CHECKSUM,
      })
      break
    }

    case 'KEEP_ALIVE_REQUEST': {
      sendToClient(clientId, {
        type: 'KEEP_ALIVE_RESPONSE',
        payload: Date.now(),
      })
      break
    }

    case 'CLIENT_CLOSED': {
      activeClientIds.delete(clientId)
      break
    }

    case 'MOCK_REQUEST': {
      respondWithMock(event, clientId)
      break
    }
  }
})

self.addEventListener('fetch', function (event) {
  const { clientId, request } = event

  if (!clientId || !activeClientIds.has(clientId)) {
    return
  }

  if (request.mode === 'navigate' && request.method === 'GET') {
    return
  }

  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
    return
  }

  event.respondWith(
    new Promise((resolve, reject) => {
      self.addEventListener('message', function handler(event) {
        if (event.source.id !== clientId) {
          return
        }

        if (!event.data) {
          return
        }

        const message = JSON.parse(event.data)

        if (message.type === 'MOCK_SUCCESS') {
          self.removeEventListener('message', handler)

          resolve(
            new Response(message.payload.body, {
              ...message.payload,
              headers: {
                ...message.payload.headers,
                'x-powered-by': 'msw',
              },
            })
          )
        }

        if (message.type === 'MOCK_NOT_FOUND') {
          self.removeEventListener('message', handler)
          resolve()
        }

        if (message.type === 'NETWORK_ERROR') {
          self.removeEventListener('message', handler)
          reject(message.payload)
        }
      })

      sendToClient(clientId, {
        type: 'REQUEST',
        payload: {
          id: generateRandomId(),
          url: request.url,
          mode: request.mode,
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          cache: request.cache,
          credentials: request.credentials,
          destination: request.destination,
          integrity: request.integrity,
          redirect: request.redirect,
          referrer: request.referrer,
          referrerPolicy: request.referrerPolicy,
          body: await request.text(),
          bodyUsed: request.bodyUsed,
          keepalive: request.keepalive,
        },
      })
    })
  )
})

function sendToClient(clientId, message) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()

    channel.port1.onmessage = (event) => {
      if (event.data && event.data.error) {
        return reject(event.data.error)
      }

      resolve(event.data)
    }

    self.clients
      .get(clientId)
      .then((client) => {
        if (!client) {
          return
        }

        client.postMessage(JSON.stringify(message), [channel.port2])
      })
      .catch(reject)
  })
}

function sleep(timeMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeMs)
  })
}

function generateRandomId() {
  return `${Math.random().toString(16).slice(2)}`
}