terraform {
  required_version = ">= 1.6"

  required_providers {
    yandex = {
      source  = "yandex-cloud/yandex"
      version = "~> 0.120"
    }
  }

  # Backend: local for now, switch to yandex object storage state once bucket exists
  # backend "s3" {
  #   endpoints = { s3 = "https://storage.yandexcloud.net" }
  #   bucket    = "archflow-tfstate"
  #   region    = "ru-central1"
  #   key       = "staging/terraform.tfstate"
  #   skip_region_validation      = true
  #   skip_credentials_validation = true
  #   skip_requesting_account_id  = true
  # }
}

provider "yandex" {
  # Auth via: yc config profile create + YC_TOKEN / YC_CLOUD_ID / YC_FOLDER_ID env vars
  zone = var.yc_zone
}
