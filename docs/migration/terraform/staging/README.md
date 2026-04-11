# Terraform — Staging (Yandex Cloud)

**Status**: 🟡 Skeleton only — не применять до получения Yandex Cloud аккаунта.

Настраивает staging окружение в Yandex Cloud:
- VPC network + subnet в `ru-central1-a`
- Security group для Postgres
- Managed PostgreSQL 16 (1 host, s2.micro, 20 GB SSD)
- Object Storage bucket `archflow-staging-files` с versioning
- Container Registry для Next.js Docker образов
- Service accounts: storage-admin, ci-pusher

## Prerequisites

1. Yandex Cloud account created, OAuth token obtained
2. Folder в рамках cloud, получить `cloud_id` и `folder_id`
3. Terraform `>= 1.6` установлен (`brew install terraform`)
4. `yc` CLI установлен (`brew install yandex-cloud/yc/yc`), `yc init` выполнен

## Setup

```bash
cd docs/migration/terraform/staging/

# Create tfvars with secrets (NEVER commit!)
cat > terraform.tfvars.local <<EOF
yc_cloud_id      = "b1g..."
yc_folder_id     = "b1g..."
pg_user_password = "$(openssl rand -base64 24)"
EOF
chmod 600 terraform.tfvars.local

# Export YC token (or set profile in yc config)
export YC_TOKEN=$(yc iam create-token)

terraform init
terraform plan -var-file=terraform.tfvars.local -out=plan.out
terraform apply plan.out
```

## Outputs

После `apply` сохранятся в `terraform.tfstate`:
- `pg_host_fqdn` — FQDN Postgres мастера
- `storage_bucket_name`, `storage_access_key`, `storage_secret_key`
- `registry_hostname` — `cr.yandex/<id>`

Получить:
```bash
terraform output pg_host_fqdn
terraform output -raw storage_secret_key  # sensitive
```

## Estimated Cost (staging)

| Resource | Cost/mo (RUB, approx.) |
|----------|------------------------|
| Postgres s2.micro + 20 GB SSD | ~1500 |
| Object Storage 50 GB + traffic | ~300 |
| Container Registry 10 GB | ~100 |
| VPC (free tier) | 0 |
| **Total** | **~1900 ₽/мес** |

## Security

- `terraform.tfvars.local` в `.gitignore` — никогда не коммитим
- `terraform.tfstate` содержит plaintext secrets → по возможности переключиться на remote state (S3 backend) с шифрованием
- Service account keys хранить в 1Password / Bitwarden
- Postgres нет public IP → доступ через VPN или через Serverless Containers в той же подсети
