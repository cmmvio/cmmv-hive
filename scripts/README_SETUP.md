# BIP-04 Setup Guide

Este guia explica como configurar o ambiente BIP-04 Secure Script Execution Environment para produção.

## 🚀 Instalação Rápida

### Método 1: Instalação Completa (Recomendado)
```bash
# Execute o script de setup completo
./scripts/setup_bip04.sh
```

### Método 2: Instalação Passo-a-Passo

#### 1. Instalar Dependências do Sistema
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3 python3-pip python3-seccomp build-essential

# CentOS/RHEL
sudo yum install -y python3 python3-pip python3-seccomp gcc make
```

#### 2. Instalar Dependências Python
```bash
pip3 install --user pyyaml psutil seccomp cryptography
```

#### 3. Configurar Ambiente
```bash
# Criar diretórios
sudo mkdir -p /opt/cmmv-secure-scripts
sudo chown -R $USER:$USER /opt/cmmv-secure-scripts

# Configurar PYTHONPATH
export PYTHONPATH=/opt/cmmv-secure-scripts:$PYTHONPATH
```

## 🧪 Validação da Instalação

### Executar Testes de Validação
```bash
# Teste completo do ambiente
PYTHONPATH=/opt/cmmv-secure-scripts python3 scripts/secure/validate_deployment.py

# Teste específico da integridade dos logs
PYTHONPATH=/opt/cmmv-secure-scripts python3 scripts/test_log_integrity.py
```

### Verificar Status dos Serviços
```bash
# Verificar se os módulos carregam corretamente
python3 -c "from secure import SecureScriptExecutor; print('✅ BIP-04 Ready!')"

# Verificar logs de segurança
tail -f scripts/logs/security_events.log
```

## 📊 Opções do Script de Setup

### Modos de Instalação
```bash
# Instalação completa (padrão)
./scripts/setup_bip04.sh

# Apenas dependências do sistema
./scripts/setup_bip04.sh --system-only

# Apenas dependências Python
./scripts/setup_bip04.sh --python-only

# Apenas validação (sem instalar)
./scripts/setup_bip04.sh --validate-only

# Ajuda
./scripts/setup_bip04.sh --help
```

### Distribuições Suportadas
- ✅ Ubuntu 18.04+
- ✅ Debian 10+
- ✅ CentOS 7+
- ✅ RHEL 7+
- ✅ Fedora 30+
- ✅ Arch Linux

## 🔧 Configuração Pós-Instalação

### 1. Configurar Serviço Systemd
```bash
# Iniciar serviço
sudo systemctl start cmmv-security

# Habilitar auto-início
sudo systemctl enable cmmv-security

# Verificar status
sudo systemctl status cmmv-security
```

### 2. Configurar Log Rotation
```bash
# Verificar configuração de log rotation
cat /etc/logrotate.d/cmmv-security

# Executar rotação manual se necessário
sudo logrotate -f /etc/logrotate.d/cmmv-security
```

### 3. Configurar Limites do Sistema
```bash
# Verificar limites configurados
ulimit -n  # Deve mostrar 65536
ulimit -u  # Deve mostrar 4096

# Aplicar configurações do kernel
sudo sysctl -p
```

## 🔒 Recursos de Segurança

### Funcionalidades Ativadas
- ✅ Isolamento de processos
- ✅ Controle de recursos (CPU, memória, disco)
- ✅ Filtragem de syscalls (seccomp)
- ✅ Monitoramento de rede
- ✅ Análise estática AST-based
- ✅ Logs tamper-evident
- ✅ Controle de acesso a arquivos

### Configurações de Segurança
- **Domain Whitelist**: Lista vazia = deny all (secure by default)
- **Path Normalization**: Resolução de symlinks e canonicalização
- **Resource Limits**: Configuráveis via `security_policy.yml`
- **Audit Logging**: Hash chaining para integridade

## 📝 Arquivos de Configuração

### Localizações Importantes
```
/opt/cmmv-secure-scripts/          # Diretório principal
├── scripts/secure/                # Módulos Python
├── scripts/config/security_policy.yml  # Configurações de segurança
├── scripts/logs/                  # Logs de auditoria
│   ├── security_events.log
│   ├── execution_audit.log
│   └── log_integrity.dat
└── .log_key                       # Chave de integridade (protegida)
```

### Arquivos de Sistema
```
/etc/systemd/system/cmmv-security.service    # Serviço systemd
/etc/logrotate.d/cmmv-security              # Rotação de logs
/etc/security/limits.conf                    # Limites de recursos
/etc/sysctl.conf                             # Parâmetros do kernel
```

## 🚨 Solução de Problemas

### Problema: Módulo seccomp não encontrado
```bash
# Instalar biblioteca do sistema
sudo apt install python3-seccomp  # Ubuntu/Debian
sudo yum install python3-seccomp  # CentOS/RHEL

# Ou instalar via pip (requer libseccomp-dev)
pip3 install seccomp
```

### Problema: Erro de permissões
```bash
# Corrigir permissões dos diretórios
sudo chown -R $USER:$USER /opt/cmmv-secure-scripts
sudo chmod 755 /opt/cmmv-secure-scripts
sudo chmod 700 /opt/cmmv-secure-scripts/logs
```

### Problema: Limites de recursos não aplicados
```bash
# Verificar se os limites estão no limits.conf
grep "cmmv-security" /etc/security/limits.conf

# Recarregar configurações
sudo sysctl -p
```

## 📈 Monitoramento e Manutenção

### Comandos Úteis
```bash
# Verificar status do serviço
sudo systemctl status cmmv-security

# Ver logs em tempo real
journalctl -u cmmv-security -f

# Verificar integridade dos logs
PYTHONPATH=/opt/cmmv-secure-scripts python3 scripts/test_log_integrity.py

# Executar validação completa
PYTHONPATH=/opt/cmmv-secure-scripts python3 scripts/secure/validate_deployment.py
```

### Manutenção Regular
- **Diariamente**: Verificar logs de segurança
- **Semanalmente**: Executar testes de integridade
- **Mensalmente**: Atualizar dependências e revisar configurações

## 🎯 Próximos Passos

Após a instalação bem-sucedida:

1. **Configurar Políticas**: Ajustar `security_policy.yml` conforme necessidades
2. **Testar Scripts**: Executar scripts de produção no ambiente seguro
3. **Monitorar**: Configurar alertas e dashboards de monitoramento
4. **Documentar**: Registrar procedures específicas do ambiente

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar logs em `/opt/cmmv-secure-scripts/logs/`
2. Executar testes de validação
3. Revisar configurações em `scripts/config/security_policy.yml`
4. Consultar documentação em `gov/bips/BIP-04/`

---

**Status**: ✅ **BIP-04 Pronto para Produção**
**Data**: 2025-09-09
**Versão**: 1.0.0
