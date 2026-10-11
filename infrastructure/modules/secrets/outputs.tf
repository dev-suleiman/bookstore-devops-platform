output "rds_credentials_secret_arn" {
  description = "ARN of the RDS credentials secret"
  value       = aws_secretsmanager_secret.rds_credentials.arn
}

output "rds_credentials_secret_name" {
  description = "Name of the RDS credentials secret"
  value       = aws_secretsmanager_secret.rds_credentials.name
}

output "app_credentials_secret_arn" {
  description = "ARN of the application credentials secret"
  value       = aws_secretsmanager_secret.app_credentials.arn
}

output "app_credentials_secret_name" {
  description = "Name of the application credentials secret"
  value       = aws_secretsmanager_secret.app_credentials.name
}