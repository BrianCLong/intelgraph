# Device Enrollment

Enrollment secures initial device provisioning.

1. An administrator creates a short-lived ticket specifying tenant and capabilities.
2. The device presents the ticket and its public key to the gateway.
3. Gateway verifies the code, stores the key, and returns a signed JWT for subsequent requests.
4. Device rotates keys periodically and can be remotely wiped.
