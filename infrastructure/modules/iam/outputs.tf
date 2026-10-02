output "github_actions_role_arn" {
  value = aws_iam_role.github_actions.arn
}

output "github_oidc_provider_arn" {
  value = aws_iam_openid_connect_provider.github.arn
}

output "aws_load_balancer_controller_role_arn" {
  value = aws_iam_role.load_balancer_controller.arn
}
