# Cloud & infrastructure security

Use when deploying to cloud platforms, configuring infrastructure, managing IAM policies, setting up logging/monitoring, or implementing CI/CD pipelines.

## When to activate

- Deploying applications to cloud platforms
- Configuring IAM roles and permissions
- Setting up CI/CD pipelines
- Implementing infrastructure as code (Terraform, CloudFormation)
- Configuring logging and monitoring
- Managing secrets in cloud environments
- Setting up CDN and edge security
- Implementing disaster recovery and backup strategies

## IAM & access control

Principle of least privilege:

```yaml
# PASS
iam_role:
  permissions: [s3:GetObject, s3:ListBucket]
  resources: [arn:aws:s3:::my-bucket/*]

# FAIL
iam_role:
  permissions: [s3:*]
  resources: ["*"]
```

Verify: no root account usage in production · MFA enabled for all privileged accounts · service accounts use roles, not long-lived credentials · IAM policies follow least privilege · regular access reviews · unused credentials rotated or removed.

## Secrets management

```typescript
// PASS — cloud secrets manager
import { SecretsManager } from '@aws-sdk/client-secrets-manager'
const client = new SecretsManager({ region: 'us-east-1' })
const secret = await client.getSecretValue({ SecretId: 'prod/api-key' })

// FAIL — env var only, not rotated, not audited, for a long-lived production credential
const apiKey = process.env.API_KEY
```

Verify: secrets in a cloud secrets manager · automatic rotation for database credentials · API keys rotated at least quarterly · no secrets in code, logs, or error messages · audit logging on secret access.

## Network security

```terraform
# PASS — restricted security group
resource "aws_security_group" "app" {
  ingress { from_port = 443; to_port = 443; protocol = "tcp"; cidr_blocks = ["10.0.0.0/16"] }
  egress  { from_port = 443; to_port = 443; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"] }
}

# FAIL — open to the internet
resource "aws_security_group" "bad" {
  ingress { from_port = 0; to_port = 65535; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"] }
}
```

Verify: database not publicly accessible · SSH/RDP restricted to VPN/bastion · security groups follow least privilege · network ACLs configured · VPC flow logs enabled.

## Logging & monitoring

Log security events with enough structure to alert on, never with sensitive payloads:

```typescript
const logSecurityEvent = async (event: SecurityEvent) => {
  await cloudwatch.putLogEvents({
    logGroupName: '/aws/security/events',
    logStreamName: 'authentication',
    logEvents: [{ timestamp: Date.now(), message: JSON.stringify({
      type: event.type, userId: event.userId, ip: event.ip, result: event.result
      // never log sensitive data
    }) }]
  })
}
```

Verify: logging enabled for all services · failed auth attempts logged · admin actions audited · retention configured (90+ days for compliance) · alerts on suspicious activity · logs centralized and tamper-proof.

## CI/CD pipeline security

```yaml
name: Deploy
on: { push: { branches: [main] } }
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions: { contents: read }   # minimal permissions
    steps:
      - uses: actions/checkout@v4
      - name: Secret scanning
        uses: trufflesecurity/trufflehog@main
      - name: Audit dependencies
        run: npm audit --audit-level=high
      - name: Configure AWS credentials   # OIDC, not long-lived tokens
        uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: "arn:aws:iam::123456789:role/GitHubActionsRole", aws-region: us-east-1 }
```

Verify: OIDC instead of long-lived credentials · secrets scanning in the pipeline · dependency vulnerability scanning · container image scanning where applicable · branch protection enforced · review required before merge · signed commits enforced where the project requires it.

## CDN & edge security

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    const response = await fetch(request)
    const headers = new Headers(response.headers)
    headers.set('X-Frame-Options', 'DENY')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('Permissions-Policy', 'geolocation=(), microphone=()')
    return new Response(response.body, { status: response.status, headers })
  }
}
```

Verify: WAF enabled with a managed ruleset · rate limiting configured at the edge · bot protection active · DDoS protection enabled · security headers configured · TLS strict mode enabled.

## Backup & disaster recovery

```terraform
resource "aws_db_instance" "main" {
  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  deletion_protection     = true
}
```

Verify: automated daily backups · retention meets compliance requirements · point-in-time recovery enabled · backup restore tested quarterly · disaster recovery plan documented · RPO/RTO defined and tested.

## Common cloud misconfigurations

```bash
# FAIL — public bucket
aws s3api put-bucket-acl --bucket my-bucket --acl public-read
# PASS — private bucket, explicit policy
aws s3api put-bucket-acl --bucket my-bucket --acl private
```

```terraform
# FAIL
resource "aws_db_instance" "bad" { publicly_accessible = true }
# PASS
resource "aws_db_instance" "good" { publicly_accessible = false }
```

## Pre-deployment cloud checklist

- [ ] IAM: root unused, MFA enabled, least-privilege policies
- [ ] Secrets: cloud secrets manager with rotation
- [ ] Network: security groups restricted, no public databases
- [ ] Logging: enabled with retention
- [ ] Monitoring: alerts configured for anomalies
- [ ] CI/CD: OIDC auth, secrets scanning, dependency audits
- [ ] CDN/WAF: enabled with a managed ruleset
- [ ] Encryption: data encrypted at rest and in transit
- [ ] Backups: automated with tested recovery
- [ ] Compliance: applicable requirements (GDPR/HIPAA/etc.) met
- [ ] Documentation: infrastructure documented, runbooks created
- [ ] Incident response plan in place

## Resources

- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [CIS AWS Foundations Benchmark](https://www.cisecurity.org/benchmark/amazon_web_services)
- [OWASP Cloud Security](https://owasp.org/www-project-cloud-security/)
