# IntelGraph MLFP AWS Infrastructure
# Production-ready Terraform configuration for EKS, RDS, ElastiCache, OpenSearch

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.30.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.26.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.13.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6.0"
    }
  }

  backend "s3" {
    bucket         = "intelgraph-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "intelgraph-terraform-locks"
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Random password generation
resource "random_password" "postgres_password" {
  length  = 32
  special = true
}

resource "random_password" "neo4j_password" {
  length  = 32
  special = true
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = local.name
  cidr = var.vpc_cidr

  azs             = local.azs
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets
  intra_subnets   = var.intra_subnets

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment == "staging"
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Enable VPC flow logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_iam_role  = true
  create_flow_log_cloudwatch_log_group = true

  # EKS cluster requirements
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }

  tags = local.tags
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = local.name
  cluster_version = var.kubernetes_version

  cluster_endpoint_public_access           = true
  cluster_endpoint_private_access          = true
  cluster_endpoint_public_access_cidrs     = var.cluster_endpoint_public_access_cidrs
  cluster_additional_security_group_ids    = [aws_security_group.additional.id]

  # OIDC Identity provider
  cluster_identity_providers = {
    sts = {
      client_id = "sts.amazonaws.com"
    }
  }

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.intra_subnets

  # EKS Managed Node Groups
  eks_managed_node_groups = {
    system = {
      instance_types = var.system_node_instance_types
      capacity_type  = "ON_DEMAND"
      
      min_size     = 2
      max_size     = 6
      desired_size = 3

      labels = {
        role = "system"
      }

      taints = [
        {
          key    = "system"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]
    }

    application = {
      instance_types = var.app_node_instance_types
      capacity_type  = "SPOT"
      
      min_size     = 3
      max_size     = 20
      desired_size = 6

      labels = {
        role = "application"
      }
    }

    ml_workloads = {
      instance_types = var.ml_node_instance_types
      capacity_type  = "ON_DEMAND"
      
      min_size     = 1
      max_size     = 8
      desired_size = 2

      labels = {
        role = "ml"
        "nvidia.com/gpu" = "true"
      }

      ami_type = "AL2_x86_64_GPU"

      taints = [
        {
          key    = "nvidia.com/gpu"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]
    }
  }

  # aws-auth configmap
  manage_aws_auth_configmap = true
  aws_auth_roles = [
    {
      rolearn  = module.eks_admins_iam_role.iam_role_arn
      username = "eks-admin"
      groups   = ["system:masters"]
    },
  ]

  tags = local.tags
}

# Additional security group for EKS
resource "aws_security_group" "additional" {
  name_prefix = "${local.name}-additional"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}

# RDS PostgreSQL
module "rds" {
  source = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${local.name}-postgres"

  engine            = "postgres"
  engine_version    = "16.3"
  instance_class    = var.postgres_instance_class
  allocated_storage = var.postgres_allocated_storage
  storage_encrypted = true

  db_name  = "intelgraph"
  username = "postgres"
  password = random_password.postgres_password.result
  port     = "5432"

  iam_database_authentication_enabled = true

  vpc_security_group_ids = [aws_security_group.postgres.id]

  monitoring_interval    = 60
  monitoring_role_name   = "${local.name}-postgres-monitoring"
  create_monitoring_role = true

  # DB subnet group
  create_db_subnet_group = true
  subnet_ids             = module.vpc.private_subnets

  # DB parameter group
  family = "postgres16"

  # DB option group
  major_engine_version = "16"

  # Database Deletion Protection
  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"

  # Backup
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  # Enhanced Monitoring
  performance_insights_enabled = true
  performance_insights_retention_period = var.environment == "production" ? 7 : 1

  tags = local.tags
}

# RDS Security Group
resource "aws_security_group" "postgres" {
  name_prefix = "${local.name}-postgres"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, {
    Name = "${local.name}-postgres"
  })
}

# ElastiCache Redis
module "redis" {
  source = "terraform-aws-modules/elasticache/aws"
  version = "~> 1.0"

  replication_group_id         = "${local.name}-redis"
  description                  = "Redis cluster for IntelGraph"
  
  engine_version               = "7.0"
  port                         = 6379
  parameter_group_name         = "default.redis7"
  node_type                    = var.redis_node_type
  num_cache_clusters           = var.environment == "production" ? 3 : 2

  # Subnet group
  subnet_group_name = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  # Backup
  snapshot_retention_limit = var.environment == "production" ? 7 : 1
  snapshot_window         = "03:00-05:00"

  # Security
  auth_token                 = random_password.redis_auth_token.result
  transit_encryption_enabled = true
  at_rest_encryption_enabled = true

  tags = local.tags
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name}-redis"
  subnet_ids = module.vpc.private_subnets

  tags = local.tags
}

resource "aws_security_group" "redis" {
  name_prefix = "${local.name}-redis"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, {
    Name = "${local.name}-redis"
  })
}

resource "random_password" "redis_auth_token" {
  length  = 32
  special = false
}

# OpenSearch
module "opensearch" {
  source = "terraform-aws-modules/opensearch/aws"
  version = "~> 1.0"

  domain_name    = local.name
  engine_version = "OpenSearch_2.13"

  cluster_config = {
    instance_type            = var.opensearch_instance_type
    instance_count           = var.environment == "production" ? 3 : 2
    dedicated_master_enabled = var.environment == "production"
    master_instance_type     = var.environment == "production" ? "m6g.medium.search" : null
    master_instance_count    = var.environment == "production" ? 3 : null
    zone_awareness_enabled   = var.environment == "production"
  }

  ebs_options = {
    ebs_enabled = true
    volume_size = var.opensearch_volume_size
    volume_type = "gp3"
  }

  encrypt_at_rest = {
    enabled = true
  }

  node_to_node_encryption = {
    enabled = true
  }

  domain_endpoint_options = {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  vpc_options = {
    subnet_ids         = module.vpc.private_subnets
    security_group_ids = [aws_security_group.opensearch.id]
  }

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action   = "es:*"
        Resource = "arn:aws:es:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:domain/${local.name}/*"
        Condition = {
          IpAddress = {
            "aws:sourceIp" = [var.vpc_cidr]
          }
        }
      }
    ]
  })

  tags = local.tags
}

resource "aws_security_group" "opensearch" {
  name_prefix = "${local.name}-opensearch"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, {
    Name = "${local.name}-opensearch"
  })
}

# Local values
locals {
  name = "${var.project_name}-${var.environment}"
  azs  = slice(data.aws_availability_zones.available.names, 0, 3)

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Terraform   = "true"
    Owner       = var.owner
  }
}