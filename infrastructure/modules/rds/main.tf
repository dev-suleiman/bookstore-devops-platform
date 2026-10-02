resource "aws_security_group" "database" {
  name        = "${var.name}-rds"
  description = "Private PostgreSQL access from EKS nodes"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from EKS nodes"
    protocol        = "tcp"
    from_port       = 5432
    to_port         = 5432
    security_groups = [var.eks_node_security_group_id]
  }

  egress {
    description = "Database outbound access"
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "${var.name}-rds"
    Project   = "bookstore"
    ManagedBy = "terraform"
  }
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db-subnets"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name      = "${var.name}-db-subnets"
    Project   = "bookstore"
    ManagedBy = "terraform"
  }
}

resource "aws_secretsmanager_secret" "credentials" {
  name                    = "${var.name}/rds/credentials"
  description             = "Credentials for the ${var.name} PostgreSQL database"
  recovery_window_in_days = 7

  tags = {
    Name      = "${var.name}-rds-credentials"
    Project   = "bookstore"
    ManagedBy = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "credentials" {
  secret_id = aws_secretsmanager_secret.credentials.id
  secret_string = jsonencode({
    username = "bookstore"
    password = var.db_password
    database = "bookstore"
  })
}

resource "aws_db_instance" "this" {
  identifier                 = var.name
  engine                     = "postgres"
  engine_version             = "16"
  instance_class             = "db.t3.micro"
  allocated_storage          = 20
  max_allocated_storage      = 100
  storage_type               = "gp3"
  storage_encrypted          = true
  db_name                    = "bookstore"
  username                   = "bookstore"
  password                   = var.db_password
  port                       = 5432
  db_subnet_group_name       = aws_db_subnet_group.this.name
  vpc_security_group_ids     = [aws_security_group.database.id]
  publicly_accessible        = false
  multi_az                   = false
  backup_retention_period    = 7
  backup_window              = "03:00-04:00"
  maintenance_window         = "sun:04:00-sun:05:00"
  auto_minor_version_upgrade = true
  deletion_protection        = false
  skip_final_snapshot        = true
  final_snapshot_identifier  = "${var.name}-final-snapshot"

  depends_on = [aws_secretsmanager_secret_version.credentials]

  tags = {
    Name      = var.name
    Project   = "bookstore"
    ManagedBy = "terraform"
  }
}
