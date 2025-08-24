# Notifications & Templates

Notification channels include email and webhooks. Templates are stored per tenant and rendered with variables. Webhook deliveries include an `X-IG-Signature` header for HMAC verification and are retried with exponential backoff.
