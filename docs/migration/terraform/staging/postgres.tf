# Managed PostgreSQL cluster for staging.

resource "yandex_mdb_postgresql_cluster" "main" {
  name        = "${var.project_name}-${var.environment}-pg"
  description = "ArchFlow ${var.environment} Postgres"
  environment = "PRESTABLE" # upgrade to PRODUCTION for prod sprint
  network_id  = yandex_vpc_network.main.id
  folder_id   = var.yc_folder_id
  labels      = var.labels

  config {
    version = var.pg_version

    resources {
      resource_preset_id = var.pg_preset
      disk_type_id       = "network-ssd"
      disk_size          = var.pg_disk_size_gb
    }

    postgresql_config = {
      max_connections                = 200
      enable_parallel_hash           = true
      autovacuum_vacuum_scale_factor = 0.2
      log_min_duration_statement     = 1000
    }

    backup_window_start {
      hours   = 2
      minutes = 0
    }
  }

  host {
    zone             = var.yc_zone
    subnet_id        = yandex_vpc_subnet.main.id
    assign_public_ip = false
  }

  security_group_ids = [yandex_vpc_security_group.pg.id]

  maintenance_window {
    type = "ANYTIME"
  }
}

resource "yandex_mdb_postgresql_database" "archflow" {
  cluster_id = yandex_mdb_postgresql_cluster.main.id
  name       = "archflow"
  owner      = yandex_mdb_postgresql_user.archflow.name
  lc_collate = "en_US.UTF-8"
  lc_type    = "en_US.UTF-8"
}

resource "yandex_mdb_postgresql_user" "archflow" {
  cluster_id = yandex_mdb_postgresql_cluster.main.id
  name       = "archflow"
  password   = var.pg_user_password
  conn_limit = 100

  permission {
    database_name = "archflow"
  }
}

output "pg_cluster_id" {
  value = yandex_mdb_postgresql_cluster.main.id
}

output "pg_host_fqdn" {
  value = tolist(yandex_mdb_postgresql_cluster.main.host)[0].fqdn
}
