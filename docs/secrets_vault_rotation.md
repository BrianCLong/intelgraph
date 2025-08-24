# Secrets Vault & Rotation

The platform stores tenant secrets encrypted with Fernet using a master key. Rotation rewraps existing ciphertext with a new key version. Access to secrets is audited and values are never returned after initial write.
