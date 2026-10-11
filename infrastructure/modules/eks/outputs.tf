output "cluster_name" {
  value = aws_eks_cluster.this.name
}

output "cluster_endpoint" {
  value = aws_eks_cluster.this.endpoint
}

output "cluster_security_group_id" {
  value = aws_eks_cluster.this.vpc_config[0].cluster_security_group_id
}

output "cluster_arn" {
  value = aws_eks_cluster.this.arn
}

output "node_security_group_id" {
  value = aws_security_group.node.id
}

output "oidc_issuer_url" {
  value = aws_iam_openid_connect_provider.cluster.url
}

output "oidc_provider_arn" {
  value = aws_iam_openid_connect_provider.cluster.arn
}
