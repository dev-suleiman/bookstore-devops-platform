output "ecr_repository_url" {
  description = "URL of the bookstore ECR repository."
  value       = module.ecr.repository_url
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster."
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "API endpoint of the EKS cluster."
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "Private endpoint of the PostgreSQL database."
  value       = module.rds.endpoint
}

output "github_actions_role_arn" {
  description = "IAM role assumed by GitHub Actions."
  value       = module.iam.github_actions_role_arn
}

output "aws_load_balancer_controller_role_arn" {
  description = "IAM role for the AWS Load Balancer Controller service account."
  value       = module.iam.aws_load_balancer_controller_role_arn
}
