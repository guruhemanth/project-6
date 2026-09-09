# 🚀 CI/CD Pipeline & Security VAPT Architecture

This document details the automated **GitHub Actions CI/CD Pipeline** with built-in **Linting, Automated Testing, Security VAPT Scanning, Docker Hub/ECR Login, and Zero-Downtime AWS Deployment**.

---

## 📑 1. Pipeline Stages & Execution Flow

```mermaid
flowchart TD
    Push["🎯 Git Push to main/master"] --> Stage1["Stage 1: 🔍 Code Linting & Quality Gate"]
    
    subgraph "Stage 1: Code Linting"
        Stage1 --> LintServer["Node.js Syntax & Compilation Check"]
        Stage1 --> LintClient["Vite Production Build Typecheck"]
    end

    Stage1 --> Stage2["Stage 2: 🧪 Automated Testing"]
    
    subgraph "Stage 2: Automated Testing (PostgreSQL Service Container)"
        Stage2 --> DBInit["Run init-db.sql (Triggers + Tables)"]
        Stage2 --> RunTests["Execute 34 Node Native Integration Tests (100% Pass)"]
    end

    Stage2 --> Stage3["Stage 3: 🛡️ Security & VAPT Scanning"]

    subgraph "Stage 3: Security & VAPT (Vulnerability Assessment & Penetration Testing)"
        Stage3 --> SCA["npm audit (Software Composition Analysis)"]
        Stage3 --> SAST["Semgrep SAST (OWASP Top 10 & Node.js Rules)"]
        Stage3 --> SecretScan["Gitleaks (Secret & Token Leak Scanner)"]
        Stage3 --> Trivy["Aqua Trivy (Container Image VAPT & OS CVE Scan)"]
    end

    Stage3 --> Stage4["Stage 4: 🚀 AWS Deployment (CD)"]

    subgraph "Stage 4: AWS Multi-Service Deployment"
        Stage4 --> AWSLogin["AWS Configure Credentials (STS)"]
        Stage4 --> ECRLogin["Amazon ECR Docker Login"]
        Stage4 --> PushDocker["Build & Push Docker Image (latest + SHA)"]
        Stage4 --> DeployECS["AWS ECS Fargate Zero-Downtime Rolling Update"]
        Stage4 --> DeployS3["Deploy Frontend React Build to Amazon S3"]
        Stage4 --> InvalidateCF["Invalidate CloudFront Edge CDN Cache"]
    end
```

---

## 🛡️ 2. Security & VAPT Tools Breakdown

| Security Check | Tool Used | What It Scans For |
|---|---|---|
| **Software Composition Analysis (SCA)** | `npm audit` | Scans for known Common Vulnerabilities and Exposures (CVEs) in third-party npm packages. |
| **Static Application Security Testing (SAST)** | **Semgrep** (`p/security-audit`, `p/owasp-top-ten`) | Code scanning for SQL injection, XSS, insecure JWT usage, command injection, and authorization bypasses. |
| **Secret & Credential Detection** | **Gitleaks** | Prevents accidental leaks of AWS Access Keys, JWT secrets, database passwords, and private SSH keys in git commits. |
| **Container Image VAPT** | **Aqua Trivy** | Scans Docker images (`server` and `client`) for Linux Alpine OS-level vulnerabilities and embedded library CVEs. |

---

## 🔑 3. Required GitHub Repository Secrets

To enable automatic deployment, configure the following secrets in your GitHub repository (**Settings ➔ Secrets and variables ➔ Actions**):

| GitHub Secret Name | Description | Example Value |
|---|---|---|
| **`AWS_ACCESS_KEY_ID`** | IAM User Access Key ID with deployment permissions | `AKIAIOSFODNN7EXAMPLE` |
| **`AWS_SECRET_ACCESS_KEY`** | IAM User Secret Access Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| **`CLOUDFRONT_DISTRIBUTION_ID`** | CloudFront Distribution ID for edge cache invalidation | `E1A2B3C4D5E6F7` |
| **`VITE_API_URL`** *(Optional)* | Custom domain API URL for React build | `https://api.yourdomain.com` |
| **`VITE_SOCKET_URL`** *(Optional)* | Custom domain WebSocket URL for React build | `https://api.yourdomain.com` |

---

## 💻 4. Pipeline Configuration File

Workflow location: **[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)**
