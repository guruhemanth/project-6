# 🛠️ Project-6 Engineering Log: Issues, Root Causes & Resolutions

This document provides a comprehensive post-mortem and technical reference for all the challenges and issues encountered during the development, CI/CD pipeline automation, container hardening, and AWS production deployment of **Project-6 (Chandas Collection App)**.

---

## 📋 Table of Contents
1. [Docker & Container Security (VAPT / Trivy)](#1-docker--container-security-vapt--trivy)
2. [Jenkins Pipeline & Directory Configuration](#2-jenkins-pipeline--directory-configuration)
3. [PostgreSQL Client & Container Tooling](#3-postgresql-client--container-tooling)
4. [Docker-in-Docker Network Isolation & DNS](#4-docker-in-docker-network-isolation--dns)
5. [Environment Variables & Dotenv Precedence](#5-environment-variables--dotenv-precedence)
6. [PostgreSQL Readiness Check Race Condition](#6-postgresql-readiness-check-race-condition)
7. [GitHub Webhook & Ngrok Port Mapping](#7-github-webhook--ngrok-port-mapping)
8. [Docker Exec Argument Parsing](#8-docker-exec-argument-parsing)
9. [AWS ECS Exec & Task IAM Roles](#9-aws-ecs-exec--task-iam-roles)
10. [Frontend HTTPS / HTTP Mixed Content & CORS](#10-frontend-https--http-mixed-content--cors)
11. [CloudFront WebSocket (WSS) Proxying](#11-cloudfront-websocket-wss-proxying)

---

## 1. Docker & Container Security (VAPT / Trivy)

### 🔴 Issue 1.1: Alpine Base Image OpenSSL CVEs & npm Engine Mismatch
* **Symptoms**: 
  1. Trivy reported High/Critical CVEs (`libcrypto3`, `libssl3`) on the default Alpine base image.
  2. Attempting `npm install -g npm@latest` on `node:20-alpine` threw:
     ```text
     npm error code EBADENGINE
     npm error notsup Required: {"node":"^22.22.2 || ^24.15.0 || >=26.0.0"}
     npm error notsup Actual: {"npm":"10.8.2","node":"v20.20.2"}
     ```
* **Root Cause**: `npm@latest` installed npm v12 which requires Node.js v22+.
* **Resolution**: 
  1. Upgraded base image to `node:22-alpine`.
  2. Added `apk update && apk upgrade --no-cache` to patch OS-level libraries.

### 🔴 Issue 1.2: Base Image npm Toolchain Vulnerabilities in Production
* **Symptoms**: Trivy flagged multiple vulnerabilities in `/usr/local/lib/node_modules/npm` (e.g. `cross-spawn`, `tar`, `glob`).
* **Root Cause**: The official Node.js image bundles CLI package manager tools that are only needed during build time, not in production runtime.
* **Resolution**: Refactored `server/Dockerfile` into a **Multi-Stage Build**:
  ```dockerfile
  # Stage 1: Builder (installs node_modules)
  FROM node:22-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production

  # Stage 2: Runtime (completely purges npm/yarn/corepack)
  FROM node:22-alpine
  WORKDIR /app
  RUN apk update && apk upgrade --no-cache && \
      rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn*
  COPY --from=builder /app/node_modules ./node_modules
  COPY src/ ./src/
  USER node
  CMD ["node", "src/server.js"]
  ```
  *Result: 100% clean Trivy VAPT scan with 0 CVEs and image shrunk by ~40 MB.*

---

## 2. Jenkins Pipeline & Directory Configuration

### 🔴 Issue 2.1: `npm error code EUSAGE` (Missing `package-lock.json`)
* **Symptoms**:
  ```text
  npm error The `npm ci` command can only install with an existing package-lock.json
  ```
* **Root Cause**: In Jenkins, the Git repository root contained a subfolder `collection-app/`. The pipeline ran `dir('server')` and `dir('client')` at the root, which was empty.
* **Resolution**: Updated all directory paths across `Jenkinsfile.ci` and `Jenkinsfile.cd` to `dir('collection-app/server')` and `dir('collection-app/client')` and added a fallback:
  ```bash
  if [ -f package-lock.json ]; then npm ci; else npm install; fi
  ```

### 🔴 Issue 2.2: Pipeline DSL Typo `lpipeline`
* **Symptoms**:
  ```text
  java.lang.NoSuchMethodError: No such DSL method 'lpipeline' found among steps
  ```
* **Root Cause**: Accidental keystroke on line 1 of `Jenkinsfile.ci` (`lpipeline {`).
* **Resolution**: Corrected `lpipeline {` to `pipeline {`.

---

## 3. PostgreSQL Client & Container Tooling

### 🔴 Issue 3.1: Host `psql` Binary Incompatible Inside Jenkins Container
* **Symptoms**:
  ```text
  psql: error while loading shared libraries: libpq.so.private18-5: cannot open shared object file
  ```
* **Root Cause**: Copying the `psql` binary from the host (Fedora Linux) failed because the Jenkins container runs Debian Linux, which has different glibc and OpenSSL dynamic library names.
* **Resolution**: Installed native Debian PostgreSQL client packages inside the Jenkins container:
  ```bash
  sudo docker exec -u 0 jenkins apt-get update && sudo docker exec -u 0 jenkins apt-get install -y postgresql-client
  ```

---

## 4. Docker-in-Docker Network Isolation & DNS

### 🔴 Issue 4.1: `could not translate host name "chandas-test-db"`
* **Symptoms**:
  ```text
  psql: error: could not translate host name "chandas-test-db" to address: Name or service not known
  ```
* **Root Cause**: The Jenkins container was running on a custom bridge network (`jenkins-docker_default`), while the test PostgreSQL container started on the default `bridge` network. Docker DNS does not route between isolated networks.
* **Resolution**: Dynamically inspected Jenkins's network name and attached the database to the same network with a network alias:
  ```bash
  JENKINS_NET=$(docker inspect ${HOSTNAME} --format '{{range $net, $v := .NetworkSettings.Networks}}{{$net}}{{end}}' 2>/dev/null || echo "jenkins-docker_default")

  docker run -d \
      --name chandas-test-db \
      --network "${JENKINS_NET}" \
      --network-alias chandas-test-db \
      -e POSTGRES_DB=collection_db \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=testpassword123 \
      postgres:16-alpine
  ```

---

## 5. Environment Variables & Dotenv Precedence

### 🔴 Issue 5.1: `connect ECONNREFUSED 127.0.0.1:5432` During CI Testing
* **Symptoms**: Node.js test server failed to connect to `chandas-test-db:5432` and kept attempting to connect to `127.0.0.1:5432`.
* **Root Cause**: `server/src/config/db.js` had `dotenv.config({ override: true });`. This forcibly overwrote `process.env.DATABASE_URL` passed by Jenkins with the default `localhost:5432` value from the local `.env` file.
* **Resolution**: Changed to standard `dotenv.config();` (without `{ override: true }`) so container and CLI environment variables take highest precedence.

### 🔴 Issue 5.2: Node Integration Tests `fetch failed` on Port 5099
* **Symptoms**: All 34 integration tests failed with `TypeError: fetch failed`.
* **Root Cause**: `server/src/server.js` also had `dotenv.config({ override: true });`, overriding `PORT=5099` back to `PORT=5000`. The server listened on 5000 while the test suite sent requests to 5099.
* **Resolution**: Removed `{ override: true }` from `server/src/server.js`.

---

## 6. PostgreSQL Readiness Check Race Condition

### 🔴 Issue 6.1: `Connection refused` immediately after `pg_isready` passed
* **Symptoms**:
  ```text
  /var/run/postgresql:5432 - accepting connections
  ✅ PostgreSQL is ready!
  psql: error: connection to server at "chandas-test-db" (172.21.0.3), port 5432 failed: Connection refused
  ```
* **Root Cause**: `docker exec ... pg_isready` only tested the internal local Unix socket (`/var/run/postgresql`), which opens 1–2 seconds before the TCP network listener binds to port 5432.
* **Resolution**: Changed the health check loop to test TCP connectivity directly across the network:
  ```bash
  for i in $(seq 1 30); do
      if pg_isready -h chandas-test-db -p 5432 -U postgres -d collection_db; then
          echo "✅ PostgreSQL TCP network is ready!"
          break
      fi
      sleep 1
  done
  ```

---

## 7. GitHub Webhook & Ngrok Port Mapping

### 🔴 Issue 7.1: GitHub Webhook `502 Bad Gateway`
* **Symptoms**: GitHub Webhook deliveries failed with HTTP `502 Bad Gateway`.
* **Root Cause**: Ngrok was forwarding traffic to port `5173` (Vite dev server) instead of port `9090` (Jenkins container).
* **Resolution**: Restarted ngrok pointing to Jenkins: `ngrok http 9090`.

---

## 8. Docker Exec Argument Parsing

### 🔴 Issue 8.1: `unable to start container process: exec: "PGPASSWORD=testpass"`
* **Symptoms**:
  ```text
  OCI runtime exec failed: exec failed: unable to start container process: exec: "PGPASSWORD=testpass": executable file not found in $PATH
  ```
* **Root Cause**: `docker exec` does not spawn a bash shell by default; it treated `PGPASSWORD=testpass` as the binary command name.
* **Resolution**: Used Docker's `-e` flag:
  ```bash
  sudo docker exec -e PGPASSWORD=testpass jenkins psql -h pg-net-test -p 5432 -U postgres -d testdb -c "SELECT 1;"
  ```

---

## 9. AWS ECS Exec & Task IAM Roles

### 🔴 Issue 9.1: `Unable to start session because the container doesn’t exist`
* **Symptoms**: Running `aws ecs execute-command --container "chandas-server"` threw invalid parameter errors.
* **Root Cause**: In `ecs.tf`, the container definition name was `server`, not `chandas-server`.
* **Resolution**: Passed the exact name `--container "server"`.

### 🔴 Issue 9.2: `taskRoleArn is not being used` for ECS Exec
* **Symptoms**:
  ```text
  The service couldn't be updated because a valid taskRoleArn is not being used. Specify a valid task role in your task definition and try again.
  ```
* **Root Cause**: ECS Exec requires an **IAM Task Role** with SSM permissions (`ssmmessages:*`) attached to the task definition, in addition to the Execution Role.
* **Resolution**: In `terraform/ecs.tf`:
  1. Created `aws_iam_role.ecs_task_role`.
  2. Attached `ssmmessages:CreateControlChannel`, `ssmmessages:CreateDataChannel`, `ssmmessages:OpenControlChannel`, `ssmmessages:OpenDataChannel`.
  3. Attached `task_role_arn = aws_iam_role.ecs_task_role.arn` to `aws_ecs_task_definition.server`.
  4. Added `enable_execute_command = true` on `aws_ecs_service.server`.

---

## 10. Frontend HTTPS / HTTP Mixed Content & CORS

### 🔴 Issue 10.1: Browser `mixed-content` Blocking & Axios Network Errors
* **Symptoms**:
  ```text
  Mixed Content: The page at 'https://dna2udizkrgzf.cloudfront.net/' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://chandas-alb.../api/auth/login'. This request has been blocked; the content must be served over HTTPS.
  ```
* **Root Cause**: React frontend was loaded over CloudFront HTTPS, while API calls were targeting the Application Load Balancer directly over insecure HTTP Port 80.
* **Resolution**: Configured **CloudFront Unified HTTPS Routing**:
  1. Added `ALBOrigin` to `terraform/s3_cloudfront.tf`.
  2. Added an `ordered_cache_behavior` for `/api/*` forwarding directly to the ALB.
  3. Set `VITE_API_URL=""` in `client/.env.production` so all API requests use relative paths (`/api/auth/login`, `/api/records`).

---

## 11. CloudFront WebSocket (WSS) Proxying

### 🔴 Issue 11.1: `WebSocket connection to 'wss://.../socket.io/' failed`
* **Symptoms**: Live Socket.io updates failed with WebSocket connection errors in the browser console.
* **Root Cause**: CloudFront was only proxying `/api/*` to the ALB. Requests to `/socket.io/*` fell back to the default S3 origin, which does not handle WebSockets.
* **Resolution**: In `terraform/s3_cloudfront.tf`, added a dedicated cache behavior for `/socket.io/*`:
  ```hcl
  ordered_cache_behavior {
    path_pattern     = "/socket.io/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALBOrigin"

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = false # Prevents buffering on live bidirectional socket streams
  }
  ```

---

## 📊 Summary of Final Production Stack

| Component | Technology | Configuration / Status |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite + Tailwind CSS | Hosted on Amazon S3 via Amazon CloudFront CDN (HTTPS) |
| **Backend** | Node.js 22 + Express + Socket.io | 2 x AWS ECS Fargate Tasks in Private Subnets with ALB |
| **Database** | Amazon RDS PostgreSQL 16 | Multi-tenant RLS, Automated Schema Migrations & Triggers |
| **CI Pipeline** | Jenkins (`Jenkinsfile.ci`) | Parallel Linting, Docker-in-Docker Integration Tests, Gitleaks, Semgrep, Trivy VAPT |
| **CD Pipeline** | Jenkins (`Jenkinsfile.cd`) | Docker Build/Push to ECR, ECS Rolling Update, S3 Sync & CloudFront Invalidation |
| **IaC** | Terraform | Complete VPC, ALB, ECS, RDS, Secrets Manager, S3 & CloudFront definitions |
