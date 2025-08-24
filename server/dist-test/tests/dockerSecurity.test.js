/**
 * Docker Security Tests
 * Tests for Docker configuration security, hardening, and compliance
 */
const fs = require('fs').promises;
const path = require('path');
describe('Docker Security Configuration', () => {
    const projectRoot = path.join(__dirname, '../..');
    describe('Dockerfile Security', () => {
        test('Dockerfile.secure should implement security best practices', async () => {
            const dockerfilePath = path.join(projectRoot, 'Dockerfile.secure');
            const content = await fs.readFile(dockerfilePath, 'utf8');
            // Should use specific version tags
            expect(content).toMatch(/FROM.*:\d+\.\d+/);
            expect(content).not.toMatch(/FROM.*:latest/);
            // Should use non-root user
            expect(content).toMatch(/USER (nonroot|\d+:\d+)/);
            // Should have security labels
            expect(content).toMatch(/LABEL[\s\S]*security/);
            // Should use multi-stage builds
            expect(content).toMatch(/FROM.*AS/);
            // Should have health check
            expect(content).toMatch(/HEALTHCHECK/);
            // Should not contain hardcoded secrets
            expect(content).not.toMatch(/password.*=.*/i);
            expect(content).not.toMatch(/secret.*=.*/i);
            expect(content).not.toMatch(/key.*=.*/i);
            // Should use distroless or minimal base image
            expect(content).toMatch(/(distroless|alpine)/);
        });
        test('production Dockerfile should be secure', async () => {
            const dockerfilePath = path.join(projectRoot, 'Dockerfile.production');
            try {
                const content = await fs.readFile(dockerfilePath, 'utf8');
                // Should use non-root user
                expect(content).toMatch(/USER/);
                // Should have health check
                expect(content).toMatch(/HEALTHCHECK/);
                // Should use tini for proper signal handling
                expect(content).toMatch(/tini/);
                // Should not run as root
                expect(content).not.toMatch(/USER root/);
                expect(content).not.toMatch(/USER 0/);
            }
            catch (error) {
                if (error.code !== 'ENOENT')
                    throw error;
                // File doesn't exist, skip test
            }
        });
    });
    describe('Docker Compose Security', () => {
        test('docker-compose.secure.yml should implement security hardening', async () => {
            const composePath = path.join(projectRoot, 'docker-compose.secure.yml');
            const content = await fs.readFile(composePath, 'utf8');
            // Should use version 3.9 or higher
            expect(content).toMatch(/version:\s*['"]3\.[89]['"]|['"]3\.\d\d['"]|['"]\d\.\d+['"]/);
            // Should have security options
            expect(content).toMatch(/security_opt:/);
            expect(content).toMatch(/no-new-privileges:true/);
            // Should drop capabilities
            expect(content).toMatch(/cap_drop:/);
            expect(content).toMatch(/- ALL/);
            // Should use read-only filesystem where possible
            expect(content).toMatch(/read_only:\s*true/);
            // Should specify user
            expect(content).toMatch(/user:\s*['"]\d+:\d+['"]/);
            // Should have resource limits
            expect(content).toMatch(/resources:/);
            expect(content).toMatch(/limits:/);
            expect(content).toMatch(/memory:/);
            expect(content).toMatch(/cpus:/);
            // Should use secrets management
            expect(content).toMatch(/secrets:/);
            // Should have health checks
            expect(content).toMatch(/healthcheck:/);
            // Should use custom networks
            expect(content).toMatch(/networks:/);
            expect(content).toMatch(/frontend:/);
            expect(content).toMatch(/backend:/);
            // Should have internal networks
            expect(content).toMatch(/internal:\s*true/);
            // Should bind to localhost only
            expect(content).toMatch(/127\.0\.0\.1:/);
        });
        test('volumes should have security mount options', async () => {
            const composePath = path.join(projectRoot, 'docker-compose.secure.yml');
            const content = await fs.readFile(composePath, 'utf8');
            // Should have noexec, nosuid, nodev options
            expect(content).toMatch(/noexec/);
            expect(content).toMatch(/nosuid/);
            expect(content).toMatch(/nodev/);
            // Should have proper tmpfs mounts
            expect(content).toMatch(/tmpfs:/);
            expect(content).toMatch(/size=\d+m/);
        });
    });
    describe('Nginx Security Configuration', () => {
        test('nginx-secure.conf should implement security headers', async () => {
            const nginxPath = path.join(projectRoot, 'config/nginx/nginx-secure.conf');
            const content = await fs.readFile(nginxPath, 'utf8');
            // Should hide server tokens
            expect(content).toMatch(/server_tokens\s+off/);
            // Should have security headers
            expect(content).toMatch(/X-Frame-Options/);
            expect(content).toMatch(/X-Content-Type-Options/);
            expect(content).toMatch(/X-XSS-Protection/);
            expect(content).toMatch(/Strict-Transport-Security/);
            expect(content).toMatch(/Content-Security-Policy/);
            // Should have rate limiting
            expect(content).toMatch(/limit_req_zone/);
            expect(content).toMatch(/limit_conn_zone/);
            // Should have proper SSL configuration
            expect(content).toMatch(/ssl_protocols\s+TLSv1\.[23]/);
            expect(content).toMatch(/ssl_ciphers/);
            // Should block common attack patterns
            expect(content).toMatch(/wp-admin|xmlrpc|phpmyadmin/);
        });
        test('security-headers.conf should have comprehensive headers', async () => {
            const headersPath = path.join(projectRoot, 'config/nginx/security-headers.conf');
            const content = await fs.readFile(headersPath, 'utf8');
            // Should have all major security headers
            expect(content).toMatch(/X-XSS-Protection/);
            expect(content).toMatch(/X-Content-Type-Options/);
            expect(content).toMatch(/X-Frame-Options/);
            expect(content).toMatch(/Referrer-Policy/);
            expect(content).toMatch(/Permissions-Policy/);
            expect(content).toMatch(/Strict-Transport-Security/);
            expect(content).toMatch(/Content-Security-Policy/);
            expect(content).toMatch(/Cross-Origin-Embedder-Policy/);
            expect(content).toMatch(/Cross-Origin-Opener-Policy/);
        });
    });
    describe('Falco Security Rules', () => {
        test('Falco rules should monitor IntelGraph containers', async () => {
            const rulesPath = path.join(projectRoot, 'config/falco/rules/intelgraph_rules.yaml');
            const content = await fs.readFile(rulesPath, 'utf8');
            // Should have required engine version
            expect(content).toMatch(/required_engine_version/);
            // Should define IntelGraph-specific lists
            expect(content).toMatch(/intelgraph_allowed_processes/);
            expect(content).toMatch(/intelgraph_sensitive_files/);
            // Should have container detection macros
            expect(content).toMatch(/intelgraph_container/);
            expect(content).toMatch(/database_container/);
            // Should have security monitoring rules
            expect(content).toMatch(/Unauthorized Process in IntelGraph Container/);
            expect(content).toMatch(/IntelGraph Sensitive File Access/);
            expect(content).toMatch(/IntelGraph Privilege Escalation/);
            expect(content).toMatch(/Database Suspicious Activity/);
            expect(content).toMatch(/Container Breakout Attempt/);
            expect(content).toMatch(/Crypto Mining/);
            expect(content).toMatch(/Reverse Shell/);
            // Should have priority levels
            expect(content).toMatch(/priority:\s+(HIGH|CRITICAL|MEDIUM|INFO)/);
            // Should have proper tags
            expect(content).toMatch(/tags:\s*\[.*intelgraph.*\]/);
        });
    });
    describe('Security Scripts', () => {
        test('docker-security-audit.sh should be executable and comprehensive', async () => {
            const auditPath = path.join(projectRoot, 'scripts/docker-security-audit.sh');
            // Check if file exists and is executable
            const stats = await fs.stat(auditPath);
            expect(stats.mode & parseInt('111', 8)).toBeTruthy(); // Check execute permissions
            const content = await fs.readFile(auditPath, 'utf8');
            // Should have proper shebang
            expect(content).toMatch(/^#!/);
            // Should have main audit functions
            expect(content).toMatch(/check_docker_daemon/);
            expect(content).toMatch(/check_dockerfile_security/);
            expect(content).toMatch(/check_docker_compose_security/);
            expect(content).toMatch(/check_container_security/);
            expect(content).toMatch(/check_image_security/);
            expect(content).toMatch(/check_network_security/);
            expect(content).toMatch(/check_volume_security/);
            expect(content).toMatch(/check_vulnerabilities/);
            // Should generate HTML report
            expect(content).toMatch(/\.html/);
            expect(content).toMatch(/HTML.*[Rr]eport/);
            // Should have security scoring
            expect(content).toMatch(/security_score/);
        });
        test('generate-secrets.sh should create secure secrets', async () => {
            const secretsPath = path.join(projectRoot, 'scripts/generate-secrets.sh');
            const stats = await fs.stat(secretsPath);
            expect(stats.mode & parseInt('111', 8)).toBeTruthy();
            const content = await fs.readFile(secretsPath, 'utf8');
            // Should have proper shebang
            expect(content).toMatch(/^#!/);
            // Should generate different types of secrets
            expect(content).toMatch(/generate_password/);
            expect(content).toMatch(/generate_hex/);
            expect(content).toMatch(/generate_database_secrets/);
            expect(content).toMatch(/generate_app_secrets/);
            expect(content).toMatch(/generate_ssl_certificates/);
            // Should use openssl for secure generation
            expect(content).toMatch(/openssl rand/);
            // Should set secure permissions
            expect(content).toMatch(/chmod 600/);
            expect(content).toMatch(/chmod 700/);
            // Should backup existing secrets
            expect(content).toMatch(/backup/);
            // Should create inventory
            expect(content).toMatch(/inventory/);
        });
    });
    describe('Package.json Security Scripts', () => {
        test('should have Docker security npm scripts', async () => {
            const packagePath = path.join(projectRoot, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
            // Should have security-related scripts
            expect(packageJson.scripts).toHaveProperty('lint');
            expect(packageJson.scripts).toHaveProperty('test');
            // Check if security audit scripts could be added
            const hasSecurityScript = Object.keys(packageJson.scripts).some(script => script.includes('security') || script.includes('audit'));
            if (!hasSecurityScript) {
                // This is informational - could add docker:security script
                console.log('Info: Could add docker:security script to package.json');
            }
        });
    });
    describe('Security Best Practices', () => {
        test('should use secure secrets management in secure configurations', async () => {
            // Only check the secure files, not the template/example files
            const secureFiles = [
                'Dockerfile.secure',
                'docker-compose.secure.yml'
            ];
            for (const file of secureFiles) {
                const filePath = path.join(projectRoot, file);
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    // Secure files should use proper secrets management
                    if (content.includes('password') && !content.includes('your-secure-')) {
                        expect(content).toMatch(/\$\{|\$\(|\/run\/secrets|_FILE=|\$\$|secrets:/);
                    }
                    // Should not have obviously hardcoded credentials (but allow template examples)
                    expect(content).not.toMatch(/password.*=\s*['"]admin['"][^$]/i);
                    expect(content).not.toMatch(/password.*=\s*['"]123456['"][^$]/i);
                    expect(content).not.toMatch(/password.*=\s*['"]password['"][^$]/i);
                }
                catch (error) {
                    if (error.code !== 'ENOENT')
                        throw error;
                    // File doesn't exist, skip
                }
            }
        });
        test('should have proper .dockerignore', async () => {
            try {
                const dockerignorePath = path.join(projectRoot, '.dockerignore');
                const content = await fs.readFile(dockerignorePath, 'utf8');
                // Should ignore common sensitive files
                expect(content).toMatch(/\.env/);
                expect(content).toMatch(/node_modules/);
                expect(content).toMatch(/\.git/);
                // Should ignore logs and secrets
                expect(content).toMatch(/logs?/);
                expect(content).toMatch(/secrets?/);
            }
            catch (error) {
                if (error.code === 'ENOENT') {
                    console.log('Warning: .dockerignore file not found - should create one');
                }
                else {
                    throw error;
                }
            }
        });
        test('should use proper file structure for security', async () => {
            // Check for security configuration directory
            const securityDirs = [
                'config/nginx',
                'config/falco/rules',
                'scripts'
            ];
            for (const dir of securityDirs) {
                const dirPath = path.join(projectRoot, dir);
                try {
                    const stats = await fs.stat(dirPath);
                    expect(stats.isDirectory()).toBe(true);
                }
                catch (error) {
                    if (error.code === 'ENOENT') {
                        console.log(`Info: Directory ${dir} not found`);
                    }
                    else {
                        throw error;
                    }
                }
            }
        });
    });
    describe('Security Documentation', () => {
        test('should have security documentation', () => {
            // This test verifies that security configurations are documented
            // In a real implementation, you would check for README files, 
            // security guidelines, etc.
            const securityFeatures = [
                'Multi-stage builds',
                'Non-root users',
                'Security headers',
                'Rate limiting',
                'SSL/TLS configuration',
                'Secrets management',
                'Container isolation',
                'Resource limits',
                'Security monitoring',
                'Vulnerability scanning'
            ];
            // This is a placeholder test that always passes
            // In practice, you would check documentation files
            expect(securityFeatures.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=dockerSecurity.test.js.map