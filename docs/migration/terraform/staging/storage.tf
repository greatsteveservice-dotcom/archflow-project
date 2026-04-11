# Object Storage bucket for user files (replaces Supabase Storage).

# Service account + static access key needed to manage buckets.
resource "yandex_iam_service_account" "storage_admin" {
  folder_id = var.yc_folder_id
  name      = "${var.project_name}-${var.environment}-storage-admin"
}

resource "yandex_resourcemanager_folder_iam_member" "storage_admin_editor" {
  folder_id = var.yc_folder_id
  role      = "storage.editor"
  member    = "serviceAccount:${yandex_iam_service_account.storage_admin.id}"
}

resource "yandex_iam_service_account_static_access_key" "storage_admin_key" {
  service_account_id = yandex_iam_service_account.storage_admin.id
  description        = "Static key for managing ArchFlow ${var.environment} bucket"
}

resource "yandex_storage_bucket" "files" {
  bucket     = var.storage_bucket_name
  folder_id  = var.yc_folder_id
  access_key = yandex_iam_service_account_static_access_key.storage_admin_key.access_key
  secret_key = yandex_iam_service_account_static_access_key.storage_admin_key.secret_key

  default_storage_class = "STANDARD"
  max_size              = 107374182400 # 100 GB soft cap for staging

  versioning {
    enabled = true
  }

  lifecycle_rule {
    id      = "expire-old-versions"
    enabled = true

    noncurrent_version_expiration {
      days = 30
    }
  }

  cors_rule {
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["https://staging.archflow.ru", "http://localhost:3000"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }

  anonymous_access_flags {
    read        = false
    list        = false
    config_read = false
  }
}

output "storage_bucket_name" {
  value = yandex_storage_bucket.files.bucket
}

output "storage_access_key" {
  value     = yandex_iam_service_account_static_access_key.storage_admin_key.access_key
  sensitive = true
}

output "storage_secret_key" {
  value     = yandex_iam_service_account_static_access_key.storage_admin_key.secret_key
  sensitive = true
}
