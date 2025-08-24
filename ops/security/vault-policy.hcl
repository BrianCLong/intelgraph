# Example Vault policy granting a service access to its secrets
path "secret/data/service/*" {
  capabilities = ["read"]
}
