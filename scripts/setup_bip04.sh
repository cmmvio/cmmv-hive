#!/bin/bash

# BIP-04 Secure Script Execution Environment - Setup Script
# This script installs all required dependencies for BIP-04 production deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
check_privileges() {
    if [[ $EUID -eq 0 ]]; then
        log_info "Running with root privileges"
    elif sudo -n true 2>/dev/null; then
        log_info "sudo available without password"
    else
        log_warning "This script may require sudo privileges for system package installation"
        log_warning "You may be prompted for password during installation"
    fi
}

# Detect Linux distribution
detect_distro() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
        log_info "Detected distribution: $DISTRO $VERSION"
    elif [[ -f /etc/debian_version ]]; then
        DISTRO="debian"
        log_info "Detected distribution: Debian/Ubuntu"
    elif [[ -f /etc/redhat-release ]]; then
        DISTRO="rhel"
        log_info "Detected distribution: RHEL/CentOS"
    else
        log_warning "Could not detect Linux distribution, assuming Ubuntu/Debian"
        DISTRO="ubuntu"
    fi
}

# Update package manager
update_package_manager() {
    log_info "Updating package manager..."
    case $DISTRO in
        ubuntu|debian)
            sudo apt update
            ;;
        rhel|centos|fedora)
            sudo yum update -y || sudo dnf update -y
            ;;
        arch)
            sudo pacman -Syu --noconfirm
            ;;
        *)
            log_warning "Unsupported distribution for automatic updates"
            ;;
    esac
}

# Install system dependencies
install_system_dependencies() {
    log_info "Installing system dependencies..."

    case $DISTRO in
        ubuntu|debian)
            sudo apt install -y \
                python3 \
                python3-pip \
                python3-dev \
                python3-seccomp \
                build-essential \
                libseccomp-dev \
                pkg-config \
                git \
                curl \
                wget \
                jq \
                net-tools \
                procps \
                htop \
                vim \
                nano
            ;;
        rhel|centos)
            sudo yum install -y \
                python3 \
                python3-pip \
                python3-devel \
                libseccomp-devel \
                gcc \
                make \
                git \
                curl \
                wget \
                jq \
                net-tools \
                procps-ng \
                htop \
                vim \
                nano
            ;;
        fedora)
            sudo dnf install -y \
                python3 \
                python3-pip \
                python3-devel \
                libseccomp-devel \
                gcc \
                make \
                git \
                curl \
                wget \
                jq \
                net-tools \
                procps-ng \
                htop \
                vim \
                nano
            ;;
        arch)
            sudo pacman -S --noconfirm \
                python \
                python-pip \
                python-seccomp \
                base-devel \
                git \
                curl \
                wget \
                jq \
                net-tools \
                procps-ng \
                htop \
                vim \
                nano
            ;;
        *)
            log_error "Unsupported distribution: $DISTRO"
            log_error "Please install dependencies manually:"
            log_error "  - Python 3.8+"
            log_error "  - pip"
            log_error "  - libseccomp-dev (for seccomp support)"
            log_error "  - build tools (gcc, make)"
            exit 1
            ;;
    esac

    log_success "System dependencies installed"
}

# Install Python dependencies
install_python_dependencies() {
    log_info "Installing Python dependencies..."

    # Install core dependencies
    pip3 install --user --upgrade \
        pyyaml \
        psutil \
        requests \
        cryptography \
        bcrypt

    # Try to install seccomp library (may fail if system lib not available)
    if pip3 install --user seccomp 2>/dev/null; then
        log_success "seccomp Python library installed"
    else
        log_warning "seccomp Python library not available (system library may be missing)"
        log_warning "BIP-04 will work with reduced syscall filtering"
    fi

    # Install additional security libraries
    pip3 install --user --upgrade \
        bandit \
        safety \
        pip-audit

    log_success "Python dependencies installed"
}

# Setup directories and permissions
setup_directories() {
    log_info "Setting up BIP-04 directories..."

    # Create necessary directories
    sudo mkdir -p /opt/cmmv-secure-scripts
    sudo mkdir -p /opt/cmmv-secure-scripts/logs
    sudo mkdir -p /opt/cmmv-secure-scripts/config
    sudo mkdir -p /var/log/cmmv-security

    # Set proper permissions
    sudo chown -R $USER:$USER /opt/cmmv-secure-scripts
    sudo chmod -R 755 /opt/cmmv-secure-scripts
    sudo chmod 700 /opt/cmmv-secure-scripts/logs

    # Create log rotation configuration
    cat << EOF | sudo tee /etc/logrotate.d/cmmv-security > /dev/null
/var/log/cmmv-security/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        systemctl reload cmmv-security 2>/dev/null || true
    endscript
}
EOF

    log_success "Directories and permissions configured"
}

# Configure system settings
configure_system() {
    log_info "Configuring system settings for BIP-04..."

    # Increase file limits for security monitoring
    cat << EOF | sudo tee -a /etc/security/limits.conf > /dev/null
# BIP-04 Security Settings
* soft nofile 65536
* hard nofile 65536
* soft nproc 4096
* hard nproc 4096
EOF

    # Configure kernel parameters for security
    cat << EOF | sudo tee -a /etc/sysctl.conf > /dev/null
# BIP-04 Security Kernel Parameters
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 1
kernel.perf_event_paranoid = 2
kernel.yama.ptrace_scope = 1
EOF

    # Reload sysctl settings
    sudo sysctl -p > /dev/null 2>&1 || true

    log_success "System security settings configured"
}

# Create systemd service (optional)
create_systemd_service() {
    log_info "Creating systemd service for BIP-04..."

    cat << EOF | sudo tee /etc/systemd/system/cmmv-security.service > /dev/null
[Unit]
Description=CMMV Hive Security Monitor
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=/opt/cmmv-secure-scripts
ExecStart=/usr/bin/python3 /opt/cmmv-secure-scripts/monitor_service.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cmmv-security

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/cmmv-secure-scripts /var/log/cmmv-security
InaccessiblePaths=/home /root /boot /sys /proc /dev

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    log_success "Systemd service created (start with: sudo systemctl start cmmv-security)"
}

# Run validation tests
run_validation() {
    log_info "Running BIP-04 validation tests..."

    # Check if we're in the correct directory
    if [[ ! -f "scripts/secure/validate_deployment.py" ]]; then
        log_error "BIP-04 files not found in current directory"
        log_error "Please run this script from the cmmv-hive project root"
        exit 1
    fi

    # Run the validation script
    if PYTHONPATH=/mnt/f/Node/cmmv-hive/scripts python3 scripts/secure/validate_deployment.py; then
        log_success "BIP-04 deployment validation completed successfully!"
    else
        log_warning "BIP-04 deployment validation completed with warnings"
        log_warning "Some tests may have failed - check output above"
    fi

    # Run log integrity test
    log_info "Testing tamper-evident logging functionality..."
    if PYTHONPATH=/mnt/f/Node/cmmv-hive/scripts python3 scripts/test_log_integrity.py; then
        log_success "Log integrity test completed successfully!"
    else
        log_warning "Log integrity test found issues"
        log_warning "Check log integrity implementation"
    fi
}

# Display installation summary
show_summary() {
    echo
    log_success "BIP-04 Setup Complete!"
    echo
    echo "Installation Summary:"
    echo "====================="
    echo "✅ System dependencies installed"
    echo "✅ Python dependencies installed"
    echo "✅ Directories configured"
    echo "✅ Security settings applied"
    echo "✅ Systemd service created"
    echo
    echo "Next Steps:"
    echo "==========="
    echo "1. Start the security service:"
    echo "   sudo systemctl start cmmv-security"
    echo
    echo "2. Enable auto-start:"
    echo "   sudo systemctl enable cmmv-security"
    echo
    echo "3. Check service status:"
    echo "   sudo systemctl status cmmv-security"
    echo
    echo "4. View logs:"
    echo "   journalctl -u cmmv-security -f"
    echo
    echo "5. Run manual tests:"
    echo "   PYTHONPATH=/opt/cmmv-secure-scripts python3 -c \"from secure import SecureScriptExecutor; print('BIP-04 Ready!')\""
    echo
    echo "6. Test log integrity:"
    echo "   PYTHONPATH=/opt/cmmv-secure-scripts python3 scripts/test_log_integrity.py"
    echo
    echo "7. View security logs:"
    echo "   tail -f /var/log/cmmv-security/security_events.log"
    echo
}

# Main installation function
main() {
    echo "========================================"
    echo "BIP-04 Secure Script Execution Setup"
    echo "========================================"
    echo

    check_privileges
    detect_distro
    update_package_manager
    install_system_dependencies
    install_python_dependencies
    setup_directories
    configure_system
    create_systemd_service

    # Ask if user wants to run validation
    echo
    read -p "Run BIP-04 validation tests now? (y/N): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_validation
    else
        log_info "Skipping validation tests"
        log_info "You can run them later with: PYTHONPATH=/mnt/f/Node/cmmv-hive/scripts python3 scripts/secure/validate_deployment.py"
    fi

    show_summary
}

# Handle command line arguments
case "$1" in
    --help|-h)
        echo "BIP-04 Setup Script"
        echo "Usage: $0 [OPTIONS]"
        echo
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --validate-only     Run only validation tests"
        echo "  --system-only       Install only system dependencies"
        echo "  --python-only       Install only Python dependencies"
        echo
        exit 0
        ;;
    --validate-only)
        run_validation
        exit 0
        ;;
    --system-only)
        check_privileges
        detect_distro
        update_package_manager
        install_system_dependencies
        setup_directories
        configure_system
        log_success "System dependencies installed"
        exit 0
        ;;
    --python-only)
        install_python_dependencies
        log_success "Python dependencies installed"
        exit 0
        ;;
    *)
        main
        ;;
esac
