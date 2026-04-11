variable "yc_cloud_id" {
  description = "Yandex Cloud ID (e.g., b1g...). Set via TF_VAR_yc_cloud_id or yc.tfvars."
  type        = string
}

variable "yc_folder_id" {
  description = "Yandex Cloud folder ID for staging environment."
  type        = string
}

variable "yc_zone" {
  description = "Availability zone."
  type        = string
  default     = "ru-central1-a"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "staging"
}

variable "project_name" {
  description = "Project name used for naming and tagging."
  type        = string
  default     = "archflow"
}

variable "labels" {
  description = "Common labels applied to all resources."
  type        = map(string)
  default = {
    project     = "archflow"
    environment = "staging"
    managed_by  = "terraform"
  }
}

# --- Network ---
variable "subnet_cidr" {
  type    = string
  default = "10.20.0.0/24"
}

# --- Postgres ---
variable "pg_version" {
  type    = string
  default = "16"
}

variable "pg_preset" {
  description = "Resource preset (see https://cloud.yandex.com/docs/managed-postgresql/concepts/instance-types)"
  type        = string
  default     = "s2.micro" # 2 vCPU, 8 GB — minimum for staging
}

variable "pg_disk_size_gb" {
  type    = number
  default = 20
}

variable "pg_user_password" {
  description = "Password for staging postgres user (set via TF_VAR_pg_user_password, never commit)."
  type        = string
  sensitive   = true
}

# --- Object Storage ---
variable "storage_bucket_name" {
  description = "S3 bucket name (globally unique)."
  type        = string
  default     = "archflow-staging-files"
}

# --- Container Registry ---
variable "registry_name" {
  type    = string
  default = "archflow-registry"
}
