resource "aws_secretsmanager_secret" "rds_credentials" {
  name                    = "${var.name}/rds/credentials"
  description             = "Credentials for the ${var.name} PostgreSQL database"
  recovery_window_in_days = 0

  tags = {
    Name      = "${var.name}-rds-credentials"
    Project   = "bookstore"
    ManagedBy = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "rds_credentials" {
  secret_id = aws_secretsmanager_secret.rds_credentials.id

  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    database = var.db_name
    host     = var.db_host

  })
}

resource "aws_secretsmanager_secret" "app_credentials" {
  name                    = "${var.name}/app/credentials"
  description             = "Application secrets for the ${var.name} bookstore"
  recovery_window_in_days = 0

  tags = {
    Name      = "${var.name}-app-credentials"
    Project   = "bookstore"
    ManagedBy = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "app_credentials" {
  secret_id = aws_secretsmanager_secret.app_credentials.id

  secret_string = jsonencode({
    JWT_SECRET = var.jwt_secret
  })
}