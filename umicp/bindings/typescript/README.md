# UMICP TypeScript/JavaScript Bindings

## Overview

High-performance Node.js bindings for the UMICP (Universal Matrix Intelligent Communication Protocol) C++ core implementation. This package provides native C++ performance with a seamless TypeScript/JavaScript API.

## Features

### 🚀 **Native Performance**
- Direct C++ bindings with zero marshalling overhead
- SIMD-accelerated matrix operations (AVX-512, AVX2, SSE)
- Native memory management for large datasets
- LLVM optimizations for cross-platform performance

### 📊 **Matrix Operations**
- Vector addition, multiplication, transpose
- Dot product and cosine similarity calculations
- L2 normalization for embeddings
- High-precision floating-point operations

### 🌐 **Server-to-Server (S2S) Communication**
- Direct AI model collaboration protocols
- Federated learning data exchange
- Distributed inference pipelines
- Load balancing and failover mechanisms
- Secure S2S authentication and encryption

### 📦 **Protocol Support**
- JSON envelope serialization/deserialization
- Canonical JSON formatting for integrity
- SHA-256 hashing for message integrity
- Builder pattern for complex message construction

### 🔧 **Developer Experience**
- Full TypeScript support with type definitions
- Fluent API design patterns
- Comprehensive error handling
- Memory-safe operations

## Installation

### Prerequisites

```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3 cmake libjson-c-dev zlib1g-dev libssl-dev

# macOS
brew install cmake json-c zlib openssl

# Windows (with MSVC)
# Install Visual Studio Build Tools and CMake
```

### Install Package

```bash
npm install @umicp/core
# or
yarn add @umicp/core
# or
pnpm add @umicp/core
```

### Build from Source

```bash
git clone <repository>
cd umicp/bindings/typescript
npm install
npm run build
```

## Quick Start

### Basic Usage

```typescript
import { Envelope, Matrix, OperationType, PayloadType, EncodingType } from '@umicp/core';

// Create envelope
const envelope = new Envelope({
  from: 'ai-model-a',
  to: 'ai-model-b',
  operation: OperationType.DATA,
  payloadHint: {
    type: PayloadType.VECTOR,
    size: 3072, // 768 * 4 bytes
    encoding: EncodingType.FLOAT32,
    count: 768
  }
});

// Serialize to JSON
const json = envelope.serialize();
console.log('Envelope JSON length:', json.length);

// Validate envelope
const isValid = envelope.validate();
console.log('Envelope valid:', isValid);
```

### Matrix Operations

```typescript
import { Matrix } from '@umicp/core';

// Create matrix processor
const matrix = new Matrix();

// Vector data (simulating embeddings)
const embeddingsA = new Float32Array(768);
const embeddingsB = new Float32Array(768);
const result = new Float32Array(768);

// Initialize with sample data
for (let i = 0; i < 768; i++) {
  embeddingsA[i] = Math.random() * 2 - 1; // Random values between -1 and 1
  embeddingsB[i] = Math.random() * 2 - 1;
}

// SIMD-accelerated vector addition
const addResult = matrix.add(embeddingsA, embeddingsB, result, 768, 1);
if (addResult.success) {
  console.log('Vector addition completed');
}

// Cosine similarity calculation
const similarityResult = matrix.cosineSimilarity(embeddingsA, embeddingsB);
if (similarityResult.success) {
  console.log('Cosine similarity:', similarityResult.similarity);
}
```

### Advanced Usage

```typescript
import { Envelope, Matrix, UMICP } from '@umicp/core';

// Create envelope with capabilities negotiation
const envelope = UMICP.createEnvelope({
  from: 'llm-gpt-4',
  to: 'embedding-model',
  operation: OperationType.DATA,
  capabilities: {
    'binary_support': 'true',
    'compression': 'gzip,brotli',
    'formats': 'cbor,msgpack',
    'simd_support': 'avx512,avx2'
  },
  payloadHint: {
    type: PayloadType.VECTOR,
    encoding: EncodingType.FLOAT32,
    count: 1536  // GPT-4 embedding dimension
  }
});

// High-performance matrix operations
const matrix = UMICP.createMatrix();
const largeMatrixA = new Float32Array(64 * 128);  // 64x128 matrix
const largeMatrixB = new Float32Array(128 * 256); // 128x256 matrix
const resultMatrix = new Float32Array(64 * 256);  // Result: 64x256

// Matrix multiplication with SIMD acceleration
const multiplyResult = matrix.multiply(
  largeMatrixA, largeMatrixB, resultMatrix,
  64, 128, 256  // m, n, p dimensions
);

if (multiplyResult.success) {
  console.log('Large matrix multiplication completed with native performance');
}
```

## API Reference

### Envelope Class

#### Constructor
```typescript
new Envelope(options?: EnvelopeOptions)
```

#### Methods

**Configuration:**
- `setFrom(from: string): Envelope`
- `setTo(to: string): Envelope`
- `setOperation(operation: OperationType): Envelope`
- `setMessageId(messageId: string): Envelope`
- `setCapabilities(capabilities: Record<string, string>): Envelope`
- `setPayloadHint(hint: PayloadHint): Envelope`

**Operations:**
- `serialize(): string` - Serialize to canonical JSON
- `deserialize(json: string): Envelope` - Deserialize from JSON
- `validate(): boolean` - Validate envelope structure
- `getHash(): string` - Get SHA-256 hash for integrity

#### Static Methods
- `Envelope.create(options?: EnvelopeOptions): Envelope`
- `Envelope.serialize(envelope: Envelope): string`
- `Envelope.deserialize(json: string): Envelope`
- `Envelope.validate(envelope: Envelope): boolean`
- `Envelope.hash(envelope: Envelope): string`

### Matrix Class

#### Constructor
```typescript
new Matrix()
```

#### Methods

**Basic Operations:**
- `add(a: Float32Array, b: Float32Array, result: Float32Array, rows: number, cols: number): MatrixResult`
- `multiply(a: Float32Array, b: Float32Array, result: Float32Array, m: number, n: number, p: number): MatrixResult`
- `transpose(input: Float32Array, output: Float32Array, rows: number, cols: number): MatrixResult`

**Vector Operations:**
- `dotProduct(a: Float32Array, b: Float32Array): MatrixResult`
- `cosineSimilarity(a: Float32Array, b: Float32Array): MatrixResult`
- `normalize(matrix: Float32Array, rows: number, cols: number): MatrixResult`

### Types and Enums

```typescript
enum OperationType {
  CONTROL = 0,
  DATA = 1,
  ACK = 2,
  ERROR = 3
}

enum PayloadType {
  VECTOR = 0,
  TEXT = 1,
  METADATA = 2,
  BINARY = 3
}

enum EncodingType {
  FLOAT32 = 0,
  FLOAT64 = 1,
  INT32 = 2,
  INT64 = 3,
  UINT8 = 4,
  UINT16 = 5,
  UINT32 = 6,
  UINT64 = 7
}

interface EnvelopeOptions {
  from?: string;
  to?: string;
  operation?: OperationType;
  messageId?: string;
  capabilities?: Record<string, string>;
  payloadHint?: PayloadHint;
}

interface PayloadHint {
  type?: PayloadType;
  size?: number;
  encoding?: EncodingType;
  count?: number;
}

interface MatrixResult {
  success: boolean;
  error?: string;
  result?: number;
  similarity?: number;
  data?: Float32Array;
}
```

## Performance

### Benchmark Results (Intel i7-9700K)

| Operation | Size | Native (μs) | JavaScript (μs) | Speedup |
|-----------|------|-------------|-----------------|---------|
| Vector Add | 10K | 45 | 1,250 | 27.8x |
| Dot Product | 10K | 32 | 890 | 27.8x |
| Matrix Mult | 64x128x256 | 2,340 | 45,600 | 19.5x |
| Normalization | 10K | 67 | 2,100 | 31.3x |

### Memory Usage

- **Envelope**: ~200-500 bytes (depending on metadata)
- **Matrix ops**: In-place operations, minimal allocations
- **Buffers**: Direct TypedArray access to native memory

## Examples

See `examples/basic-usage.ts` for comprehensive examples including:

- Envelope creation and JSON serialization
- High-performance matrix operations
- Performance benchmarking
- Error handling patterns

## Building

### Development Build

```bash
# Install dependencies
npm install

# Build native addon
npm run build

# Run tests
npm test

# Clean build
npm run clean
```

### Production Build

```bash
# Optimized release build
npm run build -- --release

# Cross-platform builds
npm run build -- --target=12.18.0 --arch=x64
```

## Dependencies

### Runtime
- Node.js 16.0.0+
- C++17 compatible compiler

### Build
- CMake 3.16+
- Python 3.x
- node-gyp

### System Libraries
- json-c (JSON processing)
- zlib (compression)
- OpenSSL (crypto operations)

## Installation & Build

### Prerequisites

```bash
# Ubuntu/Debian
sudo apt-get install build-essential cmake libjson-c-dev zlib1g-dev libssl-dev node-gyp

# macOS
brew install cmake json-c zlib openssl node-gyp

# Windows (with MSVC)
# Install Visual Studio Build Tools, CMake, and Node.js
npm install -g node-gyp
```

### Quick Build

From the UMICP root directory:

```bash
# Build the native bindings
./scripts/build-bindings.sh

# This will create: bindings/typescript/build/Release/umicp_core.node
```

### Manual Build

```bash
cd bindings/typescript

# Install dependencies
npm install

# Configure and build
node-gyp configure
node-gyp build

# Test the build
node -e "console.log(require('./build/Release/umicp_core.node').version)"
```

### Usage in Your Project

```typescript
// Direct native addon usage
const umicpNative = require('./path/to/umicp/bindings/typescript/build/Release/umicp_core.node');

// TypeScript wrapper usage
import { Envelope, Matrix, OperationType } from './path/to/umicp/bindings/typescript/src/index.js';
```

## Troubleshooting

### Build Issues

**Common Linux Issues:**
```bash
# Install missing dependencies
sudo apt-get install build-essential cmake libjson-c-dev zlib1g-dev libssl-dev python3-dev
```

**Common macOS Issues:**
```bash
# Install with Homebrew
brew install cmake json-c zlib openssl python3

# Ensure Xcode command line tools
xcode-select --install
```

**Common Windows Issues:**
```bash
# Install Visual Studio Build Tools
# Ensure CMake and Python are in PATH
# Run as Administrator if needed
```

### Runtime Issues

**Memory Issues:**
- Ensure sufficient RAM for large matrices
- Use streaming for very large datasets
- Monitor memory usage with `--max-old-space-size`

**Performance Issues:**
- Ensure AVX2/AVX-512 support on target CPU
- Use release builds for production
- Profile with Chrome DevTools for optimization

## Testing

### Test Suites

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit        # Core functionality tests
npm run test:integration # WebSocket transport tests
npm run test:s2s         # Server-to-Server tests
npm run test:websocket   # WebSocket transport tests

# Development mode
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage reports
```

### Test Coverage

- **Envelope Tests**: 25+ ✅ - Complete coverage including edge cases, unicode, large payloads, concurrent operations
- **Matrix Tests**: 20+ ✅ - Full operations coverage with SIMD, numerical edge cases, performance benchmarks
- **Integration Tests**: WebSocket transport, protocol negotiation, error handling
- **S2S Tests**: Server-to-Server communication, federated learning, distributed inference
- **Security Tests**: Input validation, injection prevention, authentication, resource exhaustion
- **Regression Tests**: Bug fixes validation, performance regression detection, memory leak prevention
- **Load Tests**: High-throughput testing, concurrent operations, memory stress testing
- **E2E Tests**: Complete communication workflows, real-world scenarios (IoT, financial, etc.)

### Continuous Integration

This package includes GitHub Actions CI/CD pipeline that:
- ✅ Tests on multiple Node.js versions (16.x, 18.x, 20.x)
- ✅ Cross-platform testing (Linux, macOS, Windows)
- ✅ Automated dependency auditing
- ✅ Code coverage reporting
- ✅ Automated publishing on releases

## Publishing

### Automated Publishing

The package includes automated publishing scripts that run before each NPM release:

```bash
# Pre-publish script (runs automatically)
npm run prepublishOnly
```

This script performs:
1. **Clean build**: Removes all build artifacts
2. **Fresh install**: Reinstalls all dependencies
3. **Build process**: Compiles TypeScript and native bindings
4. **Test execution**: Runs complete test suite
5. **Validation**: Ensures all tests pass before publishing

### Manual Publishing

```bash
# Build and test locally
npm run build
npm run test:all  # Run comprehensive test suite

# Or run specific test categories
npm run test:quick      # Fast unit tests only
npm run test:security   # Security-focused tests
npm run test:performance # Performance benchmarks
npm run test:load       # Load and stress tests

# Publish to NPM
npm publish
```

### Advanced Testing Features

#### Custom Test Utilities

The test suite includes comprehensive utilities for advanced testing scenarios:

- **Performance Measurement**: Built-in performance tracking and assertions
- **Memory Pressure Simulation**: Test memory handling under pressure
- **Concurrent Load Generation**: Simulate high-concurrency scenarios
- **Security Test Vectors**: Pre-built malicious input patterns
- **Custom Matchers**: Specialized assertions for envelope and performance validation

#### Test Categories

- **`test:unit`**: Core functionality tests (Envelope, Matrix operations)
- **`test:integration`**: WebSocket transport and protocol integration
- **`test:security`**: Security validation and injection prevention
- **`test:regression`**: Bug fix validation and regression prevention
- **`test:load`**: Performance and load testing
- **`test:e2e`**: End-to-end communication workflows
- **`test:performance`**: Dedicated performance benchmarking
- **`test:ci`**: Complete CI test suite

### CI/CD Pipeline

The GitHub Actions workflow automatically:
- Builds on all supported platforms
- Runs comprehensive test suites
- Generates coverage reports
- Publishes to NPM on tagged releases
- Performs security audits

## Contributing

1. Follow the established TypeScript/JavaScript coding standards
2. Add comprehensive tests for new functionality
3. Include performance benchmarks
4. Update documentation and examples
5. Ensure cross-platform compatibility

## License

This implementation is part of the CMMV-Hive project and follows the same license terms.

## Related Documentation

- [UMICP C++ Core](../cpp/README.md)
- [UMICP Protocol Specification](../../specifications/)
- [CMMV-Hive Documentation](../../../docs/)
