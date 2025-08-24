terraform {
  required_version = ">= 1.7.0"
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}

resource "null_resource" "example" {}
