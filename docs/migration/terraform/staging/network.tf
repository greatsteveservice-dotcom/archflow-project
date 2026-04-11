# VPC network + subnet for staging.

resource "yandex_vpc_network" "main" {
  name        = "${var.project_name}-${var.environment}-net"
  description = "ArchFlow ${var.environment} VPC"
  folder_id   = var.yc_folder_id
  labels      = var.labels
}

resource "yandex_vpc_subnet" "main" {
  name           = "${var.project_name}-${var.environment}-subnet-a"
  description    = "ArchFlow ${var.environment} subnet in ${var.yc_zone}"
  folder_id      = var.yc_folder_id
  network_id     = yandex_vpc_network.main.id
  zone           = var.yc_zone
  v4_cidr_blocks = [var.subnet_cidr]
  labels         = var.labels
}

# Security group: allow Postgres only from our folder's internal networks.
resource "yandex_vpc_security_group" "pg" {
  name        = "${var.project_name}-${var.environment}-pg-sg"
  description = "Postgres access control"
  network_id  = yandex_vpc_network.main.id
  folder_id   = var.yc_folder_id
  labels      = var.labels

  ingress {
    description    = "Postgres from Serverless Containers + local (via NAT/VPN)"
    protocol       = "TCP"
    port           = 6432
    v4_cidr_blocks = [var.subnet_cidr]
  }

  egress {
    description    = "All outbound"
    protocol       = "ANY"
    v4_cidr_blocks = ["0.0.0.0/0"]
    from_port      = 0
    to_port        = 65535
  }
}
