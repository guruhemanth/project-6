# ☸️ Kubernetes Deployment Guide: Chandas Collection App

This directory provides production-ready Kubernetes manifests for deploying the full Chandas Collection App stack (PostgreSQL + Express/Socket.io API + React/Nginx SPA).

---

## 📁 Manifest Structure

| File | Resource(s) | Description |
|---|---|---|
| [`00-namespace.yaml`](00-namespace.yaml) | `Namespace` | Creates isolated namespace `chandas` |
| [`01-secret.yaml`](01-secret.yaml) | `Secret` | Database password, JWT secret, and connection string |
| [`02-configmap.yaml`](02-configmap.yaml) | `ConfigMap` | Non-sensitive runtime variables (`PORT`, `DB_HOST`, `NODE_ENV`) |
| [`03-postgres.yaml`](03-postgres.yaml) | `StatefulSet` + `PVC` + `Service` | PostgreSQL 16 with persistent storage & `pg_isready` probes |
| [`04-server.yaml`](04-server.yaml) | `Deployment` + `Service` | Node.js/Express server (2 replicas, init-container DB check, health probes) |
| [`05-client.yaml`](05-client.yaml) | `Deployment` + `Service` | React/Nginx frontend (2 replicas, NodePort `30080`) |
| [`06-ingress.yaml`](06-ingress.yaml) | `Ingress` | NGINX Ingress routing `/api` and `/socket.io` to backend and `/` to frontend |
| [`kustomization.yaml`](kustomization.yaml) | `Kustomization` | Bundles all resources for 1-command deployment |

---

## 🚀 Quick Start Deployment

### 1. Build and Load Docker Images (if running local Kind / Minikube)
```bash
# From project root:
docker build -t chandas-server:latest -f approach_2_ec2/server/Dockerfile approach_2_ec2/server
docker build -t chandas-client:latest -f approach_2_ec2/client/Dockerfile approach_2_ec2/client

# If using Kind cluster:
kind load docker-image chandas-server:latest --name multi-node
kind load docker-image chandas-client:latest --name multi-node
```

### 2. Deploy Everything via Kustomize
```bash
kubectl apply -k k8s/
```

### 3. Check Deployment Status
```bash
kubectl -n chandas get all
kubectl -n chandas get pvc
```

### 4. Access the Application
- **Frontend SPA**: `http://<Node-IP>:30080` (or `http://localhost:30080` if port-forwarded)
- **Port Forwarding (Development)**:
  ```bash
  # Forward Frontend:
  kubectl -n chandas port-forward svc/chandas-client-service 8080:80

  # Forward Backend API:
  kubectl -n chandas port-forward svc/server-service 5000:5000
  ```

---

## 🧹 Teardown
```bash
kubectl delete -k k8s/
```
