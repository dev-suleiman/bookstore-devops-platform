module "vpc" {
  source = "./modules/vpc"

  name               = "bookstore"
  cidr               = var.vpc_cidr
  availability_zones = var.availability_zones
}

module "ecr" {
  source = "./modules/ecr"

  name = "bookstore"
}

module "eks" {
  source = "./modules/eks"

  cluster_name       = var.cluster_name
  kubernetes_version = "1.32"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
}

module "rds" {
  source = "./modules/rds"

  name                       = "bookstore"
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  eks_node_security_group_id = module.eks.cluster_security_group_id
  db_username = var.db_username
  db_password = var.db_password
  db_name     = var.db_name
}

module "iam" {
  source = "./modules/iam"

  aws_region              = var.region
  cluster_name            = module.eks.cluster_name
  cluster_oidc_issuer_url = module.eks.oidc_issuer_url
  github_repository       = var.github_repository
  github_branch           = var.github_branch
  github_owner_id         = var.github_owner_id
  github_repository_id    = var.github_repository_id
}

module "secrets" {
  source = "./modules/secrets"

  name = var.project_name

  db_username = var.db_username
  db_password = var.db_password
  db_name     = var.db_name
  db_host     = module.rds.address

  jwt_secret = var.jwt_secret
}