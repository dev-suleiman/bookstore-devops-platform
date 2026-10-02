variable "region" {
  description = "AWS region for the bookstore platform."
  type        = string
  default     = "eu-north-1"
}

variable "cluster_name" {
  description = "Name of the EKS cluster."
  type        = string
  default     = "bookstore-eks"
}

variable "db_password" {
  description = "Master password for the PostgreSQL database. Stored in Secrets Manager."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 16
    error_message = "db_password must be at least 16 characters long."
  }
}

variable "vpc_cidr" {
  description = "CIDR range for the platform VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Exactly two availability zones for the platform."
  type        = list(string)
  default     = ["eu-north-1a", "eu-north-1b"]

  validation {
    condition     = length(var.availability_zones) == 2
    error_message = "Exactly two availability zones are required."
  }
}

variable "github_repository" {
  description = "GitHub repository allowed to assume the deployment role."
  type        = string
  default     = "dev-suleiman/bookstore-devops-platform"
}

variable "github_branch" {
  description = "GitHub branch allowed to assume the deployment role."
  type        = string
  default     = "main"
}
variable "github_owner_id" {
  type = string
}

variable "github_repository_id" {
  type = string
}