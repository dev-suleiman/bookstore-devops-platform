provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "bookstore"
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
