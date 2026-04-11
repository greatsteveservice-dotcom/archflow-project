# Yandex Container Registry for Next.js app images.

resource "yandex_container_registry" "main" {
  name      = var.registry_name
  folder_id = var.yc_folder_id
  labels    = var.labels
}

# Service account that can push images from GitHub Actions CI.
resource "yandex_iam_service_account" "ci_pusher" {
  folder_id = var.yc_folder_id
  name      = "${var.project_name}-ci-pusher"
}

resource "yandex_container_registry_iam_binding" "ci_pusher_writer" {
  registry_id = yandex_container_registry.main.id
  role        = "container-registry.images.pusher"
  members     = ["serviceAccount:${yandex_iam_service_account.ci_pusher.id}"]
}

resource "yandex_iam_service_account_static_access_key" "ci_pusher_key" {
  service_account_id = yandex_iam_service_account.ci_pusher.id
  description        = "CI pusher static key (use OAuth/IAM token in GH Actions ideally)"
}

output "registry_id" {
  value = yandex_container_registry.main.id
}

output "registry_hostname" {
  value = "cr.yandex/${yandex_container_registry.main.id}"
}
