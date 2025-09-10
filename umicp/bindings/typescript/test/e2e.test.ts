/**
 * End-to-End Integration Tests for UMICP Bindings
 * Tests complete communication workflows and scenarios
 */

import { AdvancedWebSocketTransport } from '../examples/transport-example';
import { Envelope, UMICP, OperationType, PayloadType, EncodingType } from '../src/index';

describe('End-to-End Integration Tests', () => {
  let server: AdvancedWebSocketTransport;
  let client: AdvancedWebSocketTransport;
  const serverPort = 8081;
  const clientPort = 8082;

  beforeEach(async () => {
    // Setup server
    server = new AdvancedWebSocketTransport({
      port: serverPort,
      host: 'localhost',
      enableBroadcast: true,
      heartbeatInterval: 5000,
      maxReconnectAttempts: 3
    });

    // Setup client
    client = new AdvancedWebSocketTransport({
      port: clientPort,
      host: 'localhost',
      enableBroadcast: false,
      heartbeatInterval: 5000,
      maxReconnectAttempts: 3
    });

    // Start both
    await server.start();
    await client.start();

    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    try {
      await server.stop();
      await client.stop();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('Basic Communication Flow', () => {
    test('should establish connection and exchange messages', async () => {
      return new Promise<void>((resolve, reject) => {
        let messageReceived = false;

        // Server message handler
        server.on('message', (message, info) => {
          try {
            expect(message).toBeInstanceOf(Envelope);
            expect(message.getFrom()).toBe('test-client');
            expect(message.getTo()).toBe('test-server');
            expect(message.getOperation()).toBe(OperationType.DATA);

            messageReceived = true;
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        // Client sends message after connection
        setTimeout(async () => {
          if (!server.isConnected()) {
            reject(new Error('Server not connected'));
            return;
          }

          const envelope = UMICP.createEnvelope({
            from: 'test-client',
            to: 'test-server',
            operation: OperationType.DATA,
            messageId: 'e2e-test-001',
            capabilities: {
              'test_type': 'basic_communication',
              'sequence': '1'
            }
          });

          const success = await client.send(envelope);
          expect(success).toBe(true);

          // Timeout if no response
          setTimeout(() => {
            if (!messageReceived) {
              reject(new Error('Message not received by server'));
            }
          }, 5000);
        }, 500);
      });
    });

    test('should handle bidirectional communication', async () => {
      return new Promise<void>((resolve, reject) => {
        let clientReceived = false;
        let serverReceived = false;

        // Server handler
        server.on('message', async (message, info) => {
          serverReceived = true;

          // Server responds
          const response = UMICP.createEnvelope({
            from: 'test-server',
            to: 'test-client',
            operation: OperationType.ACK,
            messageId: 'server-response-001',
            capabilities: {
              'response_to': message.getMessageId(),
              'status': 'received'
            }
          });

          await server.send(response);
        });

        // Client handler
        client.on('message', (message, info) => {
          if (message.getOperation() === OperationType.ACK) {
            clientReceived = true;
            expect(message.getFrom()).toBe('test-server');
            expect(message.getTo()).toBe('test-client');

            if (serverReceived && clientReceived) {
              resolve();
            }
          }
        });

        // Client sends initial message
        setTimeout(async () => {
          const envelope = UMICP.createEnvelope({
            from: 'test-client',
            to: 'test-server',
            operation: OperationType.DATA,
            messageId: 'bidirectional-test-001'
          });

          const success = await client.send(envelope);
          expect(success).toBe(true);

          // Timeout
          setTimeout(() => {
            if (!clientReceived) {
              reject(new Error('Bidirectional communication failed'));
            }
          }, 5000);
        }, 500);
      });
    });
  });

  describe('Protocol Negotiation', () => {
    test('should negotiate capabilities during connection', async () => {
      return new Promise<void>((resolve, reject) => {
        // Server expects capability negotiation
        server.on('message', async (message, info) => {
          if (message.getOperation() === OperationType.CONTROL) {
            const caps = message.getCapabilities();

            if (caps['negotiation'] === 'capabilities') {
              // Server responds with supported capabilities
              const response = UMICP.createEnvelope({
                from: 'test-server',
                to: 'test-client',
                operation: OperationType.ACK,
                messageId: 'negotiation-response-001',
                capabilities: {
                  'supported_versions': JSON.stringify(['1.0', '1.1']),
                  'supported_features': JSON.stringify(['compression', 'encryption', 'federated_learning']),
                  'max_message_size': '1048576', // 1MB
                  'rate_limit': '1000',
                  'protocol_version': '1.0'
                }
              });

              await server.send(response);
              resolve();
            }
          }
        });

        // Client sends capability negotiation
        setTimeout(async () => {
          const negotiationEnvelope = UMICP.createEnvelope({
            from: 'test-client',
            to: 'test-server',
            operation: OperationType.CONTROL,
            messageId: 'capability-negotiation-001',
            capabilities: {
              'negotiation': 'capabilities',
              'client_version': '1.0',
              'requested_features': JSON.stringify(['compression', 'encryption']),
              'supported_encodings': JSON.stringify(['utf8', 'binary'])
            }
          });

          const success = await client.send(negotiationEnvelope);
          expect(success).toBe(true);

          setTimeout(() => reject(new Error('Capability negotiation timeout')), 5000);
        }, 500);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle connection loss and reconnection', async () => {
      return new Promise<void>((resolve, reject) => {
        let reconnectionSuccessful = false;

        // Monitor client reconnection
        client.on('reconnected', () => {
          reconnectionSuccessful = true;
        });

        client.on('message', (message, info) => {
          if (message.getOperation() === OperationType.DATA && reconnectionSuccessful) {
            resolve();
          }
        });

        setTimeout(async () => {
          // Simulate connection loss by stopping server briefly
          await server.stop();

          // Wait a bit
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Restart server
          await server.start();

          // Wait for reconnection
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Send test message
          const envelope = UMICP.createEnvelope({
            from: 'test-client',
            to: 'test-server',
            operation: OperationType.DATA,
            messageId: 'reconnection-test-001'
          });

          const success = await client.send(envelope);
          expect(success).toBe(true);

          setTimeout(() => reject(new Error('Reconnection test failed')), 10000);
        }, 500);
      });
    });

    test('should handle malformed messages gracefully', async () => {
      return new Promise<void>((resolve, reject) => {
        let malformedMessageHandled = false;

        server.on('error', (error) => {
          // Should handle malformed message without crashing
          if (error.message.includes('malformed') || error.message.includes('invalid')) {
            malformedMessageHandled = true;
            resolve();
          }
        });

        setTimeout(async () => {
          // Send malformed data (this might not work with typed transport, but tests error handling)
          try {
            const malformedEnvelope = UMICP.createEnvelope({
              from: 'test-client',
              to: 'test-server',
              operation: OperationType.ERROR,
              messageId: 'malformed-test-001',
              capabilities: {
                'malformed': 'true',
                'data': 'invalid_json_{'
              }
            });

            await client.send(malformedEnvelope);
          } catch (error) {
            // If sending fails, that's also acceptable error handling
            malformedMessageHandled = true;
            resolve();
          }

          setTimeout(() => {
            if (!malformedMessageHandled) {
              reject(new Error('Malformed message not handled properly'));
            }
          }, 3000);
        }, 500);
      });
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle high message throughput', async () => {
      return new Promise<void>((resolve, reject) => {
        const messageCount = 100;
        let receivedCount = 0;
        const startTime = Date.now();

        server.on('message', (message, info) => {
          receivedCount++;
          if (receivedCount === messageCount) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            const throughput = messageCount / (duration / 1000);

            console.log(`High throughput test: ${messageCount} messages in ${duration}ms (${throughput.toFixed(0)} msg/sec)`);

            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
            expect(throughput).toBeGreaterThan(10); // At least 10 messages per second
            resolve();
          }
        });

        // Send messages in batches
        setTimeout(async () => {
          for (let i = 0; i < messageCount; i++) {
            const envelope = UMICP.createEnvelope({
              from: 'test-client',
              to: 'test-server',
              operation: OperationType.DATA,
              messageId: `throughput-test-${i}`,
              capabilities: {
                'sequence': i.toString(),
                'batch': 'true'
              }
            });

            await client.send(envelope);

            // Small delay between messages to avoid overwhelming
            if (i % 10 === 0) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
        }, 500);

        setTimeout(() => reject(new Error('High throughput test timeout')), 10000);
      });
    });

    test('should handle large message payloads', async () => {
      return new Promise<void>((resolve, reject) => {
        const largePayloadSize = 1024 * 100; // 100KB
        const largeData = 'x'.repeat(largePayloadSize);

        server.on('message', (message, info) => {
          const caps = message.getCapabilities();
          const receivedSize = caps['payload_size'];

          expect(parseInt(receivedSize)).toBe(largePayloadSize);
          expect(caps['large_payload']).toBe(largeData.substring(0, 100)); // First 100 chars

          resolve();
        });

        setTimeout(async () => {
          const envelope = UMICP.createEnvelope({
            from: 'test-client',
            to: 'test-server',
            operation: OperationType.DATA,
            messageId: 'large-payload-test-001',
            capabilities: {
              'payload_size': largePayloadSize.toString(),
              'large_payload': largeData,
              'compression': 'none'
            }
          });

          const success = await client.send(envelope);
          expect(success).toBe(true);

          setTimeout(() => reject(new Error('Large payload test timeout')), 10000);
        }, 500);
      });
    });
  });

  describe('Federated Learning Scenario', () => {
    test('should handle model weight exchange', async () => {
      return new Promise<void>((resolve, reject) => {
        // Simulate federated learning weight exchange
        const modelWeights = new Float32Array(1000);
        for (let i = 0; i < modelWeights.length; i++) {
          modelWeights[i] = Math.random() * 2 - 1; // Random weights between -1 and 1
        }

        let weightsReceived = false;

        server.on('message', (message, info) => {
          const caps = message.getCapabilities();

          if (caps['federated_learning'] === 'weight_update') {
            const receivedWeights = JSON.parse(caps['model_weights']);
            expect(receivedWeights.length).toBe(1000);
            expect(caps['epoch']).toBe('42');
            expect(caps['client_id']).toBe('client_001');

            weightsReceived = true;
            resolve();
          }
        });

        setTimeout(async () => {
          const envelope = UMICP.createEnvelope({
            from: 'client_001',
            to: 'federated_server',
            operation: OperationType.DATA,
            messageId: 'federated-learning-001',
            capabilities: {
              'federated_learning': 'weight_update',
              'epoch': '42',
              'client_id': 'client_001',
              'model_weights': JSON.stringify(Array.from(modelWeights)),
              'accuracy': '0.95',
              'loss': '0.05'
            }
          });

          const success = await client.send(envelope);
          expect(success).toBe(true);

          setTimeout(() => {
            if (!weightsReceived) {
              reject(new Error('Federated learning weight exchange failed'));
            }
          }, 5000);
        }, 500);
      });
    });

    test('should handle distributed inference requests', async () => {
      return new Promise<void>((resolve, reject) => {
        const inputData = new Float32Array(784); // MNIST-like input
        for (let i = 0; i < inputData.length; i++) {
          inputData[i] = Math.random();
        }

        let inferenceCompleted = false;

        server.on('message', async (message, info) => {
          const caps = message.getCapabilities();

          if (caps['inference_request'] === 'true') {
            // Server processes inference and responds
            const mockPrediction = Math.floor(Math.random() * 10); // 0-9 for MNIST

            const response = UMICP.createEnvelope({
              from: 'inference_server',
              to: 'inference_client',
              operation: OperationType.DATA,
              messageId: 'inference-response-001',
              capabilities: {
                'inference_response': 'true',
                'prediction': mockPrediction.toString(),
                'confidence': (Math.random() * 0.5 + 0.5).toString(), // 0.5-1.0
                'processing_time': '150', // ms
                'model_version': 'v2.1.0'
              }
            });

            await server.send(response);
          }
        });

        client.on('message', (message, info) => {
          const caps = message.getCapabilities();

          if (caps['inference_response'] === 'true') {
            expect(caps['prediction']).toBeDefined();
            expect(parseFloat(caps['confidence'])).toBeGreaterThan(0);
            expect(caps['model_version']).toBe('v2.1.0');

            inferenceCompleted = true;
            resolve();
          }
        });

        setTimeout(async () => {
          const envelope = UMICP.createEnvelope({
            from: 'inference_client',
            to: 'inference_server',
            operation: OperationType.DATA,
            messageId: 'inference-request-001',
            capabilities: {
              'inference_request': 'true',
              'input_data': JSON.stringify(Array.from(inputData)),
              'model_type': 'mnist_classifier',
              'timeout': '5000'
            }
          });

          const success = await client.send(envelope);
          expect(success).toBe(true);

          setTimeout(() => {
            if (!inferenceCompleted) {
              reject(new Error('Distributed inference failed'));
            }
          }, 5000);
        }, 500);
      });
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle IoT sensor data streaming', async () => {
      return new Promise<void>((resolve, reject) => {
        const sensorReadings = [];
        const readingCount = 50;

        for (let i = 0; i < readingCount; i++) {
          sensorReadings.push({
            sensor_id: `sensor_${i % 5}`,
            timestamp: Date.now() + i * 100,
            temperature: 20 + Math.random() * 10,
            humidity: 30 + Math.random() * 40,
            pressure: 1013 + (Math.random() - 0.5) * 20
          });
        }

        let readingsProcessed = 0;

        server.on('message', (message, info) => {
          const caps = message.getCapabilities();

          if (caps['sensor_data'] === 'true') {
            readingsProcessed++;
            expect(caps['sensor_id']).toMatch(/^sensor_\d+$/);
            expect(parseFloat(caps['temperature'])).toBeGreaterThan(15);
            expect(parseFloat(caps['temperature'])).toBeLessThan(35);

            if (readingsProcessed === readingCount) {
              resolve();
            }
          }
        });

        setTimeout(async () => {
          // Send sensor readings
          for (let i = 0; i < readingCount; i++) {
            const reading = sensorReadings[i];

            const envelope = UMICP.createEnvelope({
              from: `iot_device_${reading.sensor_id}`,
              to: 'iot_gateway',
              operation: OperationType.DATA,
              messageId: `sensor-reading-${i}`,
              capabilities: {
                'sensor_data': 'true',
                'sensor_id': reading.sensor_id,
                'timestamp': reading.timestamp.toString(),
                'temperature': reading.temperature.toString(),
                'humidity': reading.humidity.toString(),
                'pressure': reading.pressure.toString(),
                'sequence': i.toString()
              }
            });

            await client.send(envelope);

            // Small delay to simulate real sensor timing
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }, 500);

        setTimeout(() => reject(new Error('IoT sensor data streaming timeout')), 10000);
      });
    });

    test('should handle financial transaction processing', async () => {
      return new Promise<void>((resolve, reject) => {
        const transactions = [
          { id: 'tx_001', amount: 100.50, currency: 'USD', type: 'payment' },
          { id: 'tx_002', amount: 250.00, currency: 'EUR', type: 'transfer' },
          { id: 'tx_003', amount: 75.25, currency: 'GBP', type: 'withdrawal' }
        ];

        let transactionsProcessed = 0;

        server.on('message', async (message, info) => {
          const caps = message.getCapabilities();

          if (caps['financial_transaction'] === 'true') {
            transactionsProcessed++;
            expect(caps['transaction_id']).toMatch(/^tx_\d+$/);
            expect(parseFloat(caps['amount'])).toBeGreaterThan(0);
            expect(['USD', 'EUR', 'GBP']).toContain(caps['currency']);

            // Server validates and acknowledges transaction
            const ack = UMICP.createEnvelope({
              from: 'financial_server',
              to: 'financial_client',
              operation: OperationType.ACK,
              messageId: `ack_${caps['transaction_id']}`,
              capabilities: {
                'transaction_ack': 'true',
                'transaction_id': caps['transaction_id'],
                'status': 'approved',
                'processing_fee': '0.50'
              }
            });

            await server.send(ack);
          }
        });

        client.on('message', (message, info) => {
          const caps = message.getCapabilities();

          if (caps['transaction_ack'] === 'true') {
            expect(caps['status']).toBe('approved');
            expect(parseFloat(caps['processing_fee'])).toBeGreaterThan(0);

            if (transactionsProcessed === transactions.length) {
              resolve();
            }
          }
        });

        setTimeout(async () => {
          // Send financial transactions
          for (const tx of transactions) {
            const envelope = UMICP.createEnvelope({
              from: 'financial_client',
              to: 'financial_server',
              operation: OperationType.DATA,
              messageId: `financial-${tx.id}`,
              capabilities: {
                'financial_transaction': 'true',
                'transaction_id': tx.id,
                'amount': tx.amount.toString(),
                'currency': tx.currency,
                'type': tx.type,
                'timestamp': Date.now().toString()
              }
            });

            await client.send(envelope);
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }, 500);

        setTimeout(() => reject(new Error('Financial transaction processing timeout')), 10000);
      });
    });
  });
});
