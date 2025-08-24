# IntelGraph MLFP Terraform Outputs

# VPC Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "VPC CIDR block"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

# EKS Outputs
output "eks_cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_name
}

output "eks_cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_version" {
  description = "EKS cluster Kubernetes version"
  value       = module.eks.cluster_version
}

output "eks_cluster_certificate_authority_data" {
  description = "EKS cluster certificate authority data"
  value       = module.eks.cluster_certificate_authority_data
}

output "eks_oidc_issuer_url" {
  description = "EKS OIDC issuer URL"
  value       = module.eks.cluster_oidc_issuer_url
}

# Database Outputs
output "postgres_endpoint" {
  description = "PostgreSQL endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

output "postgres_port" {
  description = "PostgreSQL port"
  value       = module.rds.db_instance_port
}

output "postgres_database_name" {
  description = "PostgreSQL database name"
  value       = module.rds.db_instance_name
}

output "postgres_username" {
  description = "PostgreSQL username"
  value       = module.rds.db_instance_username
  sensitive   = true
}

output "postgres_password" {
  description = "PostgreSQL password"
  value       = random_password.postgres_password.result
  sensitive   = true
}

# Redis Outputs
output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.redis.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = module.redis.port
}

output "redis_auth_token" {
  description = "Redis auth token"
  value       = random_password.redis_auth_token.result
  sensitive   = true
}

# OpenSearch Outputs
output "opensearch_endpoint" {
  description = "OpenSearch endpoint"
  value       = module.opensearch.domain_endpoint
  sensitive   = true
}

output "opensearch_dashboard_endpoint" {
  description = "OpenSearch dashboard endpoint"
  value       = module.opensearch.dashboard_endpoint
  sensitive   = true
}

# Neo4j Outputs (External service info)
output "neo4j_connection_info" {
  description = "Neo4j connection information"
  value = {
    instance_size = var.neo4j_aura_instance_size
    region       = var.neo4j_region
    password     = random_password.neo4j_password.result
  }
  sensitive = true
}

# Kubernetes Configuration
output "kubectl_config_command" {
  description = "Command to update kubectl config"
  value       = "aws eks update-kubeconfig --region ${data.aws_region.current.name} --name ${module.eks.cluster_name}"
}

# Helm Configuration
output "helm_values_production" {
  description = "Production Helm values"
  value = {
    global = {
      environment = var.environment
      region     = data.aws_region.current.name
    }
    postgresql = {
      host     = module.rds.db_instance_endpoint
      port     = module.rds.db_instance_port
      database = module.rds.db_instance_name
      username = module.rds.db_instance_username
    }
    redis = {
      host = module.redis.primary_endpoint_address
      port = module.redis.port
    }
    opensearch = {
      endpoint = module.opensearch.domain_endpoint
    }
    ingress = {
      annotations = {
        "kubernetes.io/ingress.class"                    = "alb"
        "alb.ingress.kubernetes.io/scheme"              = "internet-facing"
        "alb.ingress.kubernetes.io/target-type"         = "ip"
        "alb.ingress.kubernetes.io/listen-ports"        = "[{\"HTTP\": 80}, {\"HTTPS\": 443}]"
        "alb.ingress.kubernetes.io/certificate-arn"     = aws_acm_certificate.main.arn
        "alb.ingress.kubernetes.io/ssl-redirect"        = "443"
      }
    }
  }
  sensitive = true
}

# Monitoring
output "cloudwatch_log_groups" {
  description = "CloudWatch log group names"
  value = {
    eks_cluster = "/aws/eks/${module.eks.cluster_name}/cluster"
    application = "/aws/eks/${module.eks.cluster_name}/application"
  }
}

# Security
output "security_group_ids" {
  description = "Security group IDs"
  value = {
    postgres   = aws_security_group.postgres.id
    redis      = aws_security_group.redis.id
    opensearch = aws_security_group.opensearch.id
    additional = aws_security_group.additional.id
  }
}

# Cost Management
output "cost_budget_name" {
  description = "AWS Budget name"
  value       = aws_budgets_budget.main.name
}

# Domain and SSL
output "domain_name" {
  description = "Application domain name"
  value       = var.domain_name
}

output "certificate_arn" {
  description = "ACM certificate ARN"
  value       = aws_acm_certificate.main.arn
}